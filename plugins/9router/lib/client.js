window.__ModuleLoader__.load({ id: '9router-app', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// 9Router client half: a better-sidebar tab that embeds the 9Router dashboard
// (spawned/adopted by the host half) and offers start/stop/open controls.

const TAB_ID = '9router:dashboard'
const h = React.createElement

function api(method) {
  return fetch('/9router/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'ninerouter-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.nr-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.nr-bar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.nr-dot{width:9px;height:9px;border-radius:50%;flex:none}
.nr-dot.on{background:#34d399}
.nr-dot.off{background:#f87171}
.nr-dot.wait{background:#fbbf24}
.nr-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.nr-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.nr-btn:disabled{opacity:.45;cursor:default}
.nr-meta{font-size:11px;color:var(--dsw-alias-label-tertiary,#7c7c88);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.nr-frame{flex:1;border:none;width:100%;min-height:0;background:#0b0c10}
.nr-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center}
.nr-empty h3{margin:0;font-size:15px}
.nr-empty p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:420px}
.nr-empty code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--dsw-alias-label-primary,#e8e8ea);background:var(--dsw-alias-bg-layer-2,#26272e);padding:1px 5px;border-radius:4px}
.nr-log{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#7c7c88);white-space:pre-wrap;max-height:120px;overflow-y:auto;text-align:left;background:var(--dsw-alias-bg-layer-1,#1c1d22);border-radius:6px;padding:8px}
`
  document.head.appendChild(el)
}

function NrIcon(size) {
  return h('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    h('circle', { cx: 8, cy: 8, r: 6.2 }),
    h('path', { d: 'M5.2 5.2h5.6M5.2 10.8h5.6M6.4 5.2c1.2 3.6 1.2 5.6 0 5.6M9.6 5.2c-1.2 3.6-1.2 5.6 0 5.6' }))
}

function NrView() {
  const [st, setSt] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [frameKey, setFrameKey] = React.useState(0)

  const refresh = React.useCallback(() => {
    api('status').then((r) => { if (r.ok) setSt(r) }).catch(() => {})
  }, [])

  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  const act = async (method) => {
    setBusy(true)
    try {
      const r = await api(method)
      if (r.ok) { setFrameKey((k) => k + 1); refresh() }
    } finally { setBusy(false) }
  }

  const running = !!(st?.running)
  const dot = st == null ? 'wait' : running ? 'on' : 'off'
  const built = st?.built !== false

  return h('div', { className: 'nr-root' },
    h('div', { className: 'nr-bar' },
      h('span', { className: 'nr-dot ' + dot }),
      h('span', { className: 'nr-meta' }, st ? `porta ${st.port} · ${running ? (st.adopted ? 'adotado' : 'nosso processo') : 'parado'} · endpoint ${st.endpoint}` : 'conectando…'),
      !running && h('button', { className: 'nr-btn', disabled: busy, onClick: () => act('start') }, 'Iniciar'),
      running && h('button', { className: 'nr-btn', disabled: busy, onClick: () => act('restart') }, 'Reiniciar'),
      running && !st?.adopted && h('button', { className: 'nr-btn', disabled: busy, onClick: () => act('stop') }, 'Parar'),
      h('button', { className: 'nr-btn', onClick: () => act('open') }, 'Abrir no navegador'),
      h('button', { className: 'nr-btn', onClick: () => { refresh(); setFrameKey((k) => k + 1) } }, '↻')),
    running
      ? h('iframe', {
        key: frameKey,
        className: 'nr-frame',
        src: (st?.dashboardUrl ?? '') + `?t=${frameKey}`,
        title: '9Router Dashboard',
      })
      : h('div', { className: 'nr-empty' },
        h('h3', null, built ? '9Router parado' : '9Router sem build'),
        built
          ? h('p', null, 'Clique em ', h('strong', null, 'Iniciar'), ' para subir o router (endpoint ', h('code', null, st?.endpoint ?? ''), ').')
          : h('p', null, 'O build standalone não existe ainda. Rode na pasta do repo: ', h('code', null, 'npm run build'), ' e ', h('code', null, 'node cli/scripts/build-cli.js'), '.'),
        st?.spawnLog?.length ? h('div', { className: 'nr-log' }, st.spawnLog.join('')) : null))
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
        title: '9Router',
        order: 36,
        single: true,
        icon: (size) => NrIcon(size),
        component: () => React.createElement(NrView),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
