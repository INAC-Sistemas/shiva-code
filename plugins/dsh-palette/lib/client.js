window.__ModuleLoader__.load({ id: 'dsh-palette', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-palette client half: the Paletas sidebar tab. Browse preset palettes by
// style and color family, generate one, or type custom hex colors; preview the
// pick on a mini interface in light and dark; confirm with "Usar esta paleta".
// A poller opens the tab by itself when the model calls `palette_pick`, and the
// confirmation answers that call.

const TAB_ID = 'dsh-palette:picker'
const POLL_MS = 1000

const ROLES = [
  ['primary', 'Primária'],
  ['secondary', 'Secundária'],
  ['accent', 'Destaque'],
  ['background', 'Fundo'],
  ['foreground', 'Texto'],
]
const STYLES = [
  ['todas', 'Todas'], ['sugestao', 'Sugestões do agente'], ['gerada', 'Geradas'], ['popular', 'Populares'],
  ['pastel', 'Pastel'], ['escura', 'Escuras'], ['vibrante', 'Vibrantes'], ['neutra', 'Neutras'], ['monocromatica', 'Monocromáticas'],
]
const FAMILIES = [
  ['vermelho', 'Vermelho', '#EF4444'], ['laranja', 'Laranja', '#F97316'], ['amarelo', 'Amarelo', '#EAB308'],
  ['verde', 'Verde', '#22C55E'], ['azul', 'Azul', '#3B82F6'], ['roxo', 'Roxo', '#A855F7'],
  ['rosa', 'Rosa', '#EC4899'], ['marrom', 'Marrom', '#8B5E3C'], ['cinza', 'Cinza', '#6B7280'],
]

function api(method, payload) {
  return fetch('/palette/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

// ── color math ───────────────────────────────────────────────────────────
function normalizeHex(value) {
  if (typeof value !== 'string') return null
  let hex = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(hex) ? '#' + hex.toUpperCase() : null
}
function rgb(hex) { return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) }
function hsl(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function fromHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
function luminance(hex) {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
function readableOn(hex) { return contrast(hex, '#FFFFFF') >= contrast(hex, '#111111') ? '#FFFFFF' : '#111111' }

/** The color family of a palette: the hue of its most saturated color. */
function familyOf(colors) {
  let best = null
  for (const c of colors) { const [h, s, l] = hsl(c); if (l > 0.08 && l < 0.92 && (!best || s > best[1])) best = [h, s, l] }
  if (!best || best[1] < 0.15) return 'cinza'
  const [h, , l] = best
  if ((h < 45 && l < 0.4) || (h >= 20 && h < 45 && best[1] < 0.55)) return 'marrom'
  if (h < 15 || h >= 345) return 'vermelho'
  if (h < 45) return 'laranja'
  if (h < 70) return 'amarelo'
  if (h < 170) return 'verde'
  if (h < 255) return 'azul'
  if (h < 290) return 'roxo'
  return 'rosa'
}

/** Map up to five colors to roles: lightest is the background, darkest the text, the most saturated lead. */
function guessRoles(colors) {
  const list = [...new Set(colors)]
  if (list.length === 0) return {}
  const byLight = [...list].sort((a, b) => luminance(a) - luminance(b))
  const foreground = byLight[0]
  const background = byLight[byLight.length - 1]
  const middle = list.filter((c) => c !== foreground && c !== background).sort((a, b) => hsl(b)[1] - hsl(a)[1])
  const primary = middle[0] ?? foreground
  const secondary = middle[1] ?? fromHsl(hsl(primary)[0], Math.max(0.2, hsl(primary)[1] * 0.6), 0.9)
  const accent = middle[2] ?? fromHsl((hsl(primary)[0] + 150) % 360, 0.7, 0.55)
  return { primary, secondary, accent, background, foreground }
}

/** A harmonious five-color palette from a random hue and scheme. */
function generatePalette(n) {
  const base = Math.random() * 360
  const scheme = ['análoga', 'complementar', 'tríade', 'monocromática'][Math.floor(Math.random() * 4)]
  const hues = scheme === 'análoga' ? [base, base + 25, base - 25]
    : scheme === 'complementar' ? [base, base + 180, base + 20]
      : scheme === 'tríade' ? [base, base + 120, base + 240] : [base, base, base]
  const wrap = (h) => ((h % 360) + 360) % 360
  const colors = [
    fromHsl(wrap(hues[0]), 0.55, 0.12),
    fromHsl(wrap(hues[0]), 0.7, 0.42),
    fromHsl(wrap(hues[1]), 0.65, 0.55),
    fromHsl(wrap(hues[2]), 0.6, 0.78),
    fromHsl(wrap(hues[0]), 0.35, 0.97),
  ]
  return { id: 'gerada-' + n + '-' + Math.floor(base), name: 'Gerada ' + n + ' (' + scheme + ')', tags: ['gerada'], colors, generated: true }
}

// ── shared request state (poller → view) ─────────────────────────────────
let REQUEST = null
const listeners = new Set()
function setRequest(next) {
  if ((next?.id ?? null) === (REQUEST?.id ?? null)) return
  REQUEST = next
  for (const l of listeners) l()
}
function useRequest() {
  return React.useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => REQUEST,
    () => null,
  )
}

function injectStyles() {
  if (document.getElementById('dsh-palette-styles')) return
  const el = document.createElement('style')
  el.id = 'dsh-palette-styles'
  el.textContent = `
.pl-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.pl-head{padding:12px 14px 8px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.pl-head h2{margin:0 0 4px;font-size:15px}
.pl-head p{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary,#b6b6bf);line-height:1.5}
.pl-ask{margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,#2a2b33);border:1px solid var(--dsw-alias-brand-primary,#2563eb);font-size:12.5px;line-height:1.5}
.pl-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px;flex:none}
.pl-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2,#4a4b55);background:transparent;color:inherit;border-radius:999px;padding:3px 10px;font-size:11.5px;cursor:pointer;font-family:inherit}
.pl-chip.on{background:var(--dsw-alias-bg-layer-2,#3a3b46);border-color:var(--dsw-alias-label-secondary,#b6b6bf)}
.pl-dot{width:10px;height:10px;border-radius:50%}
.pl-body{flex:1;overflow-y:auto;min-height:0;padding:4px 14px 16px}
.pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.pl-card{border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1,#1f2027);cursor:pointer}
.pl-card.sel{outline:2px solid var(--dsw-alias-brand-primary,#2563eb);outline-offset:1px}
.pl-stripes{display:flex;height:96px}
.pl-stripe{flex:1;position:relative;display:flex;align-items:flex-end;justify-content:center}
.pl-stripe span{opacity:0;font:600 10px ui-monospace,Menlo,Consolas,monospace;padding-bottom:6px;writing-mode:vertical-rl;transform:rotate(180deg);transition:opacity .15s}
.pl-stripe:hover{flex:1.8}
.pl-stripe:hover span{opacity:1}
.pl-stripes .pl-stripe{transition:flex .18s ease}
.pl-meta{display:flex;align-items:center;gap:6px;padding:7px 9px;font-size:12px}
.pl-meta .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-badge{font-size:10px;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-secondary,#b6b6bf)}
.pl-note{font-size:11px;color:var(--dsw-alias-label-secondary,#9a9aa5);padding:0 9px 8px;line-height:1.4}
.pl-section{margin:14px 0 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#9a9aa5)}
.pl-panel{flex:none;border-top:1px solid var(--dsw-alias-border-l1,#3a3b44);padding:10px 14px 12px;display:flex;flex-direction:column;gap:10px;max-height:58%;overflow-y:auto}
.pl-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.pl-role{display:flex;align-items:center;gap:6px}
.pl-role label{font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf);width:64px;flex:none}
.pl-role input[type=color]{width:26px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;background:none;cursor:pointer;flex:none}
.pl-role input[type=text]{width:78px;background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 6px;font:12px ui-monospace,Menlo,Consolas,monospace;outline:none}
.pl-role input.bad{border-color:#f87171}
.pl-previews{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pl-prev{border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:7px;border:1px solid rgba(127,127,127,.25);font-size:11.5px}
.pl-prev .bar{display:flex;align-items:center;justify-content:space-between;font-weight:600}
.pl-prev .btns{display:flex;gap:6px}
.pl-prev .btn{border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:none}
.pl-prev .field{border-radius:6px;padding:4px 7px;font-size:11px}
.pl-prev .muted{opacity:.72}
.pl-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pl-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:7px;padding:6px 12px;font-size:12.5px;cursor:pointer;font-family:inherit}
.pl-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#000);font-weight:600}
.pl-btn:disabled{opacity:.45;cursor:default}
.pl-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9aa5);line-height:1.5}
.pl-aa{font-size:11px}
.pl-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.pl-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function Preview({ roles, dark }) {
  const h = React.createElement
  const bg = dark ? roles.foreground : roles.background
  const fg = dark ? roles.background : roles.foreground
  return h('div', { className: 'pl-prev', style: { background: bg, color: fg } },
    h('div', { className: 'bar' }, h('span', null, dark ? 'Escuro' : 'Claro'), h('span', { style: { color: roles.primary } }, '●')),
    h('div', { className: 'btns' },
      h('button', { className: 'btn', style: { background: roles.primary, color: readableOn(roles.primary) } }, 'Salvar'),
      h('button', { className: 'btn', style: { background: roles.secondary, color: readableOn(roles.secondary) } }, 'Voltar')),
    h('div', { className: 'field', style: { border: '1px solid ' + roles.accent, color: fg } }, 'email@exemplo.com'),
    h('div', { className: 'muted' }, 'Texto de apoio'),
    h('div', null, h('span', { style: { color: roles.accent, fontWeight: 600 } }, 'Destaque')))
}

function PaletteCard({ palette, selected, onSelect, onCopy }) {
  const h = React.createElement
  return h('div', { className: 'pl-card' + (selected ? ' sel' : ''), onClick: () => onSelect(palette) },
    h('div', { className: 'pl-stripes' }, palette.colors.map((c, i) => h('div', {
      key: i, className: 'pl-stripe', style: { background: c, color: readableOn(c) }, title: 'Copiar ' + c,
      onClick: (e) => { e.stopPropagation(); onCopy(c) },
    }, h('span', null, c)))),
    h('div', { className: 'pl-meta' },
      h('span', { className: 'nm' }, palette.name),
      palette.tags?.includes('sugestao') && h('span', { className: 'pl-badge' }, 'agente')),
    palette.note ? h('div', { className: 'pl-note' }, palette.note) : null)
}

function PaletteView() {
  const h = React.createElement
  const request = useRequest()
  const [presets, setPresets] = React.useState([])
  const [generated, setGenerated] = React.useState([])
  const [style, setStyle] = React.useState('todas')
  const [family, setFamily] = React.useState(null)
  const [picked, setPicked] = React.useState(null) // { source, name, colors }
  const [roles, setRoles] = React.useState(null)
  const [drafts, setDrafts] = React.useState({})
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const timer = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err }); clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), err ? 5000 : 2000)
  }, [])

  React.useEffect(() => { injectStyles(); api('presets').then((r) => { if (r.ok) setPresets(r.palettes) }).catch(() => {}) }, [])

  const suggestions = request?.suggestions ?? []
  React.useEffect(() => { if (suggestions.length > 0) setStyle('sugestao') }, [request?.id])

  const pick = (palette, source) => {
    const next = guessRoles(palette.colors)
    setPicked({ source: source ?? (palette.generated ? 'generated' : palette.tags?.includes('sugestao') ? 'suggestion' : 'preset'), name: palette.name, colors: palette.colors })
    setRoles(next); setDrafts(next)
  }
  const copy = (hex) => { try { navigator.clipboard?.writeText(hex) } catch { /* denied */ } say(hex + ' copiado') }
  const generate = () => { const p = generatePalette(generated.length + 1); setGenerated([p, ...generated].slice(0, 12)); setStyle('gerada'); pick(p, 'generated') }

  const editRole = (role, value) => {
    setDrafts({ ...drafts, [role]: value })
    const hex = normalizeHex(value)
    if (!hex) return
    const base = roles ?? guessRoles(['#0F766E', '#F59E0B', '#FFFFFF', '#0F172A'])
    const next = { ...base, [role]: hex }
    setRoles(next)
    setPicked({ source: 'custom', name: 'Personalizada', colors: ROLES.map(([r]) => next[r]).filter(Boolean) })
  }
  const startCustom = () => {
    const base = roles ?? { primary: '#0F766E', secondary: '#64748B', accent: '#F59E0B', background: '#FFFFFF', foreground: '#0F172A' }
    setRoles(base); setDrafts(base)
    setPicked({ source: 'custom', name: 'Personalizada', colors: ROLES.map(([r]) => base[r]) })
  }

  const confirm = async () => {
    if (!request || !picked || !roles) return
    setBusy(true)
    const r = await api('choose', { id: request.id, selection: { ...picked, roles } }).catch((e) => ({ ok: false, error: String(e) }))
    setBusy(false)
    if (!r.ok) return say(r.error || 'não foi possível enviar', true)
    setRequest(null)
    say('Paleta enviada ao agente')
  }
  const cancel = async () => {
    if (!request) return
    await api('cancel', { id: request.id }).catch(() => {})
    setRequest(null)
  }

  const all = [...suggestions, ...generated, ...presets]
  const visible = all.filter((p) => (style === 'todas' || p.tags?.includes(style)) && (!family || familyOf(p.colors) === family))
  const invalid = ROLES.some(([r]) => drafts[r] !== undefined && drafts[r] !== '' && !normalizeHex(drafts[r]))
  const ratio = roles ? contrast(roles.foreground, roles.background) : 0

  return h('div', { className: 'pl-root' },
    h('div', { className: 'pl-head' },
      h('h2', null, 'Paletas de cores'),
      h('p', null, 'Escolha uma paleta pronta, gere uma nova ou digite suas cores em hexadecimal. Veja como fica nos modos claro e escuro e confirme.'),
      request && h('div', { className: 'pl-ask' }, '🎨 ', request.question)),
    h('div', { className: 'pl-chips' },
      STYLES.filter(([id]) => (id !== 'sugestao' || suggestions.length > 0) && (id !== 'gerada' || generated.length > 0))
        .map(([id, label]) => h('button', { key: id, className: 'pl-chip' + (style === id ? ' on' : ''), onClick: () => setStyle(id) }, label)),
      h('button', { className: 'pl-chip', onClick: generate }, '✦ Gerar paleta'),
      h('button', { className: 'pl-chip', onClick: startCustom }, '✎ Personalizada')),
    h('div', { className: 'pl-chips', style: { paddingTop: 0 } },
      FAMILIES.map(([id, label, dot]) => h('button', {
        key: id, className: 'pl-chip' + (family === id ? ' on' : ''), onClick: () => setFamily(family === id ? null : id),
      }, h('span', { className: 'pl-dot', style: { background: dot } }), label))),
    h('div', { className: 'pl-body' },
      visible.length === 0
        ? h('p', { className: 'pl-hint' }, 'Nenhuma paleta com esse filtro.')
        : h('div', { className: 'pl-grid' }, visible.map((p) => h(PaletteCard, {
          key: p.id, palette: p, selected: picked?.name === p.name && picked?.source !== 'custom', onSelect: (x) => pick(x), onCopy: copy,
        })))),
    h('div', { className: 'pl-panel' },
      h('div', { className: 'pl-section', style: { margin: 0 } }, picked ? 'Selecionada: ' + picked.name : 'Nenhuma paleta selecionada'),
      h('div', { className: 'pl-roles' }, ROLES.map(([role, label]) => {
        const value = drafts[role] ?? ''
        const hex = normalizeHex(value)
        return h('div', { key: role, className: 'pl-role' },
          h('label', null, label),
          h('input', { type: 'color', value: hex ?? '#000000', onChange: (e) => editRole(role, e.target.value) }),
          h('input', { type: 'text', value, placeholder: '#RRGGBB', className: value && !hex ? 'bad' : '', onChange: (e) => editRole(role, e.target.value) }))
      })),
      roles && h('div', { className: 'pl-previews' }, h(Preview, { roles, dark: false }), h(Preview, { roles, dark: true })),
      roles && h('div', { className: 'pl-aa', style: { color: ratio >= 4.5 ? '#22c55e' : '#f59e0b' } },
        'Contraste texto/fundo: ' + ratio.toFixed(2) + ':1 ' + (ratio >= 4.5 ? '(AA ok)' : '(abaixo de AA — o agente vai ajustar e avisar)')),
      h('div', { className: 'pl-actions' },
        h('button', { className: 'pl-btn primary', disabled: !request || !picked || invalid || busy, onClick: confirm }, busy ? 'Enviando…' : 'Usar esta paleta'),
        request && h('button', { className: 'pl-btn', onClick: cancel }, 'Cancelar pedido')),
      !request && h('div', { className: 'pl-hint' }, 'Quando o agente pedir a paleta, esta aba abre sozinha e o botão "Usar esta paleta" fica ativo.')),
    toast && h('div', { className: 'pl-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function PaletteIcon(size) {
  const h = React.createElement
  return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M8 1.8a6.2 6.2 0 1 0 0 12.4c.9 0 1.3-.6 1.3-1.2 0-.8-.7-1-.7-1.8 0-.7.6-1.2 1.3-1.2h1.4a2.9 2.9 0 0 0 2.9-2.9C14.2 4.3 11.4 1.8 8 1.8z' }),
    h('circle', { cx: 5, cy: 7, r: 0.9 }), h('circle', { cx: 7.6, cy: 4.6, r: 0.9 }), h('circle', { cx: 10.8, cy: 5.6, r: 0.9 }))
}

function apply(ctx) {
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return
      ctx.effect(() => betterSidebar.registerTab({
        id: TAB_ID,
        title: 'Paletas',
        order: 37,
        single: true,
        icon: (size) => PaletteIcon(size),
        component: (props) => React.createElement(PaletteView, props),
      }))

      // Opens the tab by itself when the model calls palette_pick: a new
      // request id means a new question for the person.
      ctx.effect(() => {
        let alive = true
        let timer = null
        let lastId = null
        const scope = () => {
          const sid = betterSidebar.getSnapshot?.()?.sessionId
          return typeof sid === 'string' && sid ? { sessionId: sid } : undefined
        }
        const tick = async () => {
          try {
            const r = await api('pending', {})
            if (alive && r?.ok) {
              const request = r.request ?? null
              if (request && request.id !== lastId) {
                try { betterSidebar.openTab({ type: TAB_ID, expand: true }, scope()) } catch { /* tab not registered yet */ }
              }
              lastId = request?.id ?? null
              setRequest(request)
            }
          } catch { /* host restarting: ask again next tick */ }
          if (alive) timer = setTimeout(tick, POLL_MS)
        }
        tick()
        return () => { alive = false; clearTimeout(timer) }
      })
    },
  })
}

  exports.apply = apply
  return module.exports
} })
