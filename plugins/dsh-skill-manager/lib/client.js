window.__ModuleLoader__.load({ id: 'dsh-skill-manager', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')
// dsh-skill-manager client half: a better-sidebar tab that lists every skill
// the harness can load and manages their SKILL.md files through the plugin's
// /skill-manager/api routes. Writes hot-reload host-side via the skill watcher.

const TAB_ID = 'dsh-skill-manager:skills'

const TEMPLATE = (name, description, whenToUse) => `---
name: ${name}
description: ${description}
${whenToUse ? `whenToUse: ${whenToUse}\n` : ''}---

`

function injectStyles() {
  const id = 'skm-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.skm-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.skm-bar{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.skm-bar input[type=text],.skm-bar select{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit}
.skm-bar input[type=text]{flex:1;min-width:80px}
.skm-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.skm-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.skm-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.skm-btn.primary:hover{background:#1d4ed8}
.skm-btn.danger{color:#f87171;border-color:#7f1d1d}
.skm-btn.danger:hover{background:#3b1212}
.skm-btn:disabled{opacity:.45;cursor:default}
.skm-list{flex:1;overflow-y:auto;padding:6px 8px 16px;min-height:0}
.skm-group{margin:10px 2px 4px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#9a9aa5)}
.skm-item{width:100%;text-align:left;background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 9px;cursor:pointer;color:inherit;font-family:inherit;display:block}
.skm-item:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#31323b))}
.skm-item.active{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-bg-layer-2,#3a3b46));border-color:var(--dsw-alias-border-l2,#4a4b55)}
.skm-item-name{font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px}
.skm-item-desc{font-size:12px;color:var(--dsw-alias-label-secondary,#b6b6bf);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skm-badge{display:inline-block;font-size:10px;font-weight:600;border-radius:4px;padding:1px 5px;border:1px solid var(--dsw-alias-border-l2,#4a4b55);color:var(--dsw-alias-label-secondary,#9a9aa5)}
.skm-badge.ok{color:#4ade80;border-color:#14532d}
.skm-badge.warn{color:#fbbf24;border-color:#78350f}
.skm-badge.model{color:#60a5fa;border-color:#1e3a8a}
.skm-empty{padding:24px 14px;text-align:center;color:var(--dsw-alias-label-tertiary,#9a9aa5);font-size:12px;line-height:1.6}
.skm-editor{flex:1;display:flex;flex-direction:column;min-height:0;padding:10px;gap:8px;overflow-y:auto}
.skm-field{display:flex;flex-direction:column;gap:3px}
.skm-field label{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#9a9aa5)}
.skm-field input[type=text]{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:5px 8px;font-size:13px;outline:none;font-family:inherit}
.skm-field input.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.skm-flags{display:flex;gap:14px;align-items:center}
.skm-flags label{display:inline-flex;gap:5px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#b6b6bf);cursor:pointer}
.skm-body{flex:1;min-height:220px;resize:vertical;background:var(--dsw-alias-bg-layer-1,#1c1d22);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:8px;padding:9px;font-size:12.5px;line-height:1.55;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap}
.skm-adv textarea{width:100%;min-height:90px;resize:vertical;background:var(--dsw-alias-bg-layer-1,#1c1d22);color:var(--dsw-alias-label-secondary,#c9c9d1);border:1px dashed var(--dsw-alias-border-l2,#4a4b55);border-radius:8px;padding:8px;font-size:12px;line-height:1.5;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap}
.skm-foot{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:2px}
.skm-path{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#7c7c88);word-break:break-all;flex:1;min-width:120px}
.skm-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.skm-toast.err{border-color:#7f1d1d;color:#fca5a5}
.skm-new{border:1px dashed var(--dsw-alias-border-l2,#4a4b55);border-radius:8px;padding:8px;margin:4px 8px;display:flex;gap:8px;align-items:center;background:var(--dsw-alias-bg-layer-1,#222329)}
`
  document.head.appendChild(el)
}

// The active session's scope, set by the view on every render from
// better-sidebar's TabComponentProps ({sessionId, cwd}) so every API call
// resolves the workspace the user is actually looking at.
let SCOPE = null

function api(method, payload) {
  return fetch('/skill-manager/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

/** Rebuild SKILL.md content from structured form fields, preserving unknown frontmatter lines. */
function buildContent(f) {
  const lines = ['---', 'name: ' + f.name.trim(), 'description: ' + quoteField(f.description.trim())]
  if (f.whenToUse.trim()) lines.push('whenToUse: ' + quoteField(f.whenToUse.trim()))
  if (!f.modelInvocable) lines.push('disable-model-invocation: true')
  if (!f.userInvocable) lines.push('user-invocable: false')
  for (const extra of f.extraLines) lines.push(extra)
  lines.push('---', '')
  return lines.join('\n') + f.body.replace(/\r\n/g, '\n') + (f.body && !f.body.endsWith('\n') ? '\n' : '')
}

function quoteField(v) {
  if (!/[:#{}[\]&*!|>'"%@`\n]/.test(v) && !/^\s|\s$/.test(v)) return v
  return '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
}

/** Lenient parse mirrored from the host, so the editor form round-trips. */
function parseContent(text) {
  const f = { name: '', description: '', whenToUse: '', modelInvocable: true, userInvocable: true, extraLines: [], body: text, hasFm: false, complex: false }
  if (!text.startsWith('---')) return f
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) return f
  f.hasFm = true
  const fm = m[1]
  f.body = text.slice(m[0].length)
  const known = /^(name|description|whenToUse):\s*(.*)$|^disable-model-invocation:\s*(.*)$|^user-invocable:\s*(.*)$/
  let blocking = false
  for (const line of fm.split(/\r?\n/)) {
    const km = known.exec(line)
    if (!km) { f.extraLines.push(line); continue }
    if (km[1]) {
      let v = km[2].trim()
      if (/^[|>][-+]?$/.test(v)) { blocking = true; f.extraLines.push(line); continue }
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      f.name = v
    } else if (km[2] !== undefined && km[2] !== null && km[1] === undefined && km[3] === undefined && km[4] === undefined) { /* unreachable */ }
    if (/^description:/.test(line)) {
      let v = line.slice('description:'.length).trim()
      if (/^[|>][-+]?$/.test(v)) { blocking = true; f.extraLines.push(line); continue }
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      f.description = v
    } else if (/^whenToUse:/.test(line)) {
      let v = line.slice('whenToUse:'.length).trim()
      if (/^[|>][-+]?$/.test(v)) { blocking = true; f.extraLines.push(line); continue }
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      f.whenToUse = v
    } else if (/^disable-model-invocation:/.test(line)) {
      f.modelInvocable = !/^\s*(true|1|yes|on)\s*$/i.test(line.slice('disable-model-invocation:'.length))
    } else if (/^user-invocable:/.test(line)) {
      f.userInvocable = !/^\s*(false|0|no|off)\s*$/i.test(line.slice('user-invocable:'.length))
    }
  }
  f.complex = blocking
  return f
}

function BookIcon(size) {
  const h = React.createElement
  return h('svg', { width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M2.5 3.2c0-.6.4-1 1-1H7v11H3.5c-.6 0-1-.4-1-1V3.2Z' }),
    h('path', { d: 'M13.5 3.2c0-.6-.4-1-1-1H9v11h3.5c.6 0 1-.4 1-1V3.2Z' }),
  )
}

function SkillsView(props) {
  SCOPE = props?.scope ? { sessionId: props.scope.sessionId, cwd: props.scope.cwd } : null
  const h = React.createElement
  const [skills, setSkills] = React.useState(null)
  const [roots, setRoots] = React.useState([])
  const [q, setQ] = React.useState('')
  const [scopeFilter, setScopeFilter] = React.useState('all')
  const [sel, setSel] = React.useState(null) // { meta, form, path }
  const [creating, setCreating] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: '', description: '', whenToUse: '', scope: 'user', modelInvocable: true, userInvocable: true, body: '' })
  const [adv, setAdv] = React.useState(false)
  const [advFm, setAdvFm] = React.useState('')
  const [toast, setToast] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const toastTimer = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5200 : 2400)
  }, [])

  const refresh = React.useCallback(() => {
    api('list').then((r) => {
      if (r.ok) { setSkills(r.skills); setRoots(r.roots) } else say(r.error || 'list failed', true)
    }).catch((e) => say(String(e), true))
  }, [say])

  React.useEffect(() => { refresh() }, [refresh])

  const openSkill = async (sk) => {
    setCreating(false)
    const r = await api('read', { path: sk.path })
    if (!r.ok) return say(r.error || 'read failed', true)
    const parsed = parseContent(r.content)
    setSel({ meta: sk, path: sk.path, form: parsed, originalName: parsed.name })
    setAdv(parsed.complex)
    setAdvFm(parsed.hasFm ? r.content.slice(0, r.content.length - parsed.body.length).replace(/^---\r?\n/, '').replace(/\r?\n---\r?\n?$/, '') : '')
  }

  const save = async () => {
    if (!sel || busy) return
    setBusy(true)
    const f = sel.form
    const content = adv
      ? '---\n' + advFm.replace(/^\r?\n/, '').replace(/\r?\n$/, '') + '\n---\n\n' + f.body.replace(/\r\n/g, '\n')
      : buildContent(f)
    const r = await api('update', { path: sel.path, content, newName: f.name.trim() !== sel.originalName ? f.name.trim() : '' })
    setBusy(false)
    if (!r.ok) return say(r.error || 'save failed', true)
    say('Saved â€” live immediately (hot reload)')
    const meta = { ...sel.meta, name: f.name.trim() || sel.meta.name, path: r.path || sel.path }
    setSel({ ...sel, meta, path: r.path || sel.path, originalName: f.name.trim() })
    refresh()
  }

  const create = async () => {
    if (busy) return
    const d = draft
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name.trim())) return say('Name must be kebab-case (lowercase, dashes)', true)
    if (!d.description.trim()) return say('Description is required', true)
    setBusy(true)
    const content = buildContent({ ...d, extraLines: [] })
    const r = await api('create', { ...d, name: d.name.trim(), content })
    setBusy(false)
    if (!r.ok) return say(r.error || 'create failed', true)
    say('Skill created â€” live immediately')
    setCreating(false)
    setDraft({ name: '', description: '', whenToUse: '', scope: d.scope, modelInvocable: true, userInvocable: true, body: '' })
    refresh()
  }

  const remove = async (sk) => {
    if (!window.confirm(`Delete skill "${sk.name}"?\n\n${sk.path}\n\nThe file${sk.kind === 'bundle' ? ' (and its folder)' : ''} will be removed from disk.`)) return
    const r = await api('delete', { path: sk.path })
    if (!r.ok) return say(r.error || 'delete failed', true)
    if (sel && sel.path === sk.path) setSel(null)
    say('Skill deleted')
    refresh()
  }

  const openExternal = async (sk) => {
    const r = await api('open', { path: sk.path })
    if (!r.ok) return say(r.error || 'open failed (is the "code" CLI installed?)', true)
    say('Opened in ' + r.editor)
  }

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (skills ?? []).filter((s) =>
      (scopeFilter === 'all' || s.scope.startsWith(scopeFilter)) &&
      (!needle || s.name.toLowerCase().includes(needle) || (s.description ?? '').toLowerCase().includes(needle)))
  }, [skills, q, scopeFilter])

  const groups = React.useMemo(() => {
    const g = { dsh: [], user: [], workspace: [] }
    for (const s of filtered) {
      if (s.scope.startsWith('dsh')) g.dsh.push(s)
      else if (s.scope === 'workspace') g.workspace.push(s)
      else g.user.push(s)
    }
    return g
  }, [filtered])

  const tierBadge = { dsh: 'DSH', user: 'user', workspace: 'ws' }

  const itemRow = (sk) => h('button', { key: sk.path, className: 'skm-item' + (sel && sel.path === sk.path && !creating ? ' active' : ''), onClick: () => openSkill(sk) },
    h('div', { className: 'skm-item-name' },
      h('span', null, sk.name),
      !sk.valid && h('span', { className: 'skm-badge warn' }, 'invalid'),
      sk.modelInvocable && h('span', { className: 'skm-badge model' }, 'model'),
      !sk.userInvocable && h('span', { className: 'skm-badge' }, 'agent-only'),
      h('span', { style: { marginLeft: 'auto' } },
        h('span', { className: 'skm-badge' }, tierBadge[sk.scopeTag] ?? sk.scopeTag),
        ' ',
        h('span', { className: 'skm-badge' + (sk.valid ? ' ok' : ' warn') }, sk.kind))),
    h('div', { className: 'skm-item-desc', title: sk.description }, sk.description || '(no description)'),
  )

  const formFields = (f, setF, withScope) => [
    h('div', { className: 'skm-field', key: 'name' },
      h('label', null, 'Name (kebab-case)'),
      h('input', { type: 'text', className: 'mono', value: f.name, disabled: adv, onChange: (e) => setF({ ...f, name: e.target.value }), placeholder: 'my-skill' })),
    h('div', { className: 'skm-field', key: 'desc' },
      h('label', null, 'Description (required â€” this is what the model sees)'),
      h('input', { type: 'text', value: f.description, disabled: adv, onChange: (e) => setF({ ...f, description: e.target.value }), placeholder: 'What this skill does and when to use it' })),
    h('div', { className: 'skm-field', key: 'wtu' },
      h('label', null, 'whenToUse (optional)'),
      h('input', { type: 'text', value: f.whenToUse, disabled: adv, onChange: (e) => setF({ ...f, whenToUse: e.target.value }), placeholder: 'Fire when the user asks forâ€¦' })),
    withScope && h('div', { className: 'skm-field', key: 'scope' },
      h('label', null, 'Where to save'),
      h('select', { value: f.scope, onChange: (e) => setF({ ...f, scope: e.target.value }) },
        ([roots.find((r) => r.scope === 'user'), roots.find((r) => r.scope === 'workspace')].filter(Boolean)).map((r) =>
          h('option', { key: r.scope, value: r.scope }, r.label + (r.exists ? '' : ' (will be created)'))))),
    h('div', { className: 'skm-flags', key: 'flags' },
      h('label', null, h('input', { type: 'checkbox', checked: f.modelInvocable, disabled: adv, onChange: (e) => setF({ ...f, modelInvocable: e.target.checked }) }), 'Model can invoke'),
      h('label', null, h('input', { type: 'checkbox', checked: f.userInvocable, disabled: adv, onChange: (e) => setF({ ...f, userInvocable: e.target.checked }) }), 'Usable via /slash')),
  ]

  if (creating) {
    return h('div', { className: 'skm-root' },
      h('div', { className: 'skm-bar' },
        h('button', { className: 'skm-btn', onClick: () => setCreating(false) }, 'â€¹ Back'),
        h('strong', null, 'New skill')),
      h('div', { className: 'skm-editor' },
        ...formFields(draft, setDraft, true),
        h('div', { className: 'skm-field', style: { flex: 1, minHeight: 160 } },
          h('label', null, 'Skill body (markdown instructions)'),
          h('textarea', { className: 'skm-body', value: draft.body, onChange: (e) => setDraft({ ...draft, body: e.target.value }), placeholder: 'Write the instructions the agent receives when this skill firesâ€¦' })),
        h('div', { className: 'skm-foot' },
          h('button', { className: 'skm-btn primary', disabled: busy, onClick: create }, busy ? 'Creatingâ€¦' : 'Create skill'),
          h('span', { className: 'skm-path' }, 'Created as <scope>/' + (draft.name || 'name') + '/SKILL.md â€” live immediately, no restart.'))),
      toast && h('div', { className: 'skm-toast' + (toast.err ? ' err' : '') }, toast.msg),
    )
  }

  if (sel) {
    const f = sel.form
    const setF = (patch) => setSel({ ...sel, form: { ...f, ...patch } })
    const advToggle = h('input', {
      type: 'checkbox',
      checked: adv,
      onChange: (e) => {
        if (e.target.checked && !advFm) {
          api('read', { path: sel.path }).then((r) => {
            if (!r.ok) return say(r.error, true)
            const parsed = parseContent(r.content)
            setAdvFm(r.content.slice(0, r.content.length - parsed.body.length).replace(/^---\r?\n/, '').replace(/\r?\n---\r?\n?$/, ''))
          })
        }
        setAdv(e.target.checked)
      },
    })
    const advLabel = h('label', {
      style: { display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 12, cursor: 'pointer', color: 'var(--dsw-alias-label-secondary,#9a9aa5)' },
    }, advToggle, 'Advanced: edit raw frontmatter (preserves every key verbatim)')
    const advBox = h('div', { className: 'skm-adv' }, advLabel, adv ? h('textarea', { value: advFm, onChange: (e) => setAdvFm(e.target.value), spellCheck: false }) : null)
    const bodyField = h('div', { className: 'skm-field', style: { flex: 1, minHeight: 160 } },
      h('label', null, 'Skill body (markdown instructions)'),
      h('textarea', { className: 'skm-body', value: f.body, onChange: (e) => setF({ body: e.target.value }) }))
    const foot = h('div', { className: 'skm-foot' },
      h('button', { className: 'skm-btn primary', disabled: busy, onClick: save }, busy ? 'Savingâ€¦' : 'Save'),
      h('span', { className: 'skm-path' }, sel.path))
    const bar = h('div', { className: 'skm-bar' },
      h('button', { className: 'skm-btn', onClick: () => setSel(null) }, 'â€¹ Back'),
      h('strong', null, sel.meta.name),
      h('span', { className: 'skm-badge', style: { marginLeft: 4 } }, sel.meta.scopeLabel),
      h('span', { style: { flex: 1 } }),
      h('button', { className: 'skm-btn', onClick: () => openExternal(sel.meta), title: 'Open the file in VS Code (or $DSH_EDITOR)' }, 'Open in editor'),
      h('button', { className: 'skm-btn danger', onClick: () => remove(sel.meta) }, 'Delete'))
    return h('div', { className: 'skm-root' }, bar,
      h('div', { className: 'skm-editor' }, ...formFields(f, setF, false), bodyField, advBox, foot),
      toast && h('div', { className: 'skm-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  return h('div', { className: 'skm-root' },
    h('div', { className: 'skm-bar' },
      h('input', { type: 'text', value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Search skillsâ€¦' }),
      h('select', { value: scopeFilter, onChange: (e) => setScopeFilter(e.target.value) },
        h('option', { value: 'all' }, 'All sources'),
        h('option', { value: 'dsh' }, 'DSH'),
        h('option', { value: 'user' }, 'User'),
        h('option', { value: 'workspace' }, 'Workspace')),
      h('button', { className: 'skm-btn', onClick: refresh, title: 'Reload from disk' }, 'âŸ³'),
      h('button', { className: 'skm-btn primary', onClick: () => setCreating(true) }, '+ New skill')),
    h('div', { className: 'skm-list' },
      skills === null && h('div', { className: 'skm-empty' }, 'Loading skillsâ€¦'),
      skills !== null && filtered.length === 0 && h('div', { className: 'skm-empty' },
        'No skills found.', h('br'), null),
      groups.dsh.length > 0 && h('div', { className: 'skm-group' }, 'DSH skills'),
      ...groups.dsh.map(itemRow),
      groups.user.length > 0 && h('div', { className: 'skm-group' }, 'User skills (versioned in this repo)'),
      ...groups.user.map(itemRow),
      groups.workspace.length > 0 && h('div', { className: 'skm-group' }, 'Workspace skills (.skills)'),
      ...groups.workspace.map(itemRow),
      skills !== null && (skills.length === 0) && h('div', { className: 'skm-new' },
        h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#b6b6bf)' } },
          'Skill roots: DSH install (.agents/.dsh) \u00b7 user plugin/skills \u00b7 workspace .skills')),
    ),
    toast && h('div', { className: 'skm-toast' + (toast.err ? ' err' : '') }, toast.msg),
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
        title: 'Skills',
        order: 40,
        single: true,
        icon: (size) => BookIcon(size),
        component: (props) => React.createElement(SkillsView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
