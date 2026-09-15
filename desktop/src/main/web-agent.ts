import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { app, BrowserWindow, WebContentsView, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'

/**
 * Full-scope browser automation for the agent. One dedicated WebContentsView
 * is embedded INSIDE the main window, over the Browser tab's content area, so
 * the human watches the agent drive a real page (click, fill, read, eval,
 * console, wait) — cross-origin included, because the executor is the main
 * process. The sandboxed iframe of the workspace prototype stays untouched;
 * this view only mounts while a full-scope navigation is active.
 *
 * The view owns an isolated in-memory session (partition), so cookies from
 * automation logins never mix with the app's own session and die with the app.
 * Fill values are never logged here: results carry only shape, never content.
 */

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface RunPayload {
  op: string
  selector?: string
  text?: string
  value?: string
  code?: string
  attr?: string
  timeoutMs?: number
  ms?: number
  /** Accessible lookup (click/fill): ARIA role + accessible name. */
  role?: string
  name?: string
  /** scroll: target ('top' | 'bottom' | number px), step, smooth. */
  to?: string | number
  by?: number
  smooth?: boolean
  /** wait_stable: quiet window and cap. */
  quietMs?: number
  /** upload: local file path. */
  path?: string
  /** screenshot: full-page capture and pre-capture settle. */
  full?: boolean
  settle?: boolean
}

type RunResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; orphan?: boolean; destroyed?: boolean }

const CONSOLE_RING_MAX = 200
const VIEW_PARTITION = 'dsh-web-agent'
const FIND_INTERVAL_MS = 150
const DEFAULT_WAIT_MS = 8000
const MAX_WAIT_MS = 30000
/** Hard ceiling for one page-script op; a destroyed execution context must never hang the IPC. */
const OP_TIMEOUT_MS = 15000
/** Hard ceiling for one navigation. */
const NAV_TIMEOUT_MS = 25000
/** Bounded wait for the current document to settle after a navigation. */
const LOAD_SETTLE_MS = 10000

/**
 * Neutralizes every page-initiated modal in the agent-driven view. In agent
 * mode a native dialog is the worst failure: the op neither resolves nor
 * rejects, it just parks until a human types something. Installed into the
 * page's own world after each document load, so `alert`/`confirm`/`prompt` and
 * `beforeunload` can never block the tool.
 */
const DIALOG_GUARD = `(function () {
  if (window.__dshAgentDialogGuard) return true;
  window.__dshAgentDialogGuard = true;
  try { window.alert = function () { return undefined; }; } catch (e) {}
  try { window.confirm = function () { return false; }; } catch (e) {}
  try { window.prompt = function () { return null; }; } catch (e) {}
  try {
    window.addEventListener('beforeunload', function (e) { try { delete e.returnValue; } catch (_) {} }, true);
  } catch (e) {}
  return true;
})()`

let dialogGuardLogged = false

async function installDialogGuard(wc: WebContents): Promise<void> {
  if (wc.isDestroyed()) return
  try {
    await wc.executeJavaScript(DIALOG_GUARD, true)
    if (!dialogGuardLogged) {
      dialogGuardLogged = true
      log('dialog guard installed (alert/confirm/prompt/beforeunload neutralized in agent mode)')
    }
  } catch {
    // a document mid-teardown can refuse the script; the next dom-ready retries
  }
}

let view: WebContentsView | null = null
let hostWindow: BrowserWindow | null = null
let consoleRing: Array<{ level: string; text: string; time: string }> = []
let pageOpsSource: string | null = null
/** Last URL navigated to, for recovery after the target dies. */
let lastUrl: string | null = null

