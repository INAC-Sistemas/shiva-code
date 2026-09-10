window.__ModuleLoader__.load({ id: 'dsh-web-search', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-web-search client half: a better-sidebar tab ("Busca") wired to the
// plugin's keyless DuckDuckGo backend — lets the user (and the user testing
// the agents' web_search provider) run a query and see the normalized results.

const TAB_ID = 'dsh-web-search:search'
const h = React.createElement

function api(method, payload) {
  return fetch('/web-search/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'wsr-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.wsr-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.wsr-bar{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none}
.wsr-bar input{flex:1;background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:5px 9px;font-size:12.5px;outline:none;font-family:inherit}
.wsr-bar input:focus{border-color:var(--dsw-alias-brand-primary,#2563eb)}
.wsr-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-brand-primary,#2563eb);color:var(--dsw-alias-brand-primary-invert,#fff);border:1px solid transparent;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:600;font-family:inherit}
.wsr-btn:disabled{opacity:.45;cursor:default}
.wsr-note{padding:4px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:11.5px;flex:none}
.wsr-list{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:10px}
.wsr-item{display:flex;flex-direction:column;gap:2px}
.wsr-title{color:var(--dsw-alias-state-business-primary,#6ea8ff);font-size:13px;font-weight:500;text-decoration:none;word-break:break-word}
.wsr-title:hover{text-decoration:underline}
.wsr-url{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:11px;word-break:break-all}
.wsr-snippet{color:var(--dsw-alias-label-secondary,#b6b6bf);font-size:12px;line-height:1.5}
.wsr-empty{color:var(--dsw-alias-label-dimmed,#77777f);font-size:12px;padding:10px 2px}
.wsr-error{color:var(--dsw-alias-state-error-primary,#ff7d92);font-size:12px;padding:10px 2px;white-space:pre-wrap}
`
  document.head.appendChild(el)
}

function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function SearchView() {
  const [query, setQuery] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [results, setResults] = React.useState(null)
  const [took, setTook] = React.useState(null)

  const run = React.useCallback(async (q) => {
    const text = String(q ?? '').trim()
    if (!text || busy) return
    setBusy(true); setError(''); setResults(null)
    const t0 = Date.now()
    try {
      const r = await api('search', { query: text, maxResults: 12 })
      if (r.ok) { setResults(r.sources ?? []); setTook(Date.now() - t0) }
      else setError(r.error || 'busca falhou')
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }, [busy])

  React.useEffect(() => {
    void api('status')
  }, [])

  return h('div', { className: 'wsr-root' },
    h('div', { className: 'wsr-bar' },
      h('input', {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => { if (e.key === 'Enter') run(query) },
        placeholder: 'pesquisar na web (DuckDuckGo, sem chave de API)…',
        autoFocus: true,
      }),
      h('button', { className: 'wsr-btn', disabled: busy || !query.trim(), onClick: () => run(query) }, busy ? 'buscando…' : 'Buscar'),
    ),
    h('div', { className: 'wsr-note' }, 'provider "ddg" — o mesmo backend que os agentes usam na tool web_search nativa'),
    h('div', { className: 'wsr-list' },
      error ? h('div', { className: 'wsr-error' }, error) : null,
      results
        ? (results.length
            ? results.map((r, i) => h('div', { className: 'wsr-item', key: i },
                h('a', { className: 'wsr-title', href: r.url, target: '_blank', rel: 'noreferrer' }, r.title || r.url),
                h('span', { className: 'wsr-url' }, hostnameOf(r.url) + ' — ' + r.url),
                r.snippet ? h('span', { className: 'wsr-snippet' }, r.snippet) : null,
              ))
            : h('div', { className: 'wsr-empty' }, 'sem resultados'))
        : (!error && !busy ? h('div', { className: 'wsr-empty' }, 'digite uma consulta e pressione Enter') : null),
      busy ? h('div', { className: 'wsr-empty' }, 'buscando…') : null,
      results && took !== null ? h('div', { className: 'wsr-empty' }, `${results.length} resultados em ${(took / 1000).toFixed(1)}s`) : null,
    ),
  )
}

function SearchIcon(size) {
  return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none' },
    h('circle', { cx: 7, cy: 7, r: 4.5, stroke: 'currentColor', strokeWidth: 1.3 }),
    h('path', { d: 'M10.5 10.5L14 14', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }))
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
        title: 'Busca',
        order: 42,
        single: true,
        icon: (size) => SearchIcon(size),
        component: (props) => React.createElement(SearchView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
