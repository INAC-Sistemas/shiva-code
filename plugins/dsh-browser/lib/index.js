// dsh-browser host half: lets the agent drive the better-sidebar browser tab.
// The tab itself is a dsh-better-sidebar builtin — a sandboxed, cross-origin
// iframe — so the agent cannot script the visited page (no DOM, console or
// clicks on external sites). What it can do: open the tab at a URL, screenshot
// the app window that shows it, and open URLs in the system browser. The client
// half owns the tab (betterSidebar.openTab) and the window capture; this host
// half relays one command at a time and stores screenshots under the workspace.

import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { pageOpsExpression } from 'dsh-prototype'

export const inject = ['webServer', 'sessions', 'tools']

const WIN = process.platform === 'win32'

/** Workspace-relative folder the screenshots land in. */
export const SHOTS_FOLDER = '.browser-shots'

let seq = 0
let pending = null
const waiters = new Map()

function log(msg) {
  console.log(`[dsh-browser] ${msg}`)
}

/**
 * The workspace for one request. The session's own cwd is authoritative: the
 * client-supplied `cwd` can be the harness launch root (a desktop-only
 * directory) while the conversation lives in a workspace.
 */
async function workspaceOf(ctx, payload) {
  const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : ''
  if (sessionId) {
    const live = ctx.get('sessions')?.get(sessionId)?.header?.cwd
    if (typeof live === 'string' && live) return live
    const persistence = ctx.get('sessionPersistence')
    if (persistence !== undefined) {
      let stored
      try { stored = (await persistence.inspect(sessionId)).meta.cwd }
      catch { /* unknown session */ }
      if (typeof stored === 'string' && stored) return stored
    }
  }
  const cwd = typeof payload?.cwd === 'string' ? payload.cwd.trim() : ''
  if (cwd) return cwd
  return process.cwd()
}

/** Open a URL in the machine's default browser. */
function openExternal(url) {
  return new Promise((resolveP) => {
    const ok = () => resolveP(true)
    const fail = () => resolveP(false)
    try {
      if (WIN) spawn('rundll32', ['url.dll,FileProtocolHandler', url], { windowsHide: true }).on('error', fail).on('close', ok)
      else if (process.platform === 'darwin') spawn('open', [url]).on('error', fail).on('close', ok)
      else spawn('xdg-open', [url]).on('error', fail).on('close', ok)
    } catch { resolveP(false) }
  })
}

/** Queue one command for the client and await its result (bounded). */
function issue(cmd, ttlMs = 15000) {
  const id = String(++seq)
  pending = { id, ...cmd }
  return new Promise((resolveP) => {
    waiters.set(id, resolveP)
    setTimeout(() => {
      if (waiters.has(id)) {
        waiters.delete(id)
        resolveP({ ok: false, error: 'timeout — a aba Browser não respondeu (ela está aberta?)' })
      }
      if (pending && pending.id === id) pending = null
    }, ttlMs)
  })
}

/** Settle the command the client answered. */
function settle(id, result) {
  const key = String(id)
  const waiter = waiters.get(key)
  if (waiter) { waiters.delete(key); waiter(result) }
  if (pending && pending.id === key) pending = null
}

/** Decode a data URL screenshot into the workspace and return its path. */
async function saveShot(workspace, dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(String(dataUrl ?? ''))
  if (!m) throw new Error('captura inválida')
  const dir = join(workspace, SHOTS_FOLDER)
  await mkdir(dir, { recursive: true })
  const name = `shot-${Date.now()}.png`
  await writeFile(join(dir, name), Buffer.from(m[1], 'base64'))
  return `${SHOTS_FOLDER}/${name}`
}

/** Ops the agent tool exposes. */
const TAB_OPS = ['open', 'navigate', 'focus', 'screenshot', 'open_external']
/** Ops that script a real page — they only run in scope "full". */
const FULL_OPS = ['click', 'fill', 'read', 'eval', 'console', 'wait_for', 'wait', 'reconnect', 'reload', 'scroll', 'wait_stable', 'upload', 'motion', 'audit']
const BROWSER_OPS = [...TAB_OPS, ...FULL_OPS]

