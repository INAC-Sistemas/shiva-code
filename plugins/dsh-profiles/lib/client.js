window.__ModuleLoader__.load({ id: 'dsh-profiles', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')
  const ReactDOMClient = require('react-dom/client')

// dsh-profiles client half: a REAL initial screen. With no active profile the
// client redirects to the standalone /profiles page (served by the host before
// the app loads) — no overlay fighting the workspace. With a profile active it
// published window.__profileTabEnabled so plugins gate their tabs, and mounts a
// floating "Perfil" button to log out / switch (logout → /profiles).

function api(method, payload) {
  return fetch('/profiles/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'prof-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.prfx-float{position:fixed;bottom:16px;right:16px;z-index:50000;display:inline-flex;align-items:center;gap:6px;background:#0a0b0e;border:1px solid #3a3b44;border-radius:999px;padding:8px 14px;font-size:12.5px;color:#e8e8ea;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4);font-family:inherit}
.prfx-float:hover{border-color:#f0b90b}
.prfx-menu{position:fixed;bottom:60px;right:16px;z-index:50000;min-width:190px;background:#0a0b0e;border:1px solid #3a3b44;border-radius:10px;padding:6px;box-shadow:0 10px 28px rgba(0,0,0,.45)}
.prfx-menu .lbl{font-size:11px;color:#9a9aa5;padding:2px 8px}
.prfx-menu button{width:100%;text-align:left;margin-top:4px;background:#2a2b32;color:#e8e8ea;border:1px solid #43444d;border-radius:7px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.prfx-menu button:hover{background:#3a3b46}
`
  document.head.appendChild(el)
}

function ProfileIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('circle', { cx: '8', cy: '5.5', r: '2.6' }),
    React.createElement('path', { d: 'M2.6 13.5c.8-2.6 3-4 5.4-4s4.6 1.4 5.4 4' }),
  )
}

function ProfileButton({ active }) {
  const h = React.createElement
  const [open, setOpen] = React.useState(false)
  const logout = async () => {
    await api('logout')
    location.href = '/profiles'
  }
  return h(React.Fragment, null,
    h('button', { className: 'prfx-float', onClick: () => setOpen(!open), title: 'Perfil atual' },
      ProfileIcon(14), ' ', active?.label ?? 'Perfil', h('span', { style: { fontSize: 10 } }, ' ▾')),
    open && h('div', { className: 'prfx-menu' },
      h('div', { className: 'lbl' }, `Perfil: ${active?.label ?? '—'}`),
      h('button', { onClick: logout }, 'Sair / trocar perfil')))
}

function apply(ctx) {
  injectStyles()
  window.__profileTabEnabled = (tabId) => {
    try {
      const st = window.__DSH_PROFILES__
      if (!st || !st.active) return true
      return (st.active.plugins || []).includes(tabId)
    } catch { return true }
  }
  api('bootstrap').then((r) => {
    if (!r.ok) return
    window.__DSH_PROFILES__ = { active: r.active, profiles: r.profiles, plugins: r.plugins }
    if (!r.active) {
      // Tela inicial de verdade: sai do app e vai pra página standalone.
      if (location.pathname !== '/profiles') location.replace('/profiles')
      return
    }
    const host = document.createElement('div')
    host.id = 'dsh-profiles-mount'
    document.body.append(host)
    ReactDOMClient.createRoot(host).render(React.createElement(ProfileButton, { active: r.active }))
  }).catch(() => {})
}

  exports.apply = apply
  return module.exports
} })
