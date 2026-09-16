window.__ModuleLoader__.load({ id: 'dsh-kanban', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-kanban client half: a better-sidebar board over the workspace's
// implementation tickets (mds/epics/<epic>/06-tickets/NN-<slug>.md). Each
// column is a status; moving a card rewrites that ticket's frontmatter through
// the host API. The board polls the filesystem, so edits agents make directly
// to the tickets show up without a reload.

const TAB_ID = 'dsh-kanban:board'

const STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'code_test', label: 'Code test' },
  { id: 'human_test', label: 'Human test' },
  { id: 'done', label: 'Done' },
]
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]))
const ADVANCE = { active: 'in_progress', in_progress: 'code_test', code_test: 'human_test', human_test: 'done' }
const POLL_MS = 4000

// The active session's scope, set by the view on every render from
// better-sidebar's TabComponentProps ({sessionId, cwd}) so every API call
// resolves the workspace the user is actually looking at.
let SCOPE = null

function api(method, payload) {
  return fetch('/kanban/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'kanban-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.kb-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.kb-bar{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.kb-title{font-weight:600;font-size:13px}
.kb-select{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 7px;font-size:12px;outline:none;font-family:inherit;max-width:200px}
.kb-spacer{flex:1}
.kb-count{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c7c88)}
.kb-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.kb-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.kb-btn:disabled{opacity:.45;cursor:default}
.kb-board{flex:1;display:flex;gap:10px;align-items:stretch;overflow-x:auto;overflow-y:hidden;padding:10px;min-height:0}
.kb-col{flex:0 0 240px;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1,#1f2026);border:1px solid var(--dsw-alias-border-l1,#33343d);border-radius:8px}
.kb-col-h{display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1,#33343d);flex:none}
.kb-col-dot{width:8px;height:8px;border-radius:50%;flex:none}
.kb-col-name{font-size:12px;font-weight:600;letter-spacing:.02em}
.kb-col-n{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-tertiary,#7c7c88)}
.kb-col-body{flex:1;overflow-y:auto;padding:7px;display:flex;flex-direction:column;gap:7px;min-height:0}
.kb-card{background:var(--dsw-alias-bg-layer-2,#282932);border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:7px;padding:8px 9px;display:flex;flex-direction:column;gap:6px}
.kb-card.busy{opacity:.6}
.kb-card-title{font-size:12.5px;line-height:1.4;cursor:pointer;word-break:break-word}
.kb-card-title:hover{color:var(--dsw-alias-brand-text,#93c5fd)}
.kb-card-meta{display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8a8a95);overflow:hidden}
.kb-epic{background:var(--dsw-alias-bg-layer-3,#33343f);border-radius:4px;padding:1px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
.kb-ticket{font-family:ui-monospace,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kb-card-actions{display:flex;align-items:center;gap:6px}
.kb-card-actions select{flex:1;background:var(--dsw-alias-bg-layer-1,#1f2026);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:2px 6px;font-size:11.5px;outline:none;font-family:inherit;min-width:0}
.kb-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#7c7c88);font-size:12px;padding:24px;text-align:center;line-height:1.7}
.kb-hint code{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--dsw-alias-bg-layer-2,#26272e);padding:1px 5px;border-radius:4px;color:var(--dsw-alias-label-primary,#e8e8ea)}
.kb-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:40px}
.kb-modal{width:min(760px,90vw);max-height:80vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#1c1d22);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:10px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.5)}
.kb-modal-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.kb-modal-path{flex:1;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary,#b6b6bf);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kb-modal-body{flex:1;overflow:auto;margin:0;padding:14px;font-size:12.5px;line-height:1.6;font-family:ui-monospace,"Cascadia Code",Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word}
.kb-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2100;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.kb-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function KanbanView(props) {
  const h = React.createElement
  SCOPE = props?.scope ? { sessionId: props.scope.sessionId, cwd: props.scope.cwd } : null
  const [status, setStatus] = React.useState(null) // { workspace, root, exists }
  const [cards, setCards] = React.useState(null)
  const [epic, setEpic] = React.useState('')
  const [selected, setSelected] = React.useState(null) // { file, content }
  const [busy, setBusy] = React.useState(null) // file being moved
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5200 : 2000)
  }, [])

  const loadStatus = React.useCallback(() => {
    api('status').then((r) => { if (r.ok) setStatus(r) }).catch(() => {})
  }, [])

  const loadList = React.useCallback(() => {
    api('list').then((r) => {
      if (!r.ok) return say(r.error || 'list failed', true)
      setCards(r.cards ?? [])
      setStatus((prev) => ({ ...(prev ?? {}), workspace: prev?.workspace ?? '', root: prev?.root ?? '', exists: r.exists }))
    }).catch((e) => say(String(e), true))
  }, [say])

  React.useEffect(() => {
    loadStatus(); loadList()
    const t = setInterval(loadList, POLL_MS)
    return () => clearInterval(t)
  }, [loadStatus, loadList])

  const move = React.useCallback(async (card, next) => {
    if (!next || next === card.status || busy) return
    if (next === 'done' && !window.confirm(`Mark "${card.title || card.ticket}" as Done?\n\nDone is the human's acceptance, not the agent's.`)) return
    setBusy(card.file)
    const r = await api('move', { file: card.file, status: next })
    setBusy(null)
    if (!r.ok) return say(r.error || 'move failed', true)
    setCards((prev) => (prev ?? []).map((c) => (c.file === card.file ? { ...c, status: next } : c)))
    say(`Moved to ${STATUS_LABEL[next] || next}`)
  }, [busy, say])

  const openPreview = React.useCallback(async (card) => {
    const r = await api('read', { file: card.file })
    if (!r.ok) return say(r.error || 'read failed', true)
    setSelected({ file: card.file, content: r.content })
  }, [say])

  const epics = React.useMemo(() => [...new Set((cards ?? []).map((c) => c.epic))].sort((a, b) => a.localeCompare(b)), [cards])
  const filtered = React.useMemo(() => (cards ?? []).filter((c) => !epic || c.epic === epic), [cards, epic])

  const columns = React.useMemo(() => {
    const cols = STATUSES.map((s) => ({ ...s, cards: [] }))
    const byId = new Map(cols.map((c) => [c.id, c]))
    const other = { id: 'other', label: 'Other', cards: [] }
    for (const card of filtered) (byId.get(card.status) || other).cards.push(card)
    return other.cards.length ? [...cols, other] : cols
  }, [filtered])

  const renderCard = (card) => {
    const busyHere = busy === card.file
    const next = ADVANCE[card.status]
    const options = STATUSES.slice()
    if (card.status && !STATUS_LABEL[card.status]) options.unshift({ id: card.status, label: card.status })
    return h('div', { key: card.file, className: 'kb-card' + (busyHere ? ' busy' : '') },
      h('div', { className: 'kb-card-title', title: 'Preview ticket', onClick: () => openPreview(card) }, card.title || card.ticket),
      h('div', { className: 'kb-card-meta' },
        h('span', { className: 'kb-epic', title: card.epic }, card.epic),
        h('span', { className: 'kb-ticket', title: card.name }, card.ticket)),
      h('div', { className: 'kb-card-actions' },
        h('select', {
          value: card.status || '', disabled: busyHere, title: 'Set status',
          onChange: (e) => move(card, e.target.value),
        },
          card.status ? null : h('option', { value: '', disabled: true }, '(no status)'),
          options.map((s) => h('option', { key: s.id, value: s.id }, s.label))),
        next ? h('button', {
          className: 'kb-btn', disabled: busyHere, title: `Advance to ${STATUS_LABEL[next]}`,
          onClick: () => move(card, next),
        }, '→') : null),
    )
  }

  if (!status) {
    return h('div', { className: 'kb-root' },
      h('div', { className: 'kb-hint' }, 'Loading…'),
      toast && h('div', { className: 'kb-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  if (!status.exists) {
    return h('div', { className: 'kb-root' },
      h('div', { className: 'kb-hint' },
        h('div', null, 'This workspace has no ', h('code', null, 'mds/'), ' folder yet.',
          h('br'), 'Tickets appear here once ', h('code', null, '06-tickets'), ' writes ', h('code', null, 'mds/epics/<epic>/06-tickets/*.md'), '.')),
      toast && h('div', { className: 'kb-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  return h('div', { className: 'kb-root' },
    h('div', { className: 'kb-bar' },
      h('span', { className: 'kb-title' }, 'Kanban'),
      epics.length > 1
        ? h('select', { className: 'kb-select', value: epic, onChange: (e) => setEpic(e.target.value), title: 'Filter by epic' },
          h('option', { value: '' }, 'All epics'),
          epics.map((e) => h('option', { key: e, value: e }, e)))
        : null,
      h('span', { className: 'kb-spacer' }),
      h('span', { className: 'kb-count' }, `${filtered.length} ticket${filtered.length === 1 ? '' : 's'}`),
      h('button', { className: 'kb-btn', title: 'Reload', onClick: loadList }, '⟳')),
    cards && cards.length === 0
      ? h('div', { className: 'kb-hint' },
        h('div', null, 'No tickets yet.', h('br'), 'They live under ', h('code', null, 'mds/epics/<epic>/06-tickets/'), ' (skill /06-tickets).'))
      : h('div', { className: 'kb-board' },
        columns.map((col) => h('div', { key: col.id, className: 'kb-col' },
          h('div', { className: 'kb-col-h' },
            h('span', { className: 'kb-col-dot', style: { background: col.id === 'done' ? '#16a34a' : col.id === 'human_test' ? '#7c3aed' : col.id === 'code_test' ? '#d97706' : col.id === 'in_progress' ? '#2563eb' : col.id === 'active' ? '#6b7280' : '#ef4444' } }),
            h('span', { className: 'kb-col-name' }, col.label),
            h('span', { className: 'kb-col-n' }, String(col.cards.length))),
          h('div', { className: 'kb-col-body' },
            col.cards.length === 0 ? null : col.cards.map(renderCard))))),
    selected && h('div', { className: 'kb-overlay', onClick: () => setSelected(null) },
      h('div', { className: 'kb-modal', onClick: (e) => e.stopPropagation() },
        h('div', { className: 'kb-modal-bar' },
          h('span', { className: 'kb-modal-path', title: selected.file }, selected.file),
          h('button', { className: 'kb-btn', onClick: () => setSelected(null) }, 'Close')),
        h('pre', { className: 'kb-modal-body' }, selected.content))),
    toast && h('div', { className: 'kb-toast' + (toast.err ? ' err' : '') }, toast.msg),
  )
}

function KanbanIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: 1.5, y: 2, width: 3.6, height: 12, rx: 1 }),
    React.createElement('rect', { x: 6.2, y: 2, width: 3.6, height: 8, rx: 1 }),
    React.createElement('rect', { x: 10.9, y: 2, width: 3.6, height: 10, rx: 1 }),
  )
}

function apply(ctx) {
  injectStyles()
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return
      ctx.effect(() => betterSidebar.registerTab({
        id: TAB_ID,
        title: 'Kanban',
        order: 39,
        single: true,
        icon: (size) => KanbanIcon(size),
        component: (props) => React.createElement(KanbanView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
