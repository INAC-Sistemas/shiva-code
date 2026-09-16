window.__ModuleLoader__.load({ id: 'dsh-sidebar', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports

// dsh-sidebar client half: owns the better-sidebar service calls for the agent's
// `sidebar` tool. It registers no tab — it lists, focuses, closes and opens the
// session's tabs on request.

function api(method, payload) {
  return fetch('/sidebar-agent/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

// Walk a split tree (right sidebar and bottom panel) collecting open tabs.
function collectTabs(node, out) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node.tabs)) {
    for (const t of node.tabs) {
      out.push({ id: t.id, type: t.type, title: t.title, path: t.path ?? null, active: node.active === t.id })
    }
  }
  if (Array.isArray(node.children)) for (const c of node.children) collectTabs(c, out)
}

function apply(ctx) {
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar) return
      const scope = () => {
        const sid = betterSidebar.getSnapshot?.()?.sessionId
        return typeof sid === 'string' && sid ? { sessionId: sid } : undefined
      }
      ctx.effect(() => {
        let alive = true
        let timer = null
        const tick = async () => {
          try {
            const r = await api('pending', {})
            const cmd = r?.cmd
            if (alive && cmd) {
              try {
                if (cmd.op === 'list') {
                  const snap = betterSidebar.getSnapshot?.() ?? {}
                  const tabs = []
                  collectTabs(snap.state?.splits, tabs)
                  collectTabs(snap.state?.bottomSplits, tabs)
                  const available = (typeof betterSidebar.getTabs === 'function' ? betterSidebar.getTabs() : []).map((d) => ({
                    id: d.id,
                    title: typeof d.title === 'function' ? d.title() : d.title,
                    hidden: !!d.hidden,
                  }))
                  await api('result', { id: cmd.id, ok: true, data: { sessionId: snap.sessionId ?? null, tabs, available } })
                } else if (cmd.op === 'focus') {
                  betterSidebar.activateTab(String(cmd.tab ?? ''), scope())
                  await api('result', { id: cmd.id, ok: true, data: { focused: cmd.tab } })
                } else if (cmd.op === 'close') {
                  betterSidebar.closeTab(String(cmd.tab ?? ''), scope())
                  await api('result', { id: cmd.id, ok: true, data: { closed: cmd.tab } })
                } else if (cmd.op === 'open') {
                  const seed = { type: String(cmd.type ?? '') }
                  if (typeof cmd.url === 'string' && cmd.url) seed.url = cmd.url
                  betterSidebar.openTab(seed, scope())
                  await api('result', { id: cmd.id, ok: true, data: { opened: cmd.type } })
                } else {
                  await api('result', { id: cmd.id, ok: false, error: `op desconhecida "${cmd.op}"` })
                }
              } catch (e) {
                await api('result', { id: cmd.id, ok: false, error: String((e && e.message) || e) })
              }
            }
          } catch { /* offline */ }
          if (alive) timer = setTimeout(tick, 600)
        }
        tick()
        return () => { alive = false; if (timer) clearTimeout(timer) }
      }, 'dsh-sidebar: command poll')
    },
  })
}

  exports.apply = apply
  return module.exports
} })