function log(msg: string): void {
  console.log(`[web-agent] ${msg}`)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nowIso(): string {
  return new Date().toISOString()
}

function pushConsole(level: unknown, text: string): void {
  const name = typeof level === 'string' ? level : typeof level === 'number' ? (level >= 3 ? 'error' : level === 2 ? 'warn' : 'log') : 'log'
  consoleRing.push({ level: name, text, time: nowIso() })
  while (consoleRing.length > CONSOLE_RING_MAX) consoleRing.shift()
}

/** The page-ops runner: evaluates the shared ops expression, then one op. */
function runnerCode(a: RunPayload): string {
  const payload = JSON.stringify({ op: a.op, selector: a.selector, text: a.text, value: a.value, code: a.code, attr: a.attr, role: a.role, name: a.name })
  return `(function(){
    var a = ${payload};
    var shared = ${pageOpsSource ?? 'null'};
    var op = shared && shared.ops ? shared.ops[a.op] : null;
    if (typeof op !== 'function') return { ok: false, error: 'op ' + a.op + ' não suportada pelo ops source' };
    return Promise.resolve().then(function () { return op(a); })
      .then(function (r) { return { ok: true, data: r }; },
            function (e) { return { ok: false, error: String((e && e.message) || e) }; });
  })()`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveP) => setTimeout(resolveP, ms))
}

/** Bound any promise so a wedged renderer can never hang the IPC handler. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

/**
 * Bounded wait for the current document to stop loading. A navigation that
 * destroys the old document settles here instead of leaving the next script
 * pending forever.
 */
function ensureSettled(wc: WebContents): Promise<void> {
  if (wc.isDestroyed()) return Promise.reject(new Error('view destroyed'))
  if (!wc.isLoading()) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      wc.removeListener('did-stop-loading', done)
      wc.removeListener('did-fail-load', done)
      resolve()
    }
    const timer = setTimeout(done, LOAD_SETTLE_MS)
    wc.once('did-stop-loading', done)
    wc.once('did-fail-load', done)
  })
}

/**
 * One page-script op, always bounded. An orphan target (the document was
 * destroyed under a pending script) is flagged so the caller can re-resolve
 * and retry once instead of failing the channel.
 */
async function evalInPage(wc: WebContents, code: string, label: string): Promise<RunResult> {
  try {
    return (await withTimeout(wc.executeJavaScript(code, true), OP_TIMEOUT_MS, label)) as RunResult
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    if (/timeout after/.test(msg)) {
      log(`orphan target: ${label} — ${msg}`)
      return { ok: false, error: `page did not answer (orphan target — document destroyed?): ${msg}`, orphan: true }
    }
    if (/destroyed|Render frame was disposed|WebContents was destroyed/i.test(msg)) {
      log(`destroyed target: ${label} — ${msg}`)
      return { ok: false, error: `tab was closed or destroyed during the operation: ${msg}`, destroyed: true }
    }
    return { ok: false, error: `page execution failed: ${msg}` }
  }
}

/**
 * Re-resolve the target after a dead/orphan view: drop the WebContentsView,
 * build a fresh one on the same window and reload the last URL. This is the
 * automatic recovery — the agent never restarts the app to get the tab back.
 */
async function recoverView(): Promise<{ ok: boolean; error?: string }> {
  const win = hostWindow
  const url = view && !view.webContents.isDestroyed() ? view.webContents.getURL() || lastUrl : lastUrl
  log(`recover: re-resolving target (url=${url ?? 'none'})`)
  dropView()
  if (!win || win.isDestroyed()) return { ok: false, error: 'main window gone' }
  ensureView(win)
  if (url && view) {
    try {
      await withTimeout(view.webContents.loadURL(url), NAV_TIMEOUT_MS, 'recover navigate')
      await ensureSettled(view.webContents)
    } catch (e) {
      log(`recover navigate failed: ${String((e as Error)?.message ?? e)}`)
    }
  }
  return { ok: true }
}

