window.__ModuleLoader__.load({ id: 'dsh-hooks', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-hooks client half: a better-sidebar "Hooks" tab listing every NON-CORE
// hook (the ones we author) with a per-profile toggle. Toggling updates the
// active profile and reloads so the hook attaches/detaches.

const TAB_ID = 'dsh-hooks:roster'

function api(method, payload) {
  return fetch('/hooks/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'hooks-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.hk-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.hk-bar{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.hk-bar .ttl{font-weight:600;font-size:13px}
.hk-bar .sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa5)}
.hk-bar .sp{flex:1}
.hk-btn{background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.hk-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.hk-list{flex:1;overflow-y:auto;padding:8px 10px 16px;min-height:0}
.hk-item{display:flex;align-items:center;gap:12px;background:var(--dsw-alias-bg-layer-2,#202126);border:1px solid var(--dsw-alias-border-l1,#33343d);border-radius:10px;padding:10px 12px;margin-bottom:8px}
.hk-item .txt{flex:1;min-width:0}
.hk-item .nm{font-weight:600;font-size:13px}
.hk-item .ds{font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf);line-height:1.5}
.hk-switch{flex:none;position:relative;width:40px;height:22px;border-radius:11px;border:1px solid var(--dsw-alias-border-l2,#4a4b55);background:var(--dsw-alias-bg-layer-3,#2a2b32);cursor:pointer;transition:background .12s ease}
.hk-switch.on{background:var(--dsw-alias-brand-primary,#f0b90b)}
.hk-switch .knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .12s ease}
.hk-switch.on .knob{left:20px}
.hk-empty{padding:20px 14px;text-align:center;color:var(--dsw-alias-label-tertiary,#9a9aa5);font-size:12px;line-height:1.7}
.hk-note{padding:6px 12px;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#7c7c88);line-height:1.5}
.hk-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.hk-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function HooksView() {
  const h = React.createElement
  const [hooks, setHooks] = React.useState(null)
  const [profileName, setProfileName] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5000 : 2200)
  }, [])

  const load = React.useCallback(() => {
    api('list').then((r) => {
      if (!r.ok) return
      setHooks(r.hooks)
      setProfileName(window.__DSH_PROFILES__?.active?.label ?? null)
    }).catch(() => {})
  }, [])

  React.useEffect(() => { load() }, [load])

  const toggle = async (hk) => {
    if (busy) return
    setBusy(true)
    const r = await api('toggle', { id: hk.id, on: !hk.enabled })
    setBusy(false)
    if (!r.ok) return say(r.error || 'falhou', true)
    say('Hook atualizado — recarregando…')
    setTimeout(() => location.reload(), 400)
  }

  const anyOn = hooks?.some((h) => h.enabled) ?? false

  return h('div', { className: 'hk-root' },
    h('div', { className: 'hk-bar' },
      h('span', { className: 'ttl' }, 'Hooks'),
      h('span', { className: 'sub' }, profileName ? `perfil: ${profileName}` : 'sem perfil'),
      h('span', { className: 'sp' }),
      h('button', { className: 'hk-btn', onClick: load, title: 'Reload' }, '⟳')),
    h('div', { className: 'hk-list' },
      hooks === null && h('div', { className: 'hk-empty' }, 'Loading…'),
      hooks !== null && hooks.length === 0 && h('div', { className: 'hk-empty' },
        h('div', null, 'Nenhum hook não-core registrado ainda.', h('br'), 'Hooks core (pre-step, session-start, tools/result, …) são do harness; os que criamos para o nosso processo aparecem aqui.')),
      hooks !== null && hooks.map((hk) => h('div', { className: 'hk-item', key: hk.id },
        h('div', { className: 'txt' },
          h('div', { className: 'nm' }, hk.label),
          h('div', { className: 'ds' }, hk.description)),
        h('div', { className: 'hk-switch' + (hk.enabled ? ' on' : ''), role: 'switch', 'aria-checked': hk.enabled, title: hk.enabled ? 'Desativar' : 'Ativar', onClick: () => toggle(hk) },
          h('span', { className: 'knob' }))))),
    h('div', { className: 'hk-note' },
      'Toggle muda o perfil ativo e recarrega. Cada perfil pode ter seu próprio conjunto de hooks — monte perfis ultra-específicos por tipo de processo.'),
    toast && h('div', { className: 'hk-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function HooksIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('path', { d: 'M8 2.5v11' }),
    React.createElement('path', { d: 'M5 5l3 3.5L11 5' }),
    React.createElement('path', { d: 'M5 11h6' }),
  )
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
        title: 'Hooks',
        order: 39,
        single: true,
        icon: (size) => HooksIcon(size),
        component: () => React.createElement(HooksView),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
