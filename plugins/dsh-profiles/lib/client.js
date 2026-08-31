window.__ModuleLoader__.load({ id: 'dsh-profiles', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-profiles client half: the KISS multiuser gate. When no profile is
// active it takes over the screen with the profile picker (create/edit/
// delete); when one is active it publishes window.__DSH_PROFILES__ so every
// plugin decides whether its panel is in play, and registers a better-sidebar
// footer action to switch/logout (logout = reload on the picker).

let SCOPE = null

const GATE_TAB_ID = 'dsh-profiles:gate'
const FOOTER_TAB_ID = 'dsh-profiles:footer'

function api(method, payload) {
  return fetch('/profiles/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'prof-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.prfx-root{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:var(--dsw-alias-bg-base,#141519);color:var(--dsw-alias-label-primary,#e8e8ea);padding:28px;font-family:inherit}
.prfx-root h1{margin:0;font-size:20px;letter-spacing:.02em}
.prfx-root .lead{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:460px;text-align:center}
.prfx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:100%;max-width:760px}
.prfx-card{background:var(--dsw-alias-bg-layer-2,#202126);border:1px solid var(--dsw-alias-border-l2,#3a3b44);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;cursor:pointer;text-align:left;transition:border-color .12s ease}
.prfx-card:hover{border-color:var(--dsw-alias-brand-primary,#f0b90b)}
.prfx-card .nm{font-weight:600;font-size:14px}
.prfx-card .meta{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa5);line-height:1.5}
.prfx-card .acts{display:flex;gap:6px;margin-top:8px}
.prfx-btn{background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.prfx-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.prfx-btn.primary{background:var(--dsw-alias-brand-primary,#f0b90b);border-color:transparent;color:#111;font-weight:600}
.prfx-btn.danger{color:#f87171;border-color:#7f1d1d}
.prfx-btn.danger:hover{background:#3b1212}
.prfx-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:24px}
.prfx-modal-in{background:var(--dsw-alias-bg-layer-2,#1e1f26);border:1px solid var(--dsw-alias-border-l2,#3a3b44);border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
.prfx-modal-in h2{margin:0;font-size:16px}
.prfx-field{display:flex;flex-direction:column;gap:5px}
.prfx-field label{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#9a9aa5)}
.prfx-field input,.prfx-field select{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:7px;padding:7px 10px;font-size:13px;outline:none;font-family:inherit}
.prfx-checks{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px}
.prfx-checks label{display:flex;gap:6px;align-items:center;cursor:pointer;color:var(--dsw-alias-label-secondary,#b6b6bf)}
.prfx-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.prfx-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;max-width:80vw}
.prfx-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

// Cheat-sheet id→label for the plugin picker.
const PLUGIN_LABELS = {
  'dsh-better-sidebar:skills': 'Skills',
  'dsh-mds:artifacts': 'MDS (markdown notes)',
  'dsh-prototype:view': 'Prototype (browser)',
  'dsh-kanban:board': 'Kanban',
  'dsh-openviking:memory': 'Memory (OpenViking)',
  'dsh-ssh-tunnel:*': 'SSH Tunnel',
  'dsh-docs-panel:docs': 'Docs Panel',
  'dsh-flowglass:*': 'Flowglass',
  'dsh-sidebar-qa:*': 'Sidebar QA',
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

function ProfileGate({ bootstrap }) {
  const h = React.createElement
  const [profiles, setProfiles] = React.useState(bootstrap.profiles)
  const [modal, setModal] = React.useState(null) // null | 'create' | profile
  const [draft, setDraft] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)

  const shot = (msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5000 : 2400)
  }

  const openCreate = () => {
    setModal('create')
    setDraft({ id: '', label: '', preset: 'default', plugins: bootstrap.plugins.map((p) => p), skills: [] })
  }
  const openEdit = (p) => {
    setModal(p)
    setDraft({ id: p.id, label: p.label, preset: p.preset, plugins: p.plugins, skills: p.skills })
  }
  const close = () => { setModal(null); setDraft(null) }

  const enter = async (id) => {
    await api('setActive', { active: id })
    location.reload()
  }
  const remove = async (p) => {
    if (!window.confirm(`Excluir perfil "${p.label}"?`)) return
    const r = await api('delete', { id: p.id })
    if (!r.ok) return shot(r.error, true)
    setProfiles((prev) => prev.filter((x) => x.id !== p.id))
    shot('Perfil excluído')
  }
  const save = async () => {
    setBusy(true)
    const editing = modal !== 'create'
    const r = await api(editing ? 'update' : 'create', {
      id: draft.id, label: draft.label, preset: draft.preset,
      plugins: draft.plugins, skills: draft.skills,
    })
    setBusy(false)
    if (!r.ok) return shot(r.error, true)
    if (editing) setProfiles((prev) => prev.map((x) => (x.id === draft.id ? r.profile : x)))
    else setProfiles((prev) => [...prev, r.profile])
    close()
    shot(editing ? 'Perfil atualizado' : 'Perfil criado')
  }
  const togglePlugin = (id) => setDraft((d) => ({ ...d, plugins: d.plugins.includes(id) ? d.plugins.filter((x) => x !== id) : [...d.plugins, id] }))

  const field = (key, label, value, onChange, placeholder = '') =>
    h('div', { className: 'prfx-field', key },
      h('label', null, label),
      h('input', { value: value ?? '', onChange: (e) => onChange(e.target.value), placeholder }))

  const gridEl = h('div', { className: 'prfx-grid' },
    profiles.map((p) => h('div', { className: 'prfx-card', key: p.id },
      h('div', { className: 'nm' }, p.label),
      h('div', { className: 'meta' },
        `Preset: ${p.preset ?? 'default'} · ${(p.plugins ?? []).length} plugins`,
        (p.skills ?? []).length ? ` · skills: ${p.skills.join(', ')}` : ''),
      h('div', { className: 'acts' },
        h('button', { className: 'prfx-btn primary', onClick: () => enter(p.id) }, 'Entrar'),
        h('button', { className: 'prfx-btn', onClick: () => openEdit(p) }, 'Editar'),
        h('button', { className: 'prfx-btn danger', onClick: () => remove(p) }, 'Excluir')))))
  const modalEl = modal && h('div', { className: 'prfx-modal', onClick: (e) => { if (e.target === e.currentTarget) close() } },
    h('div', { className: 'prfx-modal-in' },
      h('h2', null, modal === 'create' ? 'Criar perfil' : `Editar ${modal.label}`),
      field('id', 'Identificador (minúsculas, 1-32)', draft.id, (v) => setDraft({ ...draft, id: v }), 'games | web | eri…'),
      field('label', 'Nome de exibição', draft.label, (v) => setDraft({ ...draft, label: v }), 'Games | Sistemas Web…'),
      field('preset', 'Preset padrão', draft.preset, (v) => setDraft({ ...draft, preset: v }), 'default'),
      h('div', { className: 'prfx-field' },
        h('label', null, 'Plugins visíveis na barra lateral'),
        h('div', { className: 'prfx-checks' },
          bootstrap.plugins.map((id) => h('label', { key: id },
            h('input', { type: 'checkbox', checked: draft.plugins.includes(id), onChange: () => togglePlugin(id) }),
            PLUGIN_LABELS[id] ?? id)))),
      field('skills', 'Pastas de skills (separadas por vírgula — ex.: ~/.dsh/skills/games)', draft.skills, (v) => setDraft({ ...draft, skills: v.split(',').map((s) => s.trim()).filter(Boolean) })),
      h('div', { className: 'prfx-actions' },
        h('button', { className: 'prfx-btn', onClick: close }, 'Cancelar'),
        h('button', { className: 'prfx-btn primary', disabled: busy || !draft.id || !draft.label, onClick: save }, busy ? 'Salvando…' : 'Salvar'))))

  return h('div', { className: 'prfx-root' },
    h('h1', null, 'Quem está entrando?'),
    h('p', { className: 'lead' }, 'Cada perfil tem seu próprio preset, suas skills e seus plugins na barra lateral. Escolha um, ou crie o seu.'),
    gridEl,
    h('button', { className: 'prfx-btn primary', onClick: openCreate }, '+ Criar perfil'),
    modalEl,
    toast && h('div', { className: 'prfx-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function ProfileMenu() {
  const h = React.createElement
  const [active, setActive] = React.useState(window.__DSH_PROFILES__?.active ?? null)
  const [open, setOpen] = React.useState(false)
  const logout = async () => {
    await api('logout')
    location.reload()
  }
  return h('div', { style: { position: 'relative', display: 'inline-flex' } },
    h('button', { className: 'ov-btn', style: { cursor: 'pointer' }, onClick: () => setOpen(!open), title: 'Perfil atual' },
      ProfileIcon(14), ' ', active?.label ?? 'Perfil', h('span', { style: { fontSize: 10 } }, ' ▾')),
    open && h('div', { style: { position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 3000, minWidth: 180, background: 'var(--dsw-alias-bg-layer-3,#0a0b0e)', border: '1px solid var(--dsw-alias-border-l2,#3a3b44)', borderRadius: 8, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,.4)' } },
      h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#9a9aa5)', padding: '2px 8px' } }, `Perfil: ${active?.label ?? '—'}`),
      h('button', { className: 'prfx-btn', style: { width: '100%', marginTop: 4 }, onClick: () => { setOpen(false); logout() } }, 'Sair / trocar perfil')))
}

function apply(ctx) {
  injectStyles()
  // Helper global: cada plugin decide sua aba por perfil. Sem o dsh-profiles
  // instalado (ou sem perfil ativo) tudo permanece visível.
  window.__profileTabEnabled = (tabId) => {
    try {
      const st = window.__DSH_PROFILES__
      if (!st || !st.active) return true
      return (st.active.plugins || []).includes(tabId)
    } catch { return true }
  }
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      api('bootstrap').then((r) => {
        if (!r.ok) return
        window.__DSH_PROFILES__ = { active: r.active, profiles: r.profiles, plugins: r.plugins }
        if (!r.active) {
          // Sem perfil ativo: abre a aba de perfil (fullscreen via CSS) para
          // que o gate tome a tela — o usuário escolhe e recarrega.
          betterSidebar.registerTab?.({
            id: GATE_TAB_ID,
            title: 'Perfil',
            order: 99,
            single: true,
            icon: (size) => ProfileIcon(size),
            component: () => React.createElement(ProfileGate, { bootstrap: r }),
          })
          try { betterSidebar.openTab?.({ type: GATE_TAB_ID, id: GATE_TAB_ID }) } catch { /* aba indisponível */ }
        } else {
          // Perfil ativo: menu de perfil no rodapé da barra lateral.
          if (betterSidebar.registerTab) {
            betterSidebar.registerTab({
              id: FOOTER_TAB_ID,
              title: 'Perfil',
              order: 1,
              single: true,
              icon: (size) => ProfileIcon(size),
              component: () => React.createElement(ProfileMenu),
            })
          }
        }
      })
    },
  })
}

  exports.apply = apply
  return module.exports
} })