function ensureView(owner: BrowserWindow): WebContentsView {
  if (view) {
    const stale = view.webContents.isDestroyed() || !hostWindow || hostWindow.isDestroyed() || hostWindow !== owner
    if (stale) dropView()
  }
  if (view) return view
  consoleRing = []
  const created = new WebContentsView({
    webPreferences: {
      partition: VIEW_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })
  created.setBackgroundColor('#ffffff')
  const ses = created.webContents.session
  // Real sites probe the UA; strip the Electron marker so automation reads as a
  // plain Chromium browser.
  ses.setUserAgent(ses.getUserAgent().replace(/\sElectron\/[\d.]+/i, ''))
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  // Never let a page-initiated unload prompt (beforeunload) block navigation.
  created.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault()
    log('beforeunload dialog suppressed — unload allowed')
  })
  // Re-arm the dialog guard on every document load.
  created.webContents.on('dom-ready', () => {
    void installDialogGuard(created.webContents)
  })
  created.webContents.on('console-message', (...args: unknown[]) => {
    const evt = args[0] as { level?: unknown; message?: unknown } | undefined
    if (evt && typeof evt === 'object' && 'message' in evt) {
      pushConsole(evt.level, String(evt.message ?? ''))
      return
    }
    const [, level, message] = args as [unknown, unknown, unknown]
    pushConsole(level, String(message ?? ''))
  })
  created.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    if (isMain && code !== -3) pushConsole('error', `did-fail-load ${code} ${desc} ${url}`)
  })
  view = created
  hostWindow = owner
  owner.contentView.addChildView(created)
  log('view created (partition ' + VIEW_PARTITION + ')')
  return created
}

function dropView(): void {
  if (!view) return
  try {
    const wc = view.webContents
    if (!wc.isDestroyed()) {
      wc.removeAllListeners('console-message')
      wc.removeAllListeners('did-fail-load')
    }
    if (hostWindow && !hostWindow.isDestroyed()) hostWindow.contentView.removeChildView(view)
  } catch {
    // the window or view may already be gone during teardown
  }
  view = null
  hostWindow = null
  log('view dropped')
}

async function navigate(url: string): Promise<RunResult> {
  if (!view) return { ok: false, error: 'tab not mounted — open the Browser tab with scope "full" first' }
  const wc = view.webContents
  lastUrl = url
  log(`navigate -> ${url}`)
  try {
    await withTimeout(wc.loadURL(url), NAV_TIMEOUT_MS, 'navigate')
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    if (!/ERR_ABORTED/.test(msg)) {
      log(`navigate failed: ${msg}`)
      return { ok: false, error: `navigate failed: ${msg}` }
    }
    log('navigate aborted by a redirect — waiting for the final document')
  }
  await ensureSettled(wc)
  return { ok: true, data: { url: wc.getURL(), title: wc.getTitle() } }
}

