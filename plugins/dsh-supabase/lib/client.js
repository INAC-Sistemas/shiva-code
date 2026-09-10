window.__ModuleLoader__.load({ id: 'dsh-supabase', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// Generic CLI-provider client half: one sidebar tab showing this workspace's
// connection to the provider (CLI install, login, project link, live status,
// actions and recent activity). Shared by dsh-github / dsh-supabase /
// dsh-railway / dsh-vercel; the provider identity is stamped below.

const PROVIDER = {"id":"supabase","title":"Supabase","order":44,"cli":"supabase"}
const TAB_ID = `dsh-supabase:tab`
const h = React.createElement

function api(method, payload) {
  return fetch(`/${PROVIDER.id}/api/` + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'cp-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.cp-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.cp-scroll{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.cp-card{border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#26272e);padding:10px;display:flex;flex-direction:column;gap:8px}
.cp-head{display:flex;align-items:center;gap:8px}
.cp-title{font-weight:600;font-size:13px;flex:1}
.cp-dot{width:9px;height:9px;border-radius:999px;flex:none;background:#777}
.cp-dot.ok{background:var(--dsw-alias-state-success-primary,#3ddc97)}
.cp-dot.warn{background:var(--dsw-alias-state-warn-label,#e8b84b)}
.cp-dot.off{background:var(--dsw-alias-label-dimmed,#77777f)}
.cp-badge{border:1px solid var(--dsw-alias-border-l3,#5a5b66);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf);white-space:nowrap}
.cp-badge.ok{border-color:var(--dsw-alias-state-success-primary,#2ea86e);color:var(--dsw-alias-state-success-primary,#3ddc97)}
.cp-dim{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:12px}
.cp-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.cp-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.cp-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.cp-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#fff);font-weight:600}
.cp-btn.danger{color:var(--dsw-alias-state-error-primary,#ff7d92)}
.cp-btn:disabled{opacity:.45;cursor:default}
.cp-input{background:var(--dsw-alias-bg-layer-2,#31323b);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit;flex:1;min-width:0}
.cp-item{display:flex;align-items:baseline;gap:8px;padding:3px 0}
.cp-item .k{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:12px;flex:none;min-width:90px}
.cp-item .v{color:var(--dsw-alias-label-primary,#e8e8ea);font-size:12.5px;word-break:break-word}
.cp-item .v.err{color:var(--dsw-alias-state-error-primary,#ff7d92)}
.cp-item .v.warn{color:var(--dsw-alias-state-warn-label,#e8b84b)}
.cp-link{color:var(--dsw-alias-state-business-primary,#6ea8ff);text-decoration:none;word-break:break-all;cursor:pointer}
.cp-link:hover{text-decoration:underline}
.cp-pre{margin:0;background:var(--dsw-alias-bg-layer-2,#31323b);border-radius:8px;padding:8px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow-y:auto;font-family:ui-monospace,Consolas,monospace}
.cp-code{font-family:ui-monospace,Consolas,monospace;background:var(--dsw-alias-bg-layer-3,#3a3b44);border-radius:6px;padding:2px 8px;font-size:14px;letter-spacing:1px}
.cp-act{display:flex;flex-direction:column;gap:2px}
.cp-act-title{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:11px;text-transform:uppercase;letter-spacing:.4px}
`
  document.head.appendChild(el)
}

function Panel(props) {
  const cwd = props?.cwd
  const [status, setStatus] = React.useState(null)
  const [busy, setBusy] = React.useState('')
  const [login, setLogin] = React.useState(null)
  const [token, setToken] = React.useState('')
  const [showToken, setShowToken] = React.useState(false)
  const [loginInput, setLoginInput] = React.useState('')
  const [msg, setMsg] = React.useState('')

  const refresh = React.useCallback(async () => {
    const s = await api('status', { cwd }).catch(() => null)
    if (s) setStatus(s)
    return s
  }, [cwd])

  React.useEffect(() => {
    let alive = true
    let timer = null
    const tick = async () => {
      const s = await refresh().catch(() => null)
      if (!alive) return
      const active = s?.job?.phase === 'installing' || (login && !s?.auth?.loggedIn)
      timer = setTimeout(tick, active ? 3000 : 10000)
    }
    void tick()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [refresh, login])

  const doInstall = async () => {
    setBusy('install'); setMsg('')
    await api('install', { cwd })
    setBusy('')
    void refresh()
  }
  const doLogin = async () => {
    setBusy('login'); setMsg('')
    const r = await api('login', { cwd })
    setBusy('')
    if (r.ok && (r.url || r.code)) { setLogin(r); if (r.url) window.open(r.url, '_blank') }
    else if (r.ok && r.token) { setLogin(null); void refresh() }
    else setMsg(r.error || 'falha ao iniciar o login')
    void refresh()
  }
  const doToken = async () => {
    if (!token.trim()) return
    setBusy('token'); setMsg('')
    const r = await api('login', { cwd, token: token.trim() })
    setBusy(''); setToken('')
    if (!r.ok) setMsg(r.error || 'token inválido')
    void refresh()
  }
  const doLogout = async () => { setBusy('logout'); await api('logout', { cwd }); setBusy(''); setLogin(null); void refresh() }
  const sendLoginInput = async () => {
    await api('login/input', { cwd, text: loginInput || '\r' })
    setLoginInput('')
    void refresh()
  }
  const doAction = async (a) => {
    if (a.confirm && !window.confirm(a.confirm)) return
    setBusy(a.id); setMsg('')
    const r = await api('action', { cwd, name: a.id })
    setBusy('')
    if (r.open) window.open(r.open, '_blank')
    else if (r.output) setMsg(r.output.slice(0, 1200))
    void refresh()
  }

  if (!status) return h('div', { className: 'cp-root' }, h('div', { className: 'cp-dim', style: { padding: 10 } }, 'carregando…'))

  const cli = status.cli ?? {}
  const auth = status.auth ?? {}
  const ws = status.workspace ?? {}
  const dotClass = cli.installed && auth.loggedIn ? 'ok' : cli.installed ? 'warn' : 'off'
  const j = status.job ?? {}

  return h('div', { className: 'cp-root' },
    h('div', { className: 'cp-scroll' },

      h('div', { className: 'cp-card' },
        h('div', { className: 'cp-head' },
          h('span', { className: 'cp-dot ' + dotClass }),
          h('span', { className: 'cp-title' }, status.title || PROVIDER.title),
          h('span', { className: 'cp-badge ' + (cli.installed ? 'ok' : '') }, cli.installed ? `${PROVIDER.cli} ${cli.version}` : 'CLI ausente'),
          auth.loggedIn ? h('span', { className: 'cp-badge ok' }, auth.account ? `@${auth.account}` : 'conectado') : null,
        ),
        !cli.installed
          ? h('div', { className: 'cp-row' },
              h('button', { className: 'cp-btn primary', disabled: busy === 'install' || j.phase === 'installing', onClick: doInstall },
                j.phase === 'installing' ? 'instalando…' : busy === 'install' ? '…' : `Instalar ${PROVIDER.cli}`),
              h('span', { className: 'cp-dim' }, 'instala a CLI nesta máquina'),
            )
          : (!auth.loggedIn
            ? h('div', { className: 'cp-row' },
                h('button', { className: 'cp-btn primary', disabled: busy === 'login', onClick: doLogin }, busy === 'login' ? 'abrindo…' : 'Conectar'),
                h('button', { className: 'cp-btn', onClick: () => setShowToken((v) => !v) }, showToken ? 'Usar navegador' : 'Usar token'),
              )
            : h('div', { className: 'cp-row' },
                h('button', { className: 'cp-btn', disabled: busy === 'logout', onClick: doLogout }, 'Desconectar'),
                ws.linked && ws.url ? h('a', { className: 'cp-link', href: ws.url, target: '_blank', rel: 'noreferrer' }, 'abrir painel ↗') : null,
              )),
        showToken && !auth.loggedIn
          ? h('div', { className: 'cp-row' },
              h('input', { className: 'cp-input', type: 'password', value: token, placeholder: 'cole o token de acesso…', onChange: (e) => setToken(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') doToken() } }),
              h('button', { className: 'cp-btn', disabled: busy === 'token' || !token.trim(), onClick: doToken }, 'Salvar'),
            )
          : null,
        (() => {
          const li = status.login ?? login
          if (auth.loggedIn || !li || (!li.active && !li.url && !li.code)) return null
          return h('div', { className: 'cp-card', style: { background: 'var(--dsw-alias-bg-layer-2,#31323b)' } },
            h('div', { className: 'cp-dim' }, li.url ? 'Autorize no navegador:' : 'Interação com a CLI:'),
            li.code ? h('div', { className: 'cp-row' }, h('span', { className: 'cp-dim' }, 'código:'), h('span', { className: 'cp-code' }, li.code)) : null,
            li.url ? h('a', { className: 'cp-link', href: li.url, target: '_blank', rel: 'noreferrer' }, li.url) : null,
            h('div', { className: 'cp-row' },
              li.url ? h('button', { className: 'cp-btn primary', onClick: () => window.open(li.url, '_blank') }, 'Abrir navegador') : null,
              h('button', { className: 'cp-btn', onClick: () => { setLogin(null); void refresh() } }, 'Já autorizei'),
            ),
            li.tail ? h('pre', { className: 'cp-pre' }, li.tail) : null,
            li.exit
              ? h('pre', { className: 'cp-pre' }, `login encerrou (exit ${li.exit.code})\n${li.exit.out ?? ''}`)
              : h('div', { className: 'cp-row' },
                  h('input', { className: 'cp-input', value: loginInput, placeholder: 'cole aqui o código de verificação…', onChange: (e) => setLoginInput(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') sendLoginInput() } }),
                  h('button', { className: 'cp-btn primary', onClick: sendLoginInput }, 'Enviar'),
                ),
          )
        })(),
        j.phase === 'installing' || j.phase === 'error'
          ? h('pre', { className: 'cp-pre' }, (j.log ?? []).join('\n') || j.kind)
          : null,
      ),

      ws.linked
        ? h('div', { className: 'cp-card' },
            h('div', { className: 'cp-act-title' }, 'Projeto deste workspace'),
            h('div', { className: 'cp-row' },
              h('span', { className: 'cp-title', style: { flex: 'none' } }, ws.name || 'vinculado'),
              ws.url ? h('a', { className: 'cp-link', href: ws.url, target: '_blank', rel: 'noreferrer' }, ws.url) : null,
            ),
            (ws.details ?? []).map((d, i) => h('div', { className: 'cp-item', key: i }, h('span', { className: 'k' }, d.label), h('span', { className: 'v' }, d.value))),
          )
        : h('div', { className: 'cp-card' },
            h('div', { className: 'cp-act-title' }, 'Projeto deste workspace'),
            h('div', { className: 'cp-dim' }, `nenhum vínculo detectado em ${ws.root || cwd || ''}`),
          ),

      (status.status ?? []).length
        ? h('div', { className: 'cp-card' },
            h('div', { className: 'cp-act-title' }, 'Status'),
            (status.status ?? []).map((s, i) => h('div', { className: 'cp-item', key: i },
              h('span', { className: 'k' }, s.label),
              h('span', { className: 'v' + (s.tone === 'err' ? ' err' : s.tone === 'warn' ? ' warn' : '') }, String(s.value)),
            )),
          )
        : null,

      (status.actions ?? []).length
        ? h('div', { className: 'cp-card' },
            h('div', { className: 'cp-act-title' }, 'Ações'),
            h('div', { className: 'cp-row' },
              (status.actions ?? []).map((a) => h('button', {
                key: a.id,
                className: 'cp-btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''),
                disabled: busy === a.id,
                onClick: () => doAction(a),
              }, busy === a.id ? '…' : a.label)),
            ),
          )
        : null,

      msg ? h('pre', { className: 'cp-pre' }, msg) : null,

      (status.activity ?? []).length
        ? h('div', { className: 'cp-card' },
            h('div', { className: 'cp-act-title' }, 'Atividade recente'),
            (status.activity ?? []).map((a, i) => h('div', { className: 'cp-item', key: i },
              h('span', { className: 'v' }, a.url ? h('a', { className: 'cp-link', href: a.url, target: '_blank', rel: 'noreferrer' }, a.label) : a.label),
              a.detail ? h('span', { className: 'cp-dim' }, a.detail) : null,
            )),
          )
        : null,
    ),
  )
}

function Icon(size) {
  return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none' },
    h('path', { d: 'M8 1.5l5 3v7l-5 3-5-3v-7l5-3z', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }),
    h('circle', { cx: 8, cy: 8, r: 1.6, fill: 'currentColor' }))
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
        title: PROVIDER.title,
        order: PROVIDER.order,
        single: true,
        icon: (size) => Icon(size),
        component: (props) => React.createElement(Panel, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
