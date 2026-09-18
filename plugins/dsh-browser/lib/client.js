window.__ModuleLoader__.load({ id: 'dsh-browser', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-browser client half: OUR browser tab. A same-origin sidebar tab with an
// address bar and a sandboxed iframe, driven by the agent's `browser` tool
// (open/navigate/focus/screenshot) and by the human's own address bar. It
// replaces the dsh-better-sidebar builtin browser (hidden from the + menu).
//
// Full scope: when the agent navigates with scope:"full", the desktop's main
// process embeds a real WebContentsView OVER this tab's frame area — the human
// watches the agent click/fill/read a live page, cross-origin included. The
// sandboxed iframe keeps serving the workspace scope exactly as before.

const TAB_ID = 'dsh-browser:view'
const DEFAULT_URL = 'https://example.com'
const MIN_FRAME_PX = 50

// Shared with the command poller: the last URL the agent asked for, and the
// mounted view's setter so a navigate can reach a tab that is already open.
let desiredUrl = null
let setUrlFromAgent = null

// Full-scope state shared between the tab component and the poller.
let opsSource = null
let fullUrl = null
let frameHostEl = null
let resizeObserver = null
let openOurTabRef = null

function api(method, payload) {
  return fetch('/browser/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

/**
 * Hard deadline for one full-scope command. The poller must always answer the
 * host: a wedged renderer or a dead target can never be allowed to leave the
 * poll loop parked in an await (that is what killed the channel before).
 */
function withDeadline(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + ' timeout after ' + ms + 'ms')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

function wa() {
  return window.dshDesktopWebAgent
}

async function getOpsSource() {
  if (opsSource) return opsSource
  const r = await api('ops', {})
  if (!r || !r.ok || !r.source) throw new Error('ops source indisponível (harness velho?)')
  opsSource = r.source
  return opsSource
}

function frameRect() {
  if (!frameHostEl || !frameHostEl.isConnected) return null
  const r = frameHostEl.getBoundingClientRect()
  if (!r || r.width < MIN_FRAME_PX || r.height < MIN_FRAME_PX) return null
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}

async function attachFull(retries = 6) {
  const bridge = wa()
  if (!bridge || !fullUrl) return
  for (let i = 0; ; i++) {
    const rect = frameRect()
    if (rect) {
      const r = await bridge.attach(rect, await getOpsSource())
      if (!r || !r.ok) throw new Error((r && r.error) || 'attach falhou')
      return
    }
    if (i >= retries) throw new Error('aba Browser não está visível (área muito pequena) — abra a aba para o modo full')
    await new Promise((res) => setTimeout(res, 300))
  }
}

function watchFrameResize() {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  if (!frameHostEl || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    if (!fullUrl) return
    const rect = frameRect()
    if (rect) wa()?.bounds(rect)
  })
  resizeObserver.observe(frameHostEl)
}

async function detachFull() {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  fullUrl = null
  try { await wa()?.detach() } catch { /* bridge ausente */ }
}

// Capture the app window through the desktop bridge: no gesture, no picker.
function captureWindow() {
  const bridge = window.dshDesktopScreenCapture
  if (bridge && typeof bridge.capture === 'function') return bridge.capture()
  return Promise.reject(new Error('screenshots require the DSH Desktop app'))
}

/** Add https:// to a bare host; refuse non-http(s) input. */
function normalize(input) {
  const trimmed = String(input ?? '').trim()
  if (trimmed === '') return null
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch { return null }
}

function injectStyles() {
  const id = 'db-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.db-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.db-bar{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.db-input{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit}
.db-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.db-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.db-frame{flex:1;width:100%;border:none;display:block;background:#fff;min-height:0}
.db-full-badge{flex:none;padding:2px 8px;font-size:11px;border-radius:4px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-secondary,#a8a8b4);white-space:nowrap}
.db-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#7c7c88);font-size:12px;padding:20px;text-align:center}
`
  document.head.appendChild(el)
}

function BrowserTab(props) {
  const visible = props?.visible !== false
  const h = React.createElement
  const [url, setUrl] = React.useState(desiredUrl || DEFAULT_URL)
  const [input, setInput] = React.useState(desiredUrl || DEFAULT_URL)
  const [key, setKey] = React.useState(0)
  const [bad, setBad] = React.useState(false)
  const [full, setFull] = React.useState(null)
  const hostRef = React.useRef(null)

  const show = React.useCallback((next) => {
    setUrl(next)
    setInput(next)
    setKey((k) => k + 1)
  }, [])

  React.useEffect(() => {
    setUrlFromAgent = show
    if (desiredUrl && desiredUrl !== url) show(desiredUrl)
    return () => { if (setUrlFromAgent === show) setUrlFromAgent = null }
  }, [show, url])

  // The poller mirrors the full-scope URL here (module state); this effect
  // mounts/dismounts the embedded view whenever it changes.
  React.useEffect(() => {
    setFull(fullUrl)
  }, [key, url])

  React.useEffect(() => {
    if (hostRef.current) frameHostEl = hostRef.current
    watchFrameResize()
    return () => { if (frameHostEl === hostRef.current) frameHostEl = null }
  }, [])

  React.useEffect(() => {
    if (!full) return
    attachFull().catch(() => {})
    watchFrameResize()
    return () => {}
  }, [full, key])

  // Tab not the active one → drop the embedded view (agent full ops then fail
  // with the explicit "tab not visible" contract, same as the prototype tab).
  React.useEffect(() => {
    if (!visible && fullUrl) detachFull()
  }, [visible])

  React.useEffect(() => () => { detachFull() }, [])

  const go = () => {
    const next = normalize(input)
    if (!next) { setBad(true); return }
    setBad(false)
    desiredUrl = next
    if (fullUrl) detachFull()
    show(next)
  }

  return h('div', { className: 'db-root' },
    h('div', { className: 'db-bar' },
      h('input', {
        className: 'db-input', value: input, spellCheck: false, placeholder: 'https://…',
        onChange: (e) => setInput(e.target.value),
        onKeyDown: (e) => { if (e.key === 'Enter') go() },
      }),
      h('button', { className: 'db-btn', onClick: go }, 'Ir'),
      h('button', { className: 'db-btn', onClick: () => { if (fullUrl) detachFull(); setKey((k) => k + 1) }, title: 'Recarregar' }, '⟳'),
      full ? h('span', { className: 'db-full-badge', title: 'página real controlada pelo agente (scope full)' }, 'FULL') : null),
    bad ? h('div', { className: 'db-hint' }, 'Endereço inválido — use http(s).') : null,
    h('div', { ref: hostRef, style: { flex: 1, minHeight: 0, display: 'flex', position: 'relative' } },
      h('iframe', {
        key, className: 'db-frame', src: url, title: 'browser',
        sandbox: 'allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-popups-to-escape-sandbox',
        style: { flex: 1, border: 'none', display: 'block', background: '#fff' },
      })))
}

function Icon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('circle', { cx: 8, cy: 8, r: 6 }),
    React.createElement('path', { d: 'M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12' }),
  )
}

/** One full-scope command: run it on the embedded real page via the desktop bridge. */
async function runFullCommand(cmd) {
  const bridge = wa()
  if (!bridge) throw new Error('full scope requer o app DSH Desktop (bridge ausente)')
  if (cmd.op === 'navigate') {
    const next = normalize(cmd.url)
    if (!next) throw new Error('url inválida: ' + cmd.url)
    if (typeof openOurTabRef === 'function') openOurTabRef()
    const r = await bridge.navigate(next)
    if (!r || !r.ok) throw new Error((r && r.error) || 'navigate falhou')
    fullUrl = next
    desiredUrl = next
    if (setUrlFromAgent) setUrlFromAgent(next)
    await attachFull()
    return { ok: true, data: r.data ?? { url: next } }
  }
  if (!fullUrl) throw new Error('scope "full": nenhuma página carregada — rode navigate com scope:"full" antes')
  if (cmd.op === 'screenshot') {
    const r = await bridge.run({ op: 'screenshot', full: cmd.full === true, settle: cmd.settle !== false, quietMs: cmd.quietMs })
    if (!r || !r.ok) throw new Error((r && r.error) || 'screenshot falhou')
    return { ok: true, dataUrl: (r.data && r.data.dataUrl) || null }
  }
  if (cmd.op === 'console') {
    const r = await bridge.run({ op: 'console' })
    if (!r || !r.ok) throw new Error((r && r.error) || 'console falhou')
    return { ok: true, data: r.data }
  }
  if (cmd.op === 'wait') {
    const r = await bridge.run({ op: 'wait', ms: cmd.ms })
    if (!r || !r.ok) throw new Error((r && r.error) || 'wait falhou')
    return { ok: true, data: r.data }
  }
  if (cmd.op === 'wait_for') {
    const r = await bridge.run({ op: 'wait_for', selector: cmd.selector, text: cmd.text, timeoutMs: cmd.timeoutMs })
    if (!r || !r.ok) throw new Error((r && r.error) || 'wait_for falhou')
    return { ok: true, data: r.data }
  }
  if (cmd.op === 'reconnect') {
    const r = await bridge.run({ op: 'reconnect' })
    if (!r || !r.ok) throw new Error((r && r.error) || 'reconnect falhou')
    fullUrl = (r.data && r.data.url) || fullUrl
    await attachFull()
    return { ok: true, data: r.data }
  }
  if (cmd.op === 'reload') {
    const r = await bridge.run({ op: 'reload' })
    if (!r || !r.ok) throw new Error((r && r.error) || 'reload falhou')
    if (r.data && r.data.url) {
      fullUrl = r.data.url
      desiredUrl = r.data.url
      if (setUrlFromAgent) setUrlFromAgent(r.data.url)
    }
    await attachFull()
    return { ok: true, data: r.data }
  }
  if (
    cmd.op === 'click' || cmd.op === 'fill' || cmd.op === 'read' || cmd.op === 'eval' ||
    cmd.op === 'scroll' || cmd.op === 'wait_stable' || cmd.op === 'upload' ||
    cmd.op === 'motion' || cmd.op === 'audit'
  ) {
    await attachFull()
    const r = await bridge.run({
      op: cmd.op,
      selector: cmd.selector,
      text: cmd.text,
      value: cmd.value,
      code: cmd.code,
      attr: cmd.attr,
      role: cmd.role,
      name: cmd.name,
      to: cmd.to,
      by: cmd.by,
      smooth: cmd.smooth,
      quietMs: cmd.quietMs,
      timeoutMs: cmd.timeoutMs,
      ms: cmd.ms,
      path: cmd.path,
    })
    if (!r || !r.ok) throw new Error((r && r.error) || (cmd.op + ' falhou'))
    return { ok: true, data: r.data }
  }
  throw new Error('op full desconhecida: ' + cmd.op)
}

function apply(ctx) {
  injectStyles()
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return
      if (!(window.__profileTabEnabled || (() => true))(TAB_ID)) return
      const scope = () => {
        const sid = betterSidebar.getSnapshot?.()?.sessionId
        return typeof sid === 'string' && sid ? { sessionId: sid } : undefined
      }
      const openOurTab = () => {
        if (typeof betterSidebar.openTab === 'function') betterSidebar.openTab({ type: TAB_ID }, scope())
      }
      openOurTabRef = openOurTab
      ctx.effect(() => betterSidebar.registerTab({
        id: TAB_ID,
        title: 'Browser',
        order: 51,
        single: true,
        icon: (size) => Icon(size),
        component: (props) => React.createElement(BrowserTab, props),
      }))
      // Poll the agent's commands and drive the tab.
      ctx.effect(() => {
        let alive = true
        let timer = null
        const tick = async () => {
          try {
            const r = await api('pending', {})
            const cmd = r?.cmd
            if (alive && cmd) {
              if (cmd.scope === 'full') {
                try {
                  const out = await withDeadline(runFullCommand(cmd), 40000, 'full command')
                  await api('result', { id: cmd.id, ...out })
                } catch (e) {
                  await api('result', { id: cmd.id, ok: false, error: String((e && e.message) || e) })
                }
              } else if (cmd.op === 'screenshot') {
                openOurTab()
                await new Promise((res) => setTimeout(res, 600))
                try {
                  const dataUrl = await captureWindow()
                  await api('result', { id: cmd.id, ok: true, dataUrl })
                } catch (e) {
                  await api('result', { id: cmd.id, ok: false, error: String((e && e.message) || e) })
                }
              } else if (cmd.op === 'navigate' || cmd.op === 'open') {
                const next = normalize(cmd.url)
                if (next) { desiredUrl = next; if (setUrlFromAgent) setUrlFromAgent(next) }
                openOurTab()
                await api('result', { id: cmd.id, ok: true, url: next ?? null })
              } else {
                openOurTab()
                await api('result', { id: cmd.id, ok: true })
              }
            }
          } catch { /* offline */ }
          if (alive) timer = setTimeout(tick, 700)
        }
        tick()
        return () => { alive = false; if (timer) clearTimeout(timer) }
      }, 'dsh-browser: command poll')
    },
  })
}

  exports.apply = apply
  return module.exports
} })
