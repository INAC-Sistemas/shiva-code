window.__ModuleLoader__.load({ id: 'dsh-kanban', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-kanban client half: five status columns over the workspace's ticket
// files. Moving a card rewrites the ticket's frontmatter status line through
// the plugin API — the file stays the single source of truth.

const TAB_ID = 'dsh-kanban:board'
const STATUSES = ['active', 'in_progress', 'code_test', 'human_test', 'done']
const LABELS = { active: 'Active', in_progress: 'In progress', code_test: 'Code + test', human_test: 'Human test', done: 'Done' }

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
.kb-bar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.kb-bar .ttl{font-weight:600;font-size:13px}
.kb-bar .sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa5)}
.kb-btn{background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit}
.kb-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.kb-board{flex:1;display:flex;gap:8px;padding:8px;overflow-x:auto;min-height:0}
.kb-col{flex:1;min-width:118px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.03));border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:8px;min-height:0}
.kb-col-head{padding:6px 8px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#9a9aa5);border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44)}
.kb-col-body{flex:1;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:6px;min-height:40px}
.kb-card{background:var(--dsw-alias-bg-layer-2,#26272e);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:7px;padding:6px 7px;font-size:11.5px;line-height:1.4}
.kb-card .t{font-weight:600;margin-bottom:2px;word-break:break-word}
.kb-card .m{display:flex;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary,#7c7c88);font-size:10px}
.kb-card .mv{margin-left:auto;display:flex;gap:2px}
.kb-card .mv button{background:transparent;border:none;color:var(--dsw-alias-label-secondary,#9a9aa5);cursor:pointer;font-size:11px;padding:0 3px;border-radius:3px}
.kb-card .mv button:hover{color:var(--dsw-alias-label-primary,#e8e8ea);background:var(--dsw-alias-bg-layer-3,#3a3b46)}
.kb-empty{padding:6px 4px;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6f707c);text-align:center}
.kb-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#9a9aa5);font-size:12px;padding:24px;text-align:center;line-height:1.7}
.kb-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
`
  document.head.appendChild(el)
}

function Board(props) {
  const h = React.createElement
  SCOPE = props?.scope ? { sessionId: props.scope.sessionId, cwd: props.scope.cwd } : null
  const [board, setBoard] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)

  const say = React.useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const load = React.useCallback(() => {
    api('board').then((r) => { if (r.ok) setBoard(r) }).catch(() => {})
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [load])

  const move = async (ticket, dir) => {
    const idx = STATUSES.indexOf(ticket.status)
    const next = STATUSES[idx + dir]
    if (!next || busy) return
    setBusy(true)
    const r = await api('move', { path: ticket.path, status: next })
    setBusy(false)
    if (!r.ok) return say(r.error || 'move failed')
    say(`${ticket.file} → ${LABELS[next]}`)
    load()
  }

  if (board && !board.mdsExists) {
    return h('div', { className: 'kb-root' },
      h('div', { className: 'kb-hint' },
        h('div', null,
          'No ', h('code', null, 'mds/'), ' workspace folder yet.', h('br'),
          'Create it from the MDS tab, then run ', h('code', null, '/01-epic-brief'), ' and ', h('code', null, '/06-tickets'), ' — tickets land here automatically.')))
  }

  const total = board ? board.epics.reduce((n, e) => n + e.tickets.length, 0) : 0

  return h('div', { className: 'kb-root' },
    h('div', { className: 'kb-bar' },
      h('span', { className: 'ttl' }, 'Kanban'),
      h('span', { className: 'sub' }, total ? `${total} ticket${total > 1 ? 's' : ''}` : ''),
      h('span', { style: { flex: 1 } }),
      h('button', { className: 'kb-btn', onClick: load, title: 'Reload' }, '⟳')),
    h('div', { className: 'kb-board' },
      board === null && h('div', { className: 'kb-hint' }, 'Loading…'),
      board !== null && total === 0 && h('div', { className: 'kb-hint' },
        h('div', null,
          'No tickets yet.', h('br'),
          'Run ', h('code', null, '/06-tickets'), ' after ', h('code', null, '/04-tech-plan'), ' — tickets are .md files under ', h('code', null, 'mds/epics/<epic>/06-tickets/'), '.')),
      board !== null && STATUSES.map((st) => {
        const cards = []
        for (const epic of board.epics) {
          for (const t of epic.tickets) {
            if (t.status === st) cards.push({ ...t, epicName: epic.name })
          }
        }
        return h('div', { className: 'kb-col', key: st },
          h('div', { className: 'kb-col-head' }, `${LABELS[st]} (${cards.length})`),
          h('div', { className: 'kb-col-body' },
            cards.length === 0 && h('div', { className: 'kb-empty' }, '—'),
            cards.map((t) => {
              const idx = STATUSES.indexOf(st)
              return h('div', { className: 'kb-card', key: t.path, title: t.path },
                h('div', { className: 't' }, t.title),
                h('div', { className: 'm' },
                  h('span', null, t.epicName + '/' + t.file.replace(/\.md$/i, '')),
                  h('span', { className: 'mv' },
                    idx > 0 && h('button', { title: 'Move back', onClick: () => move(t, -1) }, '←'),
                    idx < STATUSES.length - 1 && idx < 4 && h('button', { title: 'Advance', onClick: () => move(t, 1) }, '→'))))
            })))
      })),
    toast && h('div', { className: 'kb-toast' }, toast))
}

function KanbanIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: '1.5', y: '2.5', width: '13', height: '11', rx: '1.5' }),
    React.createElement('path', { d: 'M5.5 5v6M10.5 5v4' }),
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
        order: 36,
        single: true,
        icon: (size) => KanbanIcon(size),
        component: (props) => React.createElement(Board, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
