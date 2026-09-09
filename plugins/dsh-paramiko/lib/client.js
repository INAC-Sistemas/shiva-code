window.__ModuleLoader__.load({ id: 'dsh-paramiko', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-paramiko client half: a better-sidebar tab ("SSH") with three panels:
// status (Python + paramiko detection, one-click install with live job log),
// saved connections (add/test/delete VPS profiles), and a quick command run
// against any saved connection so the user can verify access without the agent.

const TAB_ID = 'dsh-paramiko:ssh'
const h = React.createElement

function api(method, payload) {
  return fetch('/paramiko/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'pko-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.pko-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.pko-scroll{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.pko-card{border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#26272e);padding:10px;display:flex;flex-direction:column;gap:8px}
.pko-title{font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px}
.pko-dim{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:12px}
.pko-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pko-badge{border:1px solid var(--dsw-alias-border-l3,#5a5b66);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf)}
.pko-badge.ok{border-color:var(--dsw-alias-state-success-primary,#2ea86e);color:var(--dsw-alias-state-success-primary,#3ddc97)}
.pko-badge.err{border-color:var(--dsw-alias-state-error-primary,#e0566b);color:var(--dsw-alias-state-error-primary,#ff7d92)}
.pko-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.pko-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.pko-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#fff);font-weight:600}
.pko-btn.danger{color:var(--dsw-alias-state-error-primary,#ff7d92)}
.pko-btn:disabled{opacity:.45;cursor:default}
.pko-input{background:var(--dsw-alias-bg-layer-2,#31323b);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit}
.pko-input:focus{border-color:var(--dsw-alias-brand-primary,#2563eb)}
.pko-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.pko-field label{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa4)}
.pko-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pko-conn{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:8px;flex-wrap:wrap}
.pko-name{font-weight:600;font-size:12.5px}
.pko-pre{margin:0;background:var(--dsw-alias-bg-layer-2,#31323b);border-radius:8px;padding:8px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto;font-family:ui-monospace,Consolas,monospace}
.pko-pre.tall{max-height:340px}
.pko-empty{color:var(--dsw-alias-label-dimmed,#77777f);font-size:12px;padding:6px 0}
.pko-form{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--dsw-alias-border-l2,#4a4b55);padding-top:8px}
`
  document.head.appendChild(el)
}

function StatusBadge({ ok, label }) {
  return h('span', { className: 'pko-badge ' + (ok ? 'ok' : 'err') }, (ok ? '✓ ' : '✗ ') + label)
}

function StatusCard({ status, onInstall, installing }) {
  const j = status.job ?? {}
  return h('div', { className: 'pko-card' },
    h('div', { className: 'pko-title' }, 'SSH (Paramiko)'),
    h('div', { className: 'pko-row' },
      h(StatusBadge, { ok: status.python?.found, label: status.python?.found ? `Python ${status.python.version}` : 'Python não encontrado' }),
      h(StatusBadge, { ok: status.paramiko?.installed, label: status.paramiko?.installed ? `paramiko ${status.paramiko.version}` : 'paramiko não instalado' }),
      h(StatusBadge, { ok: true, label: `venv: ${status.venv?.dir ?? '?'}` }),
    ),
    h('div', { className: 'pko-row' },
      h('button', {
        className: 'pko-btn primary',
        disabled: installing || status.paramiko?.installed,
        onClick: onInstall,
      }, status.paramiko?.installed ? 'Instalado ✓' : installing ? 'Instalando…' : 'Instalar paramiko (1 clique)'),
      h('span', { className: 'pko-dim' }, 'cria um venv dedicado em ~/.dsh/paramiko/venv — não toca no Python do sistema'),
    ),
    installing || j.phase === 'error' ? h('pre', { className: 'pko-pre' }, (j.log ?? []).join('\n') || j.step) : null,
  )
}

function ConnectionForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = React.useState({
    name: initial?.name ?? '',
    host: initial?.host ?? '',
    port: initial?.port ?? 22,
    username: initial?.username ?? '',
    keyPath: initial?.keyPath ?? '',
    password: '',
    useKey: !!initial?.keyPath,
  })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const save = async () => {
    setBusy(true); setError('')
    try {
      const r = await api('connections/save', {
        name: form.name, host: form.host, port: Number(form.port) || 22, username: form.username,
        password: form.password, keyPath: form.useKey ? form.keyPath : '',
      })
      if (!r.ok) setError(r.error || 'falha ao salvar')
      else onSaved()
    } finally { setBusy(false) }
  }
  return h('div', { className: 'pko-form' },
    h('div', { className: 'pko-grid' },
      h('div', { className: 'pko-field' }, h('label', null, 'Nome'), h('input', { className: 'pko-input', value: form.name, onChange: set('name'), placeholder: 'minha-vps' })),
      h('div', { className: 'pko-field' }, h('label', null, 'Host / IP'), h('input', { className: 'pko-input', value: form.host, onChange: set('host'), placeholder: '1.2.3.4' })),
      h('div', { className: 'pko-field' }, h('label', null, 'Porta'), h('input', { className: 'pko-input', value: form.port, onChange: set('port') })),
      h('div', { className: 'pko-field' }, h('label', null, 'Usuário'), h('input', { className: 'pko-input', value: form.username, onChange: set('username'), placeholder: 'root' })),
    ),
    h('div', { className: 'pko-row' },
      h('label', { className: 'pko-row', style: { gap: 4 } },
        h('input', { type: 'checkbox', checked: form.useKey, onChange: (e) => setForm((f) => ({ ...f, useKey: e.target.checked })) }),
        h('span', { className: 'pko-dim' }, 'autenticar por chave'),
      ),
    ),
    form.useKey
      ? h('div', { className: 'pko-field' }, h('label', null, 'Caminho da chave privada'), h('input', { className: 'pko-input', value: form.keyPath, onChange: set('keyPath'), placeholder: 'C:/Users/voce/.ssh/id_ed25519' }))
      : h('div', { className: 'pko-field' }, h('label', null, 'Senha (fica salva localmente; vazio = mantém a atual)'), h('input', { className: 'pko-input', type: 'password', value: form.password, onChange: set('password') })),
    error ? h('span', { className: 'pko-dim', style: { color: 'var(--dsw-alias-state-error-primary,#ff7d92)' } }, error) : null,
    h('div', { className: 'pko-row' },
      h('button', { className: 'pko-btn primary', disabled: busy, onClick: save }, 'Salvar conexão'),
      h('button', { className: 'pko-btn', onClick: onCancel }, 'Cancelar'),
    ),
  )
}

function ConnectionsCard({ connections, onChanged }) {
  const [adding, setAdding] = React.useState(false)
  const [editing, setEditing] = React.useState(null)
  const [testing, setTesting] = React.useState('')
  const [result, setResult] = React.useState({})
  const test = async (name) => {
    setTesting(name); setResult((r) => ({ ...r, [name]: null }))
    try {
      const r = await api('connections/test', { connection: name })
      setResult((r2) => ({ ...r2, [name]: r.ok ? r.message : (r.error || 'falhou') }))
    } finally { setTesting('') }
  }
  const del = async (name) => {
    await api('connections/delete', { name })
    onChanged()
  }
  return h('div', { className: 'pko-card' },
    h('div', { className: 'pko-row', style: { justifyContent: 'space-between' } },
      h('div', { className: 'pko-title' }, 'Conexões salvas'),
      h('button', { className: 'pko-btn', onClick: () => { setAdding((v) => !v); setEditing(null) } }, adding ? 'Fechar' : '+ Nova conexão'),
    ),
    !connections.length && !adding
      ? h('div', { className: 'pko-empty' }, 'Nenhuma conexão ainda. Adicione sua VPS (host, usuário e senha ou chave) — os agentes usam pelo nome.')
      : null,
    connections.map((c) => h('div', { className: 'pko-conn', key: c.name },
      h('span', { className: 'pko-name' }, c.name),
      h('span', { className: 'pko-dim' }, `${c.username}@${c.host}:${c.port}`),
      h('span', { className: 'pko-badge' }, c.auth === 'key' ? 'chave' : 'senha'),
      h('button', { className: 'pko-btn', disabled: testing === c.name, onClick: () => test(c.name) }, testing === c.name ? 'testando…' : 'Testar'),
      h('button', { className: 'pko-btn', onClick: () => { setEditing(c); setAdding(false) } }, 'Editar'),
      h('button', { className: 'pko-btn danger', onClick: () => del(c.name) }, 'Excluir'),
      result[c.name] ? h('div', { className: 'pko-dim', style: { width: '100%' } }, result[c.name]) : null,
    )),
    adding || editing
      ? h(ConnectionForm, { initial: editing, onSaved: () => { setAdding(false); setEditing(null); onChanged() }, onCancel: () => { setAdding(false); setEditing(null) } })
      : null,
  )
}

function QuickRunCard({ connections, paramikoReady }) {
  const [conn, setConn] = React.useState('')
  const [command, setCommand] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [out, setOut] = React.useState('')
  const run = async () => {
    if (!conn || !command.trim()) return
    setBusy(true); setOut('executando…')
    try {
      const r = await api('run', { connection: conn, command })
      setOut(r.ok
        ? `exit ${r.exit_code}\n${r.stdout || '(sem saída)'}${r.stderr ? '\n[stderr]\n' + r.stderr : ''}`
        : `erro: ${r.error}`)
    } catch (e) {
      setOut('erro: ' + e.message)
    } finally { setBusy(false) }
  }
  return h('div', { className: 'pko-card' },
    h('div', { className: 'pko-title' }, 'Testar comando'),
    !paramikoReady ? h('div', { className: 'pko-empty' }, 'instale o paramiko para executar comandos') : null,
    h('div', { className: 'pko-row' },
      h('select', { className: 'pko-input', value: conn, onChange: (e) => setConn(e.target.value) },
        h('option', { value: '' }, 'conexão…'),
        connections.map((c) => h('option', { value: c.name, key: c.name }, c.name)),
      ),
      h('input', {
        className: 'pko-input', style: { flex: 1, minWidth: 160 }, value: command,
        onChange: (e) => setCommand(e.target.value), placeholder: 'uname -a && uptime',
        onKeyDown: (e) => { if (e.key === 'Enter') run() },
      }),
      h('button', { className: 'pko-btn primary', disabled: busy || !conn || !command.trim() || !paramikoReady, onClick: run }, busy ? '…' : 'Rodar'),
    ),
    out ? h('pre', { className: 'pko-pre tall' }, out) : null,
  )
}

function SshView() {
  const [status, setStatus] = React.useState(null)
  const [connections, setConnections] = React.useState([])
  const [installing, setInstalling] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const [s, c] = await Promise.all([api('status'), api('connections/list')])
    if (s?.ok) setStatus(s)
    if (c?.ok) setConnections(c.connections ?? [])
    return s
  }, [])

  React.useEffect(() => {
    let alive = true
    let timer = null
    const tick = async () => {
      const s = await refresh().catch(() => null)
      if (!alive) return
      const stillInstalling = s?.job?.phase === 'installing'
      setInstalling(!!stillInstalling)
      timer = setTimeout(tick, stillInstalling ? 1500 : 8000)
    }
    void tick()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [refresh])

  const install = async () => {
    await api('install')
    setInstalling(true)
    void refresh()
  }

  if (!status) return h('div', { className: 'pko-root' }, h('div', { className: 'pko-empty' }, 'carregando…'))
  return h('div', { className: 'pko-root' },
    h('div', { className: 'pko-scroll' },
      h(StatusCard, { status, onInstall: install, installing }),
      h(ConnectionsCard, { connections, onChanged: () => void refresh() }),
      h(QuickRunCard, { connections, paramikoReady: status.paramiko?.installed }),
    ),
  )
}

function SshIcon(size) {
  return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none' },
    h('rect', { x: 1.5, y: 2.5, width: 13, height: 11, rx: 1.5, stroke: 'currentColor', strokeWidth: 1.3 }),
    h('path', { d: 'M4 6l2.5 2L4 10M7.5 10.5h4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
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
        title: 'SSH',
        order: 41,
        single: true,
        icon: (size) => SshIcon(size),
        component: (props) => React.createElement(SshView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