/** One attempt of an op against the current target (no recovery here). */
async function runOpOnce(a: RunPayload): Promise<RunResult> {
  const wc = view?.webContents
  if (!view || !wc) return { ok: false, error: 'tab not mounted' }
  // The guard is idempotent: re-arming before each op closes the window where a
  // document swapped in without a dom-ready (SPA route change, fragment swap).
  void installDialogGuard(wc)
  // Track the live URL so recovery reloads where the page actually is now.
  const currentUrl = wc.isDestroyed() ? '' : wc.getURL()
  if (currentUrl) lastUrl = currentUrl
  switch (a.op) {
    case 'click':
    case 'fill':
    case 'read':
    case 'eval': {
      const r = await evalInPage(wc, runnerCode(a), a.op)
      if (r.ok && a.op === 'fill') {
        // The value never leaves this process: the result names the field, not the content.
        const data = r.data as { filled?: boolean; value?: unknown }
        const filled = data?.filled === true
        return { ok: true, data: { filled, length: typeof a.value === 'string' ? a.value.length : 0 } }
      }
      return r
    }
    case 'wait_for': {
      const deadline = Date.now() + Math.min(Number(a.timeoutMs) || DEFAULT_WAIT_MS, MAX_WAIT_MS)
      const find =
        a.selector !== undefined
          ? `!!document.querySelector(${JSON.stringify(a.selector)})`
          : `(${pageOpsSource ?? ''})().findByText(${JSON.stringify(a.text ?? '')}) !== null`
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const r = await evalInPage(wc, `Promise.resolve().then(function(){ return (${find}); }).catch(function(){ return false; })`, 'wait_for')
        if (r.ok === false) return r
        if (r.data === true) return { ok: true, data: { found: true } }
        if (Date.now() > deadline) {
          return { ok: false, error: `wait_for timeout: ${a.selector ?? a.text}` }
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(FIND_INTERVAL_MS)
      }
    }
    case 'wait': {
      const ms = Math.min(Number(a.ms) || 1000, MAX_WAIT_MS)
      await sleep(ms)
      return { ok: true, data: { waited: ms } }
    }
    case 'reload': {
      log('reload')
      wc.reload()
      await waitForNavigation(wc, NAV_TIMEOUT_MS)
      await ensureSettled(wc)
      return { ok: true, data: { url: wc.getURL(), title: wc.getTitle() } }
    }
    case 'scroll':
      return await evalInPage(wc, scrollScript(a), 'scroll')
    case 'wait_stable': {
      const quiet = Math.min(Number(a.quietMs) || 500, 5000)
      const cap = Math.min(Number(a.timeoutMs) || 10000, MAX_WAIT_MS)
      return await evalInPage(wc, stableScript(quiet, cap), 'wait_stable')
    }
    case 'upload': {
      const file = str(a.path)
      if (!file) return { ok: false, error: 'upload requires a local file path' }
      let bytes: Buffer
      try {
        bytes = readFileSync(file)
      } catch (e) {
        return { ok: false, error: `upload file not readable: ${String((e as Error)?.message ?? e)}` }
      }
      const mime = MIME_BY_EXT[extname(file).toLowerCase()] ?? 'application/octet-stream'
      return await evalInPage(wc, uploadScript(a.selector, basename(file), mime, bytes.toString('base64')), 'upload')
    }
    case 'console':
      return { ok: true, data: { entries: consoleRing.slice(-CONSOLE_RING_MAX) } }
    case 'screenshot': {
      // Settle first: a page that mounts content after load renders an empty print.
      if (a.settle !== false) {
        await evalInPage(wc, stableScript(Math.min(Number(a.quietMs) || 400, 3000), 6000), 'settle')
      }
      if (a.full === true) {
        const full = await captureFullPage(wc)
        if (full) return { ok: true, data: { dataUrl: full, full: true } }
      }
      try {
        const image = await withTimeout(wc.capturePage(), OP_TIMEOUT_MS, 'screenshot')
        return { ok: true, data: { dataUrl: image.toDataURL(), full: false } }
      } catch (e) {
        const msg = String((e as Error)?.message ?? e)
        if (/timeout after/.test(msg)) {
          return { ok: false, error: `screenshot did not answer (orphan target): ${msg}`, orphan: true }
        }
        return { ok: false, error: `screenshot failed: ${msg}` }
      }
    }
    case 'reconnect': {
      const r = await recoverView()
      return r.ok ? { ok: true, data: { reconnected: true, url: lastUrl } } : { ok: false, error: r.error ?? 'reconnect failed' }
    }
    default:
      return { ok: false, error: `unknown web-agent op "${a.op}"` }
  }
}

/**
 * Run one op with automatic recovery: settle the document first, and when the
 * target turns out orphan/dead, re-resolve it once and retry before failing.
 */
async function runOp(a: RunPayload): Promise<RunResult> {
  if (!view) return { ok: false, error: 'tab not mounted — open the Browser tab with scope "full" first' }
  try {
    await ensureSettled(view.webContents)
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e), destroyed: true }
  }
  const first = await runOpOnce(a)
  if (first.ok === false && (first.orphan === true || first.destroyed === true)) {
    const recovered = await recoverView()
    if (!recovered.ok) return first
    const retry = await runOpOnce(a)
    return retry
  }
  return first
}