/**
 * The permanent gate for full-scope automation: a top-level
 * `browserFullAccess: true` in the harness settings.yaml. Read on every
 * attempt, so flipping the flag takes effect without a restart. No flag, no
 * full scope — the tool refuses with the exact remedy.
 */
async function fullAccessEnabled() {
  const home = process.env.DSH_HOME
  if (!home) return false
  try {
    const text = await readFile(join(home, 'settings.yaml'), 'utf8')
    return /^browserFullAccess\s*:\s*true\s*$/m.test(text)
  } catch {
    return false
  }
}

const FULL_ACCESS_HINT =
  'recusado: automação de página real (scope "full") exige a flag permanente browserFullAccess: true ' +
  'no settings.yaml do harness (DSH_HOME). Sem approval por sessão de propósito: ou a flag está ligada, ou a op não roda.'

/** Build the agent tool that drives the better-sidebar browser tab. */
function createTool(ctx) {
  return defineTool({
    name: 'browser',
    description:
      'Drive the sidebar Browser tab and the system browser. ops: open (open the Browser tab, optionally at url) · ' +
      'navigate (open the Browser tab at url) · focus (bring an open Browser tab to the front) · screenshot (capture the app ' +
      'window showing the Browser tab; saved under the workspace and returned as a path) · open_external (open url in the ' +
      'machine\'s default browser, e.g. an OAuth or dashboard link) · plus FULL-SCOPE page automation: click, fill, read, ' +
      'eval, console, wait_for, wait, reconnect, reload, scroll, wait_stable, upload — these require scope:"full" and the ' +
      'permanent browserFullAccess: true flag in the harness settings.yaml; with it you drive ANY real URL like a user ' +
      '(logins included: read credentials from a project file or env var, never from chat). fill never echoes the value. ' +
      'Prefer click/fill by role+name (accessibility) over text: text matching can hit a container. Never reload through ' +
      'eval — use op "reload". Use wait_stable (or screenshot settle, default on) before a print so a page that mounts ' +
      'content after load does not photograph empty. scroll reports where it landed and whether the container was the page ' +
      'or an inner div (mobile). upload attaches a local file to a file input. In scope "full" the page renders live inside ' +
      'the Browser tab and screenshots capture the page itself (full:true captures beyond the viewport). The target ' +
      'self-heals: a navigation or a page-initiated reload that orphans the target is detected, re-resolved and retried ' +
      'once; op "reconnect" forces that re-resolution by hand. The workspace prototype sandbox (default scope) is ' +
      'unchanged: for prototype pages use prototype_automation.',
    parameters: {
      op: { type: 'string', required: true, enum: BROWSER_OPS, description: 'Operation to run.' },
      url: { type: 'string', description: 'Target URL (open/navigate/open_external).' },
      scope: { type: 'string', enum: ['workspace', 'full'], description: 'workspace (default) = tab sandbox as today; full = drive any real URL (needs browserFullAccess: true in settings.yaml).' },
      selector: { type: 'string', description: 'CSS selector (click/fill/read/wait_for/scroll/upload).' },
      text: { type: 'string', description: 'Visible text to match instead of a selector (click/wait_for).' },
      role: { type: 'string', description: 'ARIA role for an accessible lookup (click/fill), e.g. "button", "link", "textbox".' },
      name: { type: 'string', description: 'Accessible name to match with role (click/fill) — the robust way to hit a control.' },
      value: { type: 'string', description: 'Value to set (fill). Never echoed back.' },
      code: { type: 'string', description: 'Expression to evaluate in the page (eval).' },
      attr: { type: 'string', description: 'Attribute to read instead of value/text (read).' },
      to: { type: 'string', description: 'scroll target: "top", "bottom" or a pixel offset.' },
      by: { type: 'number', description: 'scroll step in pixels (relative).' },
      smooth: { type: 'boolean', description: 'scroll smoothly (scroll).' },
      quietMs: { type: 'number', description: 'wait_stable/screenshot: quiet window in ms (default 500/400).' },
      path: { type: 'string', description: 'Local file path to attach to a file input (upload).' },
      full: { type: 'boolean', description: 'screenshot: capture the whole page, not just the viewport.' },
      settle: { type: 'boolean', description: 'screenshot: wait for the page to stop changing first (default true).' },
      timeoutMs: { type: 'number', description: 'Deadline for wait_for/wait_stable in ms (default 8000/10000, cap 30000).' },
      ms: { type: 'number', description: 'wait: sleep in ms (cap 30000) · motion: sampling window in ms (default 800, cap 5000).' },
      label: { type: 'string', description: 'Screenshot label, used in the saved file name for citable evidence.' },
    },
    output: {
      schema: { type: 'json' },
      render: (args, value) => [{ type: 'text', text: `browser ${args.op}: ${JSON.stringify(value)}` }],
    },
    async execute(args, exec) {
      const workspace = await workspaceOf(ctx, {
        cwd: exec?.agent?.session?.header?.cwd,
        sessionId: exec?.agent?.session?.header?.id,
      })
      const op = String(args.op)
      const scope = args.scope === 'full' ? 'full' : 'workspace'
      if (op === 'open_external') {
        const url = String(args.url ?? '')
        if (!url) throw new Error('url obrigatória')
        await openExternal(url)
        return { ok: true, url }
      }
      if (FULL_OPS.includes(op) && scope !== 'full') {
        throw new Error(`op "${op}" scripts a real page — pass scope:"full". ${FULL_ACCESS_HINT}`)
      }
      if (scope === 'full' && !(await fullAccessEnabled())) {
        throw new Error(FULL_ACCESS_HINT)
      }
      if (op === 'screenshot') {
        const r = await issue({ op: 'screenshot', scope })
        if (!r.ok) return r
        if (scope === 'full' && r.dataUrl) {
          // Full scope captures the page itself; same workspace folder.
          const file = await saveShot(workspace, r.dataUrl)
          return { ok: true, file, scope }
        }
        const file = await saveShot(workspace, r.dataUrl)
        return { ok: true, file }
      }
      const forward = { op }
      if (typeof args.url === 'string') forward.url = args.url
      if (scope === 'full') {
        forward.scope = 'full'
        for (const key of ['selector', 'text', 'value', 'code', 'attr', 'timeoutMs', 'ms', 'role', 'name', 'to', 'by', 'smooth', 'quietMs', 'path', 'full', 'settle', 'label']) {
          if (args[key] !== undefined) forward[key] = args[key]
        }
      }
      return await issue(forward, scope === 'full' ? 30000 : 15000)
    },
    presentCall: (args) => ({
      card: 'generic',
      title: `Browser: ${args.op}`,
      kind: 'other',
      rawInput: args.op === 'fill' ? { ...args, value: `***(${String(args.value ?? '').length} chars)` } : args,
    }),
  })
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req, limitBytes = 8 * 1024 * 1024) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > limitBytes) { rejectP(new Error('payload too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { rejectP(new Error('invalid JSON body')) } })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer unavailable — plugin inactive')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/browser/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'pending': {
          // Deliver once: the client answers with `result`.
          const cmd = pending
          pending = null
          return json(res, 200, { ok: true, cmd })
        }
        case 'result':
          settle(payload.id, {
            ok: payload.ok !== false,
            dataUrl: payload.dataUrl ?? null,
            data: payload.data ?? null,
            error: payload.error ?? null,
          })
          return json(res, 200, { ok: true })
        case 'status':
          return json(res, 200, { ok: true, shots: SHOTS_FOLDER })
        case 'ops':
          // The shared page-ops source (extracted from the prototype shim) for
          // the desktop's full-scope driver. Fetched once per client load.
          return json(res, 200, { ok: true, source: pageOpsExpression() })
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/browser/api', handler }), 'dsh-browser: api')

  const tools = ctx.get('tools')
  if (tools && typeof tools.register === 'function') {
    const tool = createTool(ctx)
    ctx.effect(() => tools.register(tool), `dsh-browser: tool ${tool.name}`)
    log(`agent tool: ${tool.name}`)
  }
  log('loaded')
}
