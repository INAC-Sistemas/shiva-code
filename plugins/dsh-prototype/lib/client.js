window.__ModuleLoader__.load({ id: 'dsh-prototype', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-prototype client half: renders the workspace prototype/ folder in a
// same-origin iframe (served by the plugin's /prototype/file/ route), and
// bridges agent automation commands to the live page: navigate is resolved
// parent-side, click/fill/read/eval/wait_for go through the injected shim,
// screenshots come from a user-granted getDisplayMedia stream, and console
// error/warn from the prototype is streamed to the drawer and the host.

const TAB_ID = 'dsh-prototype:view'
const FILE_BASE = '/prototype/file/'

// The active session's scope, set by the view on every render from
// better-sidebar's TabComponentProps ({sessionId, cwd}) so every API call and
// the served folder resolve to the workspace the user is actually looking at.
let SCOPE = null

function api(method, payload) {
  return fetch('/prototype/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'proto-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.pt-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.pt-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center}
.pt-empty h3{margin:0;font-size:15px}
.pt-empty p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:360px}
.pt-empty code{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--dsw-alias-bg-layer-2,#26272e);padding:1px 5px;border-radius:4px}
.pt-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.pt-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.pt-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#000);font-weight:600}
.pt-btn.on{border-color:var(--dsw-alias-brand-primary,#F0B90B);color:var(--dsw-alias-brand-text,#e8e8ea)}
.pt-btn:disabled{opacity:.45;cursor:default}
.pt-bar{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.pt-url{flex:1;min-width:100px;background:var(--dsw-alias-bg-layer-1,#26272e);color:var(--dsw-alias-label-secondary,#b6b6bf);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:11.5px;font-family:ui-monospace,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-view{flex:1;position:relative;min-height:0;background:#fff}
.pt-view iframe{width:100%;height:100%;border:none;display:block;background:#fff}
.pt-console{flex:none;border-top:1px solid var(--dsw-alias-border-l1,#3a3b44);display:flex;flex-direction:column;max-height:180px}
.pt-console-head{display:flex;align-items:center;gap:8px;padding:4px 10px;cursor:pointer;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9aa5);user-select:none}
.pt-console-body{overflow-y:auto;padding:2px 10px 8px;min-height:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5}
.pt-console-body .e{white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary,#e8e8ea)}
.pt-console-body .w{color:#fbbf24}
.pt-console-body .i{color:var(--dsw-alias-label-tertiary,#7c7c88);margin-right:6px}
.pt-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#7c7c88);font-size:12px;padding:20px;text-align:center;line-height:1.7}
.pt-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.pt-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function ProtoIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: '1.5', y: '2.5', width: '13', height: '11', rx: '1.5' }),
    React.createElement('path', { d: 'M1.5 5.5h13' }),
    React.createElement('circle', { cx: '3.6', cy: '4', r: '.4' }),
    React.createElement('path', { d: 'M5 8.5l2 1.7-2 1.7M8.6 11.9h2.6' }),
  )
}

function PrototypeView(props) {
  const h = React.createElement
  SCOPE = props?.scope ? { sessionId: props.scope.sessionId, cwd: props.scope.cwd } : null
  // Identity of the workspace being shown: everything below is reloaded when it
  // changes, so switching session never leaves another workspace's files on screen.
  const scopeKey = (props?.scope?.cwd ?? '') + '\u0000' + (props?.scope?.sessionId ?? '')
  const [status, setStatus] = React.useState(null)
  const [entries, setEntries] = React.useState(null)
  const [currentPath, setCurrentPath] = React.useState(null)
  const [consoleOpen, setConsoleOpen] = React.useState(false)
  const [consoleEntries, setConsoleEntries] = React.useState([])
  const [captureOn, setCaptureOn] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)
  const iframeRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const videoRef = React.useRef(null)
  const inflightRef = React.useRef(null) // { id, timer }

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5200 : 2200)
  }, [])

  const loadStatus = React.useCallback(() => {
    api('status').then((r) => { if (r.ok) setStatus(r) }).catch(() => {})
  }, [])

  const loadList = React.useCallback(() => {
    api('list').then((r) => {
      if (!r.ok) return
      if (r.exists === false) {
        setEntries([])
        setStatus((prev) => ({ workspace: prev?.workspace ?? '', root: prev?.root ?? '', folder: 'prototype', exists: false }))
        return
      }
      setEntries(r.entries)
    }).catch(() => {})
  }, [])

  React.useEffect(() => {
    setStatus(null)
    setEntries(null)
    setCurrentPath(null)
    loadStatus()
    loadList()
  }, [scopeKey, loadStatus, loadList])

  const htmlFiles = React.useMemo(
    () => (entries ?? []).filter((e) => e.type === 'file' && e.html).map((e) => e.path),
    [entries])

  // Pick a start page once the file list arrives.
  React.useEffect(() => {
    if (currentPath || !htmlFiles.length) return
    const preferred = htmlFiles.find((p) => p === 'index.html') ?? htmlFiles[0]
    setCurrentPath(preferred)
  }, [htmlFiles, currentPath])

  const createRoot = async () => {
    setBusy(true)
    const r = await api('create_folder_root')
    setBusy(false)
    if (!r.ok) return say(r.error || 'failed', true)
    say(`Created ${r.root}`)
    loadStatus(); loadList()
  }

  const navigateTo = (path) => {
    setCurrentPath(path)
  }

  // ── console relay ──
  const pushConsole = React.useCallback((entry) => {
    setConsoleEntries((prev) => {
      const next = [...prev, entry]
      return next.length > 200 ? next.slice(-200) : next
    })
    api('automation/console_push', { entries: [entry] }).catch(() => {})
  }, [])

  // ── iframe messages (shim results + console) ──
  React.useEffect(() => {
    const onMessage = (e) => {
      const data = e.data
      if (!data || typeof data !== 'object') return
      if (data.source === 'dsh-prototype-shim') {
        if (data.console) { pushConsole(data.console); return }
        const id = data.id
        if (!id) return
        const inflight = inflightRef.current
        if (inflight && inflight.id === id) {
          clearTimeout(inflight.timer)
          inflightRef.current = null
          api('automation/result', { id, ok: !!data.ok, data: data.result ?? null, error: data.error ?? null }).catch(() => {})
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [pushConsole])

  // ── screen capture (user grants once, stream stays alive) ──
  const ensureCapture = async () => {
    if (streamRef.current) return true
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 } })
      streamRef.current = stream
      setCaptureOn(true)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        streamRef.current = null
        setCaptureOn(false)
        say('Screen sharing ended', true)
      })
      return true
    } catch (e) {
      say('Screen capture not granted: ' + String(e?.message ?? e), true)
      return false
    }
  }

  const captureFrame = () => new Promise((resolveP, rejectP) => {
    const stream = streamRef.current
    if (!stream) return rejectP(new Error('screen capture not enabled'))
    let video = videoRef.current
    if (!video) {
      video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px'
      document.body.append(video)
      videoRef.current = video
    }
    if (video.srcObject !== stream) video.srcObject = stream
    const grab = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        if (!canvas.width || !canvas.height) return rejectP(new Error('no video frame yet'))
        canvas.getContext('2d').drawImage(video, 0, 0)
        resolveP(canvas.toDataURL('image/png'))
      } catch (err) { rejectP(err) }
    }
    if (video.readyState >= 2) requestAnimationFrame(grab)
    else video.onloadeddata = () => requestAnimationFrame(grab)
  })

  const answer = (id, payload) => {
    api('automation/result', { id, ...payload }).catch(() => {})
  }

  // ── automation bridge: poll the host queue, drive the live view ──
  React.useEffect(() => {
    const timer = setInterval(async () => {
      if (inflightRef.current) return
      let pendingCmd
      try {
        const r = await api('automation/pending')
        pendingCmd = r.cmd
      } catch { return }
      if (!pendingCmd) return
      const { id, op } = pendingCmd
      if (op === 'navigate') {
        setCurrentPath(String(pendingCmd.path ?? 'index.html'))
        return answer(id, { ok: true, data: { navigated: pendingCmd.path } })
      }
      if (op === 'screenshot') {
        if (!streamRef.current) {
          return answer(id, { ok: false, error: 'screen capture is not enabled — click "Enable screen capture" in the Prototype tab once' })
        }
        try {
          const dataUrl = await captureFrame()
          return answer(id, { ok: true, data: { dataUrl } })
        } catch (err) {
          return answer(id, { ok: false, error: String(err?.message ?? err) })
        }
      }
      // shim ops: click, fill, read, eval, wait_for, console_dump
      const win = iframeRef.current?.contentWindow
      if (!win) return answer(id, { ok: false, error: 'no prototype loaded' })
      const timer = setTimeout(() => {
        inflightRef.current = null
        answer(id, { ok: false, error: 'shim did not answer in 9s (page still loading?)' })
      }, 9000)
      inflightRef.current = { id, timer }
      win.postMessage({ source: 'dsh-prototype', id, op, ...pendingCmd }, '*')
    }, 400)
    return () => clearInterval(timer)
  }, [])

  // Served URL for the workspace this tab is scoped to. The token is minted by
  // `status`; relative links inside the page keep it, so navigation stays in
  // the same workspace.
  const fileBase = status?.token ? FILE_BASE + status.token + '/' : null

  const reload = () => {
    if (iframeRef.current && currentPath && fileBase) {
      iframeRef.current.src = fileBase + currentPath + '?t=' + Date.now()
    }
  }

  if (!status) {
    return h('div', { className: 'pt-root' }, h('div', { className: 'pt-hint' }, 'Loading…'))
  }

  if (!status.exists) {
    return h('div', { className: 'pt-root' },
      h('div', { className: 'pt-empty' },
        h('h3', null, 'Prototypes'),
        h('p', null, 'This workspace has no ', h('code', null, 'prototype/'), ' folder yet — where your HTML prototypes live and get tested live.'),
        h('button', { className: 'pt-btn primary', disabled: busy, onClick: createRoot }, busy ? 'Creating…' : 'Create prototype folder'),
        h('p', { style: { fontSize: 11 } }, status.root)),
      toast && h('div', { className: 'pt-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  return h('div', { className: 'pt-root' },
    h('div', { className: 'pt-bar' },
      h('select', {
        value: currentPath ?? '', onChange: (e) => navigateTo(e.target.value),
        style: { maxWidth: 200, background: 'var(--dsw-alias-bg-layer-1,#26272e)', color: 'inherit', border: '1px solid var(--dsw-alias-border-l2,#4a4b55)', borderRadius: 6, padding: '3px 7px', fontSize: 12, fontFamily: 'inherit', outline: 'none' },
      },
        htmlFiles.length === 0 && h('option', { value: '' }, 'no .html files'),
        htmlFiles.map((p) => h('option', { key: p, value: p }, p))),
      h('span', { className: 'pt-url' }, '/prototype/file/' + (currentPath ?? '')),
      h('button', { className: 'pt-btn', onClick: reload, title: 'Reload the page' }, '⟳'),
      h('button', { className: 'pt-btn', onClick: () => api('open', { path: '.' }).then((r) => say('Opened in ' + r.editor)).catch(() => {}) }, 'Open'),
      h('button', {
        className: 'pt-btn' + (captureOn ? ' on' : ''),
        onClick: () => { ensureCapture() },
        title: 'Grant screen capture once — agent screenshots then capture the whole screen',
      }, captureOn ? '● Capture on' : 'Enable screen capture'),
      h('button', { className: 'pt-btn', onClick: () => setConsoleOpen(!consoleOpen), title: 'Console errors/warnings' },
        'Console ' + (consoleEntries.length ? '(' + consoleEntries.length + ')' : ''))),
    h('div', { className: 'pt-view' },
      currentPath && fileBase
        ? h('iframe', { ref: iframeRef, src: fileBase + currentPath, title: 'prototype' })
        : h('div', { className: 'pt-hint' },
          entries !== null && htmlFiles.length === 0
            ? h('div', null, 'No .html files yet.', h('br'), 'Ask the agent to create ', h('code', null, 'prototype/index.html'), ' or add one yourself.')
            : 'Loading…')),
    consoleOpen && h('div', { className: 'pt-console' },
      h('div', { className: 'pt-console-head', onClick: () => setConsoleOpen(false) },
        h('span', null, '▾ Console (error + warn, newest last)'),
        h('span', { style: { flex: 1 } }),
        h('button', { className: 'pt-btn', style: { padding: '1px 8px' }, onClick: (e) => { e.stopPropagation(); setConsoleEntries([]) } }, 'Clear')),
      h('div', { className: 'pt-console-body' },
        consoleEntries.length === 0
          ? h('div', { className: 'i' }, 'No console entries captured.')
          : consoleEntries.map((en, i) => h('div', { key: i, className: en.level === 'warn' ? 'w' : 'e' },
            h('span', { className: 'i' }, en.time.slice(11, 19)), en.text)))),
    toast && h('div', { className: 'pt-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function apply(ctx) {
  injectStyles()
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return
      if (!(window.__profileTabEnabled || (() => true))(TAB_ID)) return
      ctx.effect(() => betterSidebar.registerTab({
        id: TAB_ID,
        title: 'Prototype',
        order: 37,
        single: true,
        icon: (size) => ProtoIcon(size),
        component: (props) => React.createElement(PrototypeView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