/** Bounded wait for a navigation the view already started (reload, redirect). */
function waitForNavigation(wc: WebContents, timeoutMs: number): Promise<void> {
  if (wc.isDestroyed()) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      wc.removeListener('did-stop-loading', done)
      wc.removeListener('did-fail-load', done)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    wc.once('did-stop-loading', done)
    wc.once('did-fail-load', done)
  })
}

/** Page-side: report where a scroll landed, and whether the target is visible. */
function scrollScript(a: RunPayload): string {
  const cfg = JSON.stringify({ selector: a.selector, to: a.to, by: a.by, smooth: a.smooth === true })
  return `(function(){
    var a = ${cfg};
    function containerOf(el) {
      var n = el;
      while (n && n !== document.body) {
        var st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 4) return n;
        n = n.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    }
    var box = a.selector ? document.querySelector(a.selector) : null;
    var container = box ? containerOf(box) : (document.scrollingElement || document.documentElement);
    var before = container.scrollTop;
    if (box) box.scrollIntoView({ block: 'center', behavior: a.smooth ? 'smooth' : 'auto' });
    else if (a.to === 'bottom') container.scrollTop = container.scrollHeight;
    else if (a.to === 'top') container.scrollTop = 0;
    else if (typeof a.to === 'number') container.scrollTop = a.to;
    else if (typeof a.by === 'number') container.scrollTop = container.scrollTop + a.by;
    return new Promise(function (resolve) {
      setTimeout(function () {
        var max = Math.max(container.scrollHeight - container.clientHeight, 0);
        var isPage = container === document.scrollingElement || container === document.documentElement;
        resolve({
          scrollY: Math.round(window.scrollY),
          scrollX: Math.round(window.scrollX),
          containerScrollTop: Math.round(container.scrollTop),
          atBottom: container.scrollTop >= max - 2,
          container: isPage ? 'page' : (container.tagName.toLowerCase() + (container.id ? '#' + container.id : '')),
          before: Math.round(before),
          targetVisible: box ? (box.getBoundingClientRect().top >= 0 && box.getBoundingClientRect().bottom <= (window.innerHeight || 0)) : null
        });
      }, a.smooth ? 500 : 60);
    });
  })()`
}

/** Page-side: resolve once DOM/animations stay quiet for `quiet` ms (or the cap hits). */
function stableScript(quietMs: number, capMs: number): string {
  return `(function(){
    var quiet = ${quietMs}, cap = ${capMs};
    return new Promise(function (resolve) {
      var last = Date.now(), started = Date.now(), raf = 0;
      var obs = new MutationObserver(function () { last = Date.now(); });
      try { obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
      var tick = function () { last = Date.now(); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      (function check() {
        var idle = Date.now() - last;
        var busy = document.readyState !== 'complete';
        if ((idle >= quiet && !busy) || Date.now() - started >= cap) {
          try { obs.disconnect(); } catch (e) {}
          try { cancelAnimationFrame(raf); } catch (e) {}
          resolve({ stable: idle >= quiet && !busy, quietMs: idle, elapsedMs: Date.now() - started });
          return;
        }
        setTimeout(check, 100);
      })();
    });
  })()`
}

/** Page-side: attach a real File to a file input (synthesized from local bytes). */
function uploadScript(selector: string | undefined, name: string, mime: string, base64: string): string {
  return `(function(){
    var sel = ${JSON.stringify(selector ?? '')}, name = ${JSON.stringify(name)}, mime = ${JSON.stringify(mime)}, b64 = ${JSON.stringify(base64)};
    var input = sel ? document.querySelector(sel) : document.querySelector('input[type=file]');
    if (!input) throw new Error('file input not found: ' + (sel || 'input[type=file]'));
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var file = new File([bytes], name, { type: mime });
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { uploaded: true, name: name, bytes: bytes.length, input: sel || 'input[type=file]' };
  })()`
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.json': 'application/json',
  '.csv': 'text/csv', '.mp4': 'video/mp4', '.zip': 'application/zip',
}

