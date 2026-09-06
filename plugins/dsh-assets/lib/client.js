window.__ModuleLoader__.load({ id: 'dsh-assets', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-assets client half: a better-sidebar tab over the workspace `assets/`
// folder. Shows a gallery with previews of the AI-generated images, videos and
// audios, and holds the provider/model settings the agent tools use.

const TAB_ID = 'dsh-assets:gallery'
const h = React.createElement

// The active session's scope, set on every render from better-sidebar's
// TabComponentProps ({sessionId, cwd}) so every API call resolves the
// workspace the user is actually looking at.
let SCOPE = null

function api(method, payload) {
  return fetch('/assets/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

function fileUrl(path) {
  return '/assets/file/' + encodeURIComponent(path)
}

function injectStyles() {
  const id = 'assets-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.ast-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.ast-bar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.ast-bar input[type=text],.ast-bar textarea{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit}
.ast-bar textarea{width:100%;min-height:52px;resize:vertical}
.ast-bar select{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 6px;font-size:12px;outline:none;font-family:inherit;max-width:220px}
.ast-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.ast-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.ast-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#000);font-weight:600}
.ast-btn:disabled{opacity:.45;cursor:default}
.ast-tabs{display:flex;gap:4px}
.ast-tab{background:transparent;border:none;color:var(--dsw-alias-label-secondary,#b6b6bf);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12.5px;font-family:inherit}
.ast-tab:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#31323b))}
.ast-tab.active{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-bg-layer-2,#3a3b46));color:var(--dsw-alias-label-primary,#e8e8ea)}
.ast-gen{padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);display:flex;flex-direction:column;gap:6px;flex:none}
.ast-gen-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ast-grid{flex:1;overflow-y:auto;padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;align-content:start;min-height:0}
.ast-card{position:relative;display:flex;flex-direction:column;gap:4px;background:var(--dsw-alias-bg-layer-1,#26272e);border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:8px;padding:6px;min-width:0}
.ast-prev{width:100%;height:110px;object-fit:cover;border-radius:6px;background:#141519;display:block}
.ast-prev.vid,.ast-prev.aud{object-fit:contain;height:84px;background:#141519}
.ast-audio{width:100%;height:84px;display:flex;align-items:center;justify-content:center;font-size:26px;background:#141519;border-radius:6px}
.ast-name{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace}
.ast-meta{font-size:10px;color:var(--dsw-alias-label-tertiary,#7c7c88);display:flex;justify-content:space-between;gap:4px}
.ast-del{position:absolute;top:4px;right:4px;background:rgba(17,24,39,.85);border:1px solid #7f1d1d;color:#f87171;border-radius:6px;font-size:10px;padding:2px 6px;cursor:pointer;visibility:hidden}
.ast-card:hover .ast-del{visibility:visible}
.ast-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center}
.ast-empty h3{margin:0;font-size:15px}
.ast-empty p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:380px}
.ast-empty code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--dsw-alias-label-primary,#e8e8ea);background:var(--dsw-alias-bg-layer-2,#26272e);padding:1px 5px;border-radius:4px}
.ast-set{padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);display:flex;flex-direction:column;gap:6px;flex:none;background:var(--dsw-alias-bg-layer-1,#1c1d22)}
.ast-set-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ast-set label{font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf);min-width:52px}
.ast-key{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2,#4a4b55);color:var(--dsw-alias-label-tertiary,#7c7c88)}
.ast-key.ok{color:#34d399;border-color:#065f46}
.ast-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#7c7c88)}
.ast-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.ast-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function fmtSize(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB'
  return n + ' B'
}

const KIND_LABEL = { image: 'Imagens', video: 'Vídeos', audio: 'Áudios' }
const KIND_ICON = { video: '🎬', audio: '🎵', image: '🖼️' }

function Preview({ entry }) {
  const src = fileUrl(entry.path)
  if (entry.kind === 'image') return h('img', { className: 'ast-prev', src, loading: 'lazy', alt: entry.path })
  if (entry.kind === 'video') {
    return h('video', { className: 'ast-prev vid', src: src + '#t=0.5', preload: 'metadata', muted: true, controls: false })
  }
  return h('div', { className: 'ast-audio' }, KIND_ICON.audio)
}

function Card({ entry, onDelete }) {
  return h('div', { className: 'ast-card', title: entry.path },
    h(Preview, { entry }),
    h('div', { className: 'ast-name' }, entry.path),
    h('div', { className: 'ast-meta' },
      h('span', null, KIND_ICON[entry.kind] + ' ' + fmtSize(entry.size)),
      h('span', null, new Date(entry.mtime || Date.now()).toLocaleDateString())),
    h('button', { className: 'ast-del', onClick: () => onDelete(entry.path) }, 'Excluir'))
}

function SettingsCard({ settings, onSaved, toast }) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(settings)
  const [cat, setCat] = React.useState({ image: [], video: [], audio: [] })
  const [keyState, setKeyState] = React.useState({})
  React.useEffect(() => { setDraft(settings) }, [settings])

  const loadModels = (provider) => {
    for (const kind of ['image', 'video', 'audio']) {
      api('models', { provider, kind }).then((r) => {
        if (r.ok) {
          setCat((c) => ({ ...c, [kind]: r.models ?? [] }))
          setKeyState((k) => ({ ...k, [kind]: { hasKey: r.hasKey, keyName: r.keyName, error: r.error } }))
        }
      }).catch(() => {})
    }
  }
  React.useEffect(() => { if (open) loadModels(draft.provider) /* eslint-disable-line */ }, [open, draft.provider])

  const save = async () => {
    const r = await api('config', draft)
    if (r.ok) { onSaved(r.settings); toast('Configuração salva') } else toast(r.error ?? 'falha ao salvar', true)
  }

  return h('div', { className: 'ast-set' },
    h('div', { className: 'ast-set-row' },
      h('button', { className: 'ast-btn', onClick: () => setOpen(!open) }, (open ? '▲' : '▼') + ' Provedor e modelos'),
      h('span', { className: 'ast-hint' },
        `${draft.provider} · imagem: ${draft.imageModel || '—'} · vídeo: ${draft.videoModel || '—'} · áudio: ${draft.audioModel || '—'}`)),
    open && h('div', { className: 'ast-set-row' },
      h('label', null, 'Provedor'),
      h('select', { value: draft.provider, onChange: (e) => setDraft({ ...draft, provider: e.target.value, imageModel: '', videoModel: '', audioModel: '' }) },
        h('option', { value: 'openrouter' }, 'OpenRouter'),
        h('option', { value: 'fal' }, 'fal.ai (vídeo)')),
      ['image', 'video', 'audio'].map((kind) => {
        const st = keyState[kind]
        return h('div', { key: kind, style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
          h('label', null, KIND_LABEL[kind]),
          h('select', {
            value: draft[kind + 'Model'] ?? '',
            onChange: (e) => setDraft({ ...draft, [kind + 'Model']: e.target.value }),
          },
            h('option', { value: '' }, '— nenhum —'),
            (cat[kind] ?? []).map((m) => h('option', { key: m, value: m }, m))),
          (cat[kind] ?? []).includes(draft[kind + 'Model']) || !(draft[kind + 'Model'] ?? '') ? null
            : h('input', {
              type: 'text', value: draft[kind + 'Model'] ?? '', style: { width: 180 },
              onChange: (e) => setDraft({ ...draft, [kind + 'Model']: e.target.value }),
            }),
          st && h('span', { className: 'ast-key' + (st.hasKey ? ' ok' : '') },
            st.hasKey ? 'chave ok' : `sem ${st.keyName}`),
          st?.error && h('span', { className: 'ast-hint' }, st.error))
      }),
      h('div', { className: 'ast-set-row' },
        h('button', { className: 'ast-btn primary', onClick: save }, 'Salvar configuração'),
        h('span', { className: 'ast-hint' }, 'As ferramentas generate_image / generate_video / generate_audio dos agentes usam estes modelos.'))))
}

function AssetsView(props) {
  const [state, setState] = React.useState({ loading: true, exists: false, folder: 'assets', entries: [], settings: null, root: '' })
  const [filter, setFilter] = React.useState('all')
  const [prompt, setPrompt] = React.useState('')
  const [genKind, setGenKind] = React.useState('image')
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastRef = React.useRef(null)

  const notify = (msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3500)
  }

  const refresh = React.useCallback(() => {
    api('status').then((s) => {
      if (!s.ok) { notify(s.error ?? 'falha no status', true); return }
      setState((st) => ({ ...st, loading: false, exists: s.exists, folder: s.folder, root: s.root, settings: s.settings }))
      return api('list').then((l) => {
        if (l.ok) setState((st) => ({ ...st, exists: l.exists, folder: l.folder, entries: l.entries ?? [] }))
      })
    }).catch((e) => notify(String(e), true))
  }, [])

  React.useEffect(() => { SCOPE = { sessionId: props?.sessionId, cwd: props?.cwd }; refresh() }, [props?.sessionId, props?.cwd, refresh])

  const generate = async () => {
    if (!prompt.trim()) { notify('Escreva um prompt', true); return }
    setBusy(true)
    try {
      const r = await api('generate', { kind: genKind, prompt: prompt.trim() })
      if (r.ok) { notify(`Salvo em ${r.path} (${(r.bytes / 1024).toFixed(0)} KB)`); setPrompt(''); refresh() }
      else notify(r.error ?? 'falha ao gerar', true)
    } finally { setBusy(false) }
  }

  const del = async (path) => {
    const r = await api('delete', { path })
    if (r.ok) { refresh() } else notify(r.error ?? 'falha ao excluir', true)
  }

  const shown = state.entries.filter((e) => filter === 'all' || e.kind === filter)
  const counts = { all: state.entries.length, image: 0, video: 0, audio: 0 }
  for (const e of state.entries) counts[e.kind]++

  return h('div', { className: 'ast-root' },
    state.settings && h(SettingsCard, { settings: state.settings, onSaved: (s) => setState((st) => ({ ...st, settings: s })), toast: notify }),
    h('div', { className: 'ast-gen' },
      h('div', { className: 'ast-gen-row' },
        h('select', { value: genKind, onChange: (e) => setGenKind(e.target.value) },
          h('option', { value: 'image' }, 'Imagem'),
          h('option', { value: 'video' }, 'Vídeo'),
          h('option', { value: 'audio' }, 'Áudio')),
        h('input', {
          type: 'text', placeholder: 'Prompt para gerar agora (ou peça ao agente)…', value: prompt,
          style: { flex: 1, minWidth: 160 },
          onChange: (e) => setPrompt(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter' && !busy) generate() },
        }),
        h('button', { className: 'ast-btn primary', disabled: busy || !prompt.trim(), onClick: generate }, busy ? 'Gerando…' : 'Gerar'),
        h('button', { className: 'ast-btn', onClick: () => api('open_folder').then(() => refresh()) }, 'Abrir pasta'),
        h('button', { className: 'ast-btn', onClick: refresh }, 'Atualizar'))),
    h('div', { className: 'ast-bar' },
      h('div', { className: 'ast-tabs' },
        ['all', 'image', 'video', 'audio'].map((k) =>
          h('button', { key: k, className: 'ast-tab' + (filter === k ? ' active' : ''), onClick: () => setFilter(k) },
            (k === 'all' ? 'Todos' : KIND_LABEL[k]) + ` (${counts[k] ?? 0})`)))),
    state.loading
      ? h('div', { className: 'ast-empty' }, h('p', null, 'Carregando…'))
      : shown.length === 0
        ? h('div', { className: 'ast-empty' },
          h('h3', null, `Nenhuma mídia em ${state.folder}/ ainda`),
          h('p', null, 'Gere acima pelo prompt, ou peça no chat: "gere uma imagem de ..." — o agente usa as ferramentas ',
            h('code', null, 'generate_image'), ', ', h('code', null, 'generate_video'), ' e ',
            h('code', null, 'generate_audio'), ' e salva tudo aqui, organizado por tipo.'))
        : h('div', { className: 'ast-grid' },
          shown.map((e) => h(Card, { key: e.path, entry: e, onDelete: del }))),
    toast && h('div', { className: 'ast-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function AssetsIcon(size) {
  return h('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    h('rect', { x: 1.5, y: 2.5, width: 13, height: 11, rx: 1.5 }),
    h('path', { d: 'M1.5 10.5l3.5-3.5 3 3 2.5-2.5 4 4' }),
    h('circle', { cx: 11, cy: 5.5, r: 1.2 }))
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
        title: 'Assets',
        order: 39,
        single: true,
        icon: (size) => AssetsIcon(size),
        component: (props) => React.createElement(AssetsView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
