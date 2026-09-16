window.__ModuleLoader__.load({ id: 'dsh-mcp', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-mcp client half: a better-sidebar tab ("MCP") that lists the saved MCP
// servers with their live state and tool count, and adds, edits, enables,
// reconnects, deletes or imports them through /mcp/api. Stored env and header
// values never reach the browser; the API sends a mask that saving keeps.

const TAB_ID = 'dsh-mcp:servers'
const SECRET_MASK = '••••••••'
const POLL_MS = 3000
const h = React.createElement

function api(method, payload) {
  return fetch('/mcp/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'dmcp-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.dmcp-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.dmcp-scroll{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.dmcp-card{border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#26272e);padding:10px;display:flex;flex-direction:column;gap:8px}
.dmcp-title{font-weight:600;font-size:13px}
.dmcp-dim{color:var(--dsw-alias-label-tertiary,#9a9aa4);font-size:12px}
.dmcp-error{color:var(--dsw-alias-state-error-primary,#ff7d92);font-size:12px;white-space:pre-wrap;word-break:break-word}
.dmcp-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dmcp-badge{border:1px solid var(--dsw-alias-border-l3,#5a5b66);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-label-secondary,#b6b6bf)}
.dmcp-badge.ok{border-color:var(--dsw-alias-state-success-primary,#2ea86e);color:var(--dsw-alias-state-success-primary,#3ddc97)}
.dmcp-badge.err{border-color:var(--dsw-alias-state-error-primary,#e0566b);color:var(--dsw-alias-state-error-primary,#ff7d92)}
.dmcp-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.dmcp-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.dmcp-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#fff);font-weight:600}
.dmcp-btn.danger{color:var(--dsw-alias-state-error-primary,#ff7d92)}
.dmcp-btn:disabled{opacity:.45;cursor:default}
.dmcp-input{background:var(--dsw-alias-bg-layer-2,#31323b);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit;min-width:0}
.dmcp-input:focus{border-color:var(--dsw-alias-brand-primary,#2563eb)}
.dmcp-mono{font-family:ui-monospace,Consolas,monospace}
.dmcp-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.dmcp-field label{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa4)}
.dmcp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dmcp-server{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--dsw-alias-border-l1,#3a3b44);border-radius:8px}
.dmcp-name{font-weight:600;font-size:12.5px}
.dmcp-kv{display:grid;grid-template-columns:1fr 1fr auto;gap:6px}
.dmcp-empty{color:var(--dsw-alias-label-dimmed,#77777f);font-size:12px;padding:6px 0}
.dmcp-form{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--dsw-alias-border-l2,#4a4b55);padding-top:8px}
`
  document.head.appendChild(el)
}

const STATE_LABELS = {
  connected: ['ok', 'conectado'],
  connecting: ['', 'conectando…'],
  error: ['err', 'erro'],
  disabled: ['', 'desativado'],
  stopped: ['', 'parado'],
}

function toRows(record) {
  return Object.entries(record ?? {}).map(([key, value]) => ({ key, value, stored: value === SECRET_MASK }))
}

function fromRows(rows) {
  return Object.fromEntries(rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]))
}

function KeyValueEditor({ label, rows, onChange, keyPlaceholder }) {
  const update = (index, field) => (e) => onChange(rows.map((row, i) => (i === index ? { ...row, [field]: e.target.value } : row)))
  return h('div', { className: 'dmcp-field' },
    h('label', null, label),
    rows.map((row, index) => h('div', { className: 'dmcp-kv', key: index },
      h('input', { className: 'dmcp-input dmcp-mono', value: row.key, onChange: update(index, 'key'), placeholder: keyPlaceholder }),
      h('input', {
        className: 'dmcp-input dmcp-mono', type: 'password', value: row.value, onChange: update(index, 'value'),
        // Focusing a stored value clears the mask so the user types a replacement;
        // leaving it empty puts the mask back, which keeps the stored value on save.
        onFocus: () => { if (row.value === SECRET_MASK) onChange(rows.map((r, i) => (i === index ? { ...r, value: '' } : r))) },
        onBlur: () => { if (row.stored && row.value === '') onChange(rows.map((r, i) => (i === index ? { ...r, value: SECRET_MASK } : r))) },
        placeholder: 'valor',
      }),
      h('button', { className: 'dmcp-btn danger', onClick: () => onChange(rows.filter((_, i) => i !== index)) }, '×'),
    )),
    h('div', null, h('button', { className: 'dmcp-btn', onClick: () => onChange([...rows, { key: '', value: '' }]) }, '+ adicionar')),
  )
}

function ServerForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = React.useState(() => ({
    name: initial?.name ?? '',
    transport: initial?.transport ?? 'stdio',
    command: initial?.command ?? '',
    args: (initial?.args ?? []).join('\n'),
    cwd: initial?.cwd ?? '',
    env: toRows(initial?.env),
    url: initial?.url ?? '',
    headers: toRows(initial?.headers),
    toolCallTimeoutMs: initial?.toolCallTimeoutMs ?? 60000,
  }))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setRows = (key) => (rows) => setForm((f) => ({ ...f, [key]: rows }))

  const save = async () => {
    setBusy(true)
    setError('')
    const common = { name: form.name.trim(), enabled: initial?.enabled ?? true, toolCallTimeoutMs: Number(form.toolCallTimeoutMs) }
    const server = form.transport === 'stdio'
      ? { ...common, transport: 'stdio', command: form.command, args: form.args.split('\n').map((a) => a.trim()).filter(Boolean), cwd: form.cwd, env: fromRows(form.env) }
      : { ...common, transport: 'streamable-http', url: form.url, headers: fromRows(form.headers) }
    try {
      const r = await api('save', { original: initial?.name ?? '', server })
      if (!r.ok) setError(r.error || 'falha ao salvar')
      else onSaved(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return h('div', { className: 'dmcp-form' },
    h('div', { className: 'dmcp-grid' },
      h('div', { className: 'dmcp-field' }, h('label', null, 'Nome (vira mcp__nome__tool)'), h('input', { className: 'dmcp-input', value: form.name, onChange: set('name'), placeholder: 'github' })),
      h('div', { className: 'dmcp-field' }, h('label', null, 'Transporte'),
        h('select', { className: 'dmcp-input', value: form.transport, onChange: set('transport') },
          h('option', { value: 'stdio' }, 'stdio (comando local)'),
          h('option', { value: 'streamable-http' }, 'HTTP (Streamable)'),
        )),
    ),
    form.transport === 'stdio'
      ? [
          h('div', { className: 'dmcp-field', key: 'command' }, h('label', null, 'Comando'), h('input', { className: 'dmcp-input dmcp-mono', value: form.command, onChange: set('command'), placeholder: 'npx' })),
          h('div', { className: 'dmcp-field', key: 'args' }, h('label', null, 'Argumentos (um por linha)'), h('textarea', { className: 'dmcp-input dmcp-mono', rows: 3, value: form.args, onChange: set('args'), placeholder: '-y\n@modelcontextprotocol/server-everything' })),
          h('div', { className: 'dmcp-field', key: 'cwd' }, h('label', null, 'Diretório de trabalho (opcional)'), h('input', { className: 'dmcp-input dmcp-mono', value: form.cwd, onChange: set('cwd') })),
          h(KeyValueEditor, { key: 'env', label: 'Variáveis de ambiente', rows: form.env, onChange: setRows('env'), keyPlaceholder: 'API_KEY' }),
        ]
      : [
          h('div', { className: 'dmcp-field', key: 'url' }, h('label', null, 'URL'), h('input', { className: 'dmcp-input dmcp-mono', value: form.url, onChange: set('url'), placeholder: 'https://exemplo.com/mcp' })),
          h(KeyValueEditor, { key: 'headers', label: 'Headers', rows: form.headers, onChange: setRows('headers'), keyPlaceholder: 'Authorization' }),
        ],
    h('div', { className: 'dmcp-field' }, h('label', null, 'Timeout por chamada (ms)'), h('input', { className: 'dmcp-input', value: form.toolCallTimeoutMs, onChange: set('toolCallTimeoutMs') })),
    error ? h('div', { className: 'dmcp-error' }, error) : null,
    h('div', { className: 'dmcp-row' },
      h('button', { className: 'dmcp-btn primary', disabled: busy, onClick: save }, busy ? 'Salvando…' : 'Salvar'),
      h('button', { className: 'dmcp-btn', onClick: onCancel }, 'Cancelar'),
    ),
  )
}

function ImportForm({ onSaved, onCancel }) {
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await api('import', { text })
      if (!r.ok) setError(r.error || 'falha ao importar')
      else onSaved(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return h('div', { className: 'dmcp-form' },
    h('div', { className: 'dmcp-dim' }, 'Cole o JSON no formato do Claude Desktop / Cursor: { "mcpServers": { "nome": { "command": …, "args": […] } } }'),
    h('textarea', { className: 'dmcp-input dmcp-mono', rows: 8, value: text, onChange: (e) => setText(e.target.value) }),
    error ? h('div', { className: 'dmcp-error' }, error) : null,
    h('div', { className: 'dmcp-row' },
      h('button', { className: 'dmcp-btn primary', disabled: busy || !text.trim(), onClick: submit }, busy ? 'Importando…' : 'Importar'),
      h('button', { className: 'dmcp-btn', onClick: onCancel }, 'Cancelar'),
    ),
  )
}

function ServerItem({ server, onChanged, onEdit }) {
  const [busy, setBusy] = React.useState('')
  const [error, setError] = React.useState('')
  const act = (method, payload) => async () => {
    setBusy(method)
    setError('')
    try {
      const r = await api(method, { name: server.name, ...payload })
      if (!r.ok) setError(r.error || 'falhou')
      else onChanged(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }
  const [tone, label] = STATE_LABELS[server.state] ?? ['', server.state]
  const target = server.transport === 'stdio' ? [server.command, ...(server.args ?? [])].join(' ') : server.url
  return h('div', { className: 'dmcp-server' },
    h('div', { className: 'dmcp-row' },
      h('span', { className: 'dmcp-name' }, server.name),
      h('span', { className: 'dmcp-badge' }, server.transport === 'stdio' ? 'stdio' : 'http'),
      h('span', { className: 'dmcp-badge ' + tone }, label),
      server.state === 'connected' ? h('span', { className: 'dmcp-dim' }, `${server.toolCount} tool(s)`) : null,
    ),
    h('div', { className: 'dmcp-dim dmcp-mono' }, target),
    server.error ? h('div', { className: 'dmcp-error' }, server.error) : null,
    h('div', { className: 'dmcp-row' },
      h('label', { className: 'dmcp-row', style: { gap: 4 } },
        h('input', { type: 'checkbox', checked: server.enabled, disabled: !!busy, onChange: (e) => act('toggle', { enabled: e.target.checked })() }),
        h('span', { className: 'dmcp-dim' }, 'ativo'),
      ),
      server.enabled ? h('button', { className: 'dmcp-btn', disabled: !!busy, onClick: act('reconnect') }, busy === 'reconnect' ? '…' : 'Reconectar') : null,
      h('button', { className: 'dmcp-btn', disabled: !!busy, onClick: onEdit }, 'Editar'),
      h('button', {
        className: 'dmcp-btn danger',
        disabled: !!busy,
        onClick: () => { if (window.confirm(`Excluir o servidor MCP "${server.name}"?`)) void act('delete')() },
      }, 'Excluir'),
    ),
    error ? h('div', { className: 'dmcp-error' }, error) : null,
  )
}

function McpView() {
  const [data, setData] = React.useState(null)
  const [mode, setMode] = React.useState(null)
  const [fetchError, setFetchError] = React.useState('')

  const accept = React.useCallback((r) => {
    if (r?.ok) {
      setData(r)
      setFetchError('')
    } else {
      setFetchError(r?.error || 'falha ao carregar')
    }
  }, [])
  const refresh = React.useCallback(() => api('list').then(accept, (e) => setFetchError(e.message)), [accept])

  React.useEffect(() => {
    let alive = true
    let timer = null
    const tick = async () => {
      await refresh()
      if (alive) timer = setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [refresh])

  const closeWith = (r) => { setMode(null); accept(r) }

  if (!data) {
    return h('div', { className: 'dmcp-root' }, h('div', { className: 'dmcp-scroll' },
      fetchError ? h('div', { className: 'dmcp-error' }, fetchError) : h('div', { className: 'dmcp-empty' }, 'carregando…')))
  }
  return h('div', { className: 'dmcp-root' },
    h('div', { className: 'dmcp-scroll' },
      h('div', { className: 'dmcp-card' },
        h('div', { className: 'dmcp-row', style: { justifyContent: 'space-between' } },
          h('div', { className: 'dmcp-title' }, 'Servidores MCP'),
          h('div', { className: 'dmcp-row' },
            h('button', { className: 'dmcp-btn', onClick: () => setMode(mode === 'import' ? null : 'import') }, 'Importar JSON'),
            h('button', { className: 'dmcp-btn primary', onClick: () => setMode(mode === 'new' ? null : 'new') }, '+ Novo'),
          ),
        ),
        h('div', { className: 'dmcp-dim' }, 'Servidores stdio executam um comando local fora do sandbox, e as tools de todo servidor ativo ficam disponíveis para todos os agentes. Cadastre só o que você confia.'),
        data.loadError ? h('div', { className: 'dmcp-error' }, `Arquivo ${data.file} não pôde ser lido: ${data.loadError}. Corrija ou apague o arquivo para voltar a salvar.`) : null,
        fetchError ? h('div', { className: 'dmcp-error' }, fetchError) : null,
        mode === 'new' ? h(ServerForm, { onSaved: closeWith, onCancel: () => setMode(null) }) : null,
        mode === 'import' ? h(ImportForm, { onSaved: closeWith, onCancel: () => setMode(null) }) : null,
        !data.servers.length && !mode ? h('div', { className: 'dmcp-empty' }, 'Nenhum servidor cadastrado.') : null,
        data.servers.map((server) => mode && mode.edit === server.name
          ? h(ServerForm, { key: server.name, initial: server, onSaved: closeWith, onCancel: () => setMode(null) })
          : h(ServerItem, { key: server.name, server, onChanged: accept, onEdit: () => setMode({ edit: server.name }) })),
        h('div', { className: 'dmcp-dim dmcp-mono' }, data.file),
      ),
    ),
  )
}

function McpIcon(size) {
  return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none' },
    h('path', { d: 'M5.5 2.5v3M10.5 2.5v3M3.5 5.5h9v2.5a4.5 4.5 0 0 1-9 0V5.5zM8 12.5v2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
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
        title: 'MCP',
        order: 43,
        single: true,
        icon: (size) => McpIcon(size),
        component: (props) => React.createElement(McpView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