/** Full-page capture through CDP (bounded, always detaches). */
async function captureFullPage(wc: WebContents): Promise<string | null> {
  const dbg = wc.debugger
  try {
    if (!dbg.isAttached()) dbg.attach('1.3')
    try {
      await dbg.sendCommand('Page.enable')
      const res = (await dbg.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })) as { data?: string }
      return res?.data ? `data:image/png;base64,${res.data}` : null
    } finally {
      try { dbg.detach() } catch { /* already gone */ }
    }
  } catch (e) {
    log(`full-page capture unavailable (${String((e as Error)?.message ?? e)}) — falling back to the viewport`)
    return null
  }
}

/** Sender must be the app's own main window renderer. */
function trusted(event: IpcMainInvokeEvent, owner: () => BrowserWindow | null | undefined): boolean {
  const win = owner()
  return !!win && !win.isDestroyed() && event.sender === win.webContents
}

export function registerWebAgent(owner: () => BrowserWindow | null | undefined): void {
  // A 401 with a Basic challenge makes Chromium open a native credential
  // dialog that parks the pending op forever. In agent mode we cancel instead:
  // the request fails with its real 401 and the op resolves with a clear error.
  app.on('login', (event, webContents, _details, authInfo, callback) => {
    if (!view || webContents !== view.webContents) return
    event.preventDefault()
    log(`http auth dialog suppressed (${authInfo?.host ?? 'unknown'}) — request cancelled with no credentials`)
    callback('', '')
  })
  ipcMain.removeHandler('web-agent:attach')
  ipcMain.handle('web-agent:attach', (event, rect: Rect, opsSource: unknown) => {
    if (!trusted(event, owner)) return { ok: false, error: 'untrusted sender' }
    if (typeof opsSource !== 'string' || opsSource.length === 0) return { ok: false, error: 'ops source required' }
    pageOpsSource = opsSource
    const win = owner()
    if (!win) return { ok: false, error: 'main window gone' }
    const v = ensureView(win)
    if (
      rect &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 0 &&
      rect.height > 0
    ) {
      v.setBounds(rect)
    }
    v.setVisible(true)
    return { ok: true }
  })
  ipcMain.removeHandler('web-agent:bounds')
  ipcMain.handle('web-agent:bounds', (event, rect: Rect) => {
    if (!trusted(event, owner)) return { ok: false }
    if (view && rect && rect.width > 0 && rect.height > 0) view.setBounds(rect)
    return { ok: true }
  })
  ipcMain.removeHandler('web-agent:detach')
  ipcMain.handle('web-agent:detach', (event) => {
    if (!trusted(event, owner)) return { ok: false }
    dropView()
    return { ok: true }
  })
  ipcMain.removeHandler('web-agent:navigate')
  ipcMain.handle('web-agent:navigate', async (event, url: unknown) => {
    if (!trusted(event, owner)) return { ok: false, error: 'untrusted sender' }
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return { ok: false, error: 'http(s) url required' }
    const win = owner()
    if (!win) return { ok: false, error: 'main window gone' }
    ensureView(win)
    return navigate(url)
  })
  ipcMain.removeHandler('web-agent:run')
  ipcMain.handle('web-agent:run', async (event, payload: RunPayload) => {
    if (!trusted(event, owner)) return { ok: false, error: 'untrusted sender' }
    if (!payload || typeof payload.op !== 'string') return { ok: false, error: 'op required' }
    try {
      return await runOp(payload)
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e) }
    }
  })
  log('registered')
}
