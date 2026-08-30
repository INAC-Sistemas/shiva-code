window.__ModuleLoader__.load({ id: 'dsh-mds', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-mds client half: a better-sidebar tab over the workspace `mds/` folder.
// Lists folders and files, opens files in an editor, creates and deletes both,
// and offers the folder-creation action while the folder does not exist yet.

const TAB_ID = 'dsh-mds:artifacts'

// The active session's scope, set by the view on every render from
// better-sidebar's TabComponentProps ({sessionId, cwd}) so every API call
// resolves the workspace the user is actually looking at.
let SCOPE = null

function api(method, payload) {
  return fetch('/mds/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(SCOPE ?? {}), ...(payload ?? {}) }),
  }).then((r) => r.json())
}

function injectStyles() {
  const id = 'mds-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.mds-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.mds-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center}
.mds-empty h3{margin:0;font-size:15px}
.mds-empty p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:340px}
.mds-empty code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--dsw-alias-label-primary,#e8e8ea);background:var(--dsw-alias-bg-layer-2,#26272e);padding:1px 5px;border-radius:4px}
.mds-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.mds-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.mds-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#000);font-weight:600}
.mds-btn.danger{color:#f87171;border-color:#7f1d1d}
.mds-btn.danger:hover{background:#3b1212}
.mds-btn:disabled{opacity:.45;cursor:default}
.mds-main{flex:1;display:flex;min-height:0}
.mds-side{width:44%;min-width:180px;max-width:340px;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1,#3a3b44);min-height:0}
.mds-side-bar{display:flex;gap:4px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.mds-side-bar input[type=text]{flex:1;min-width:60px;background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 7px;font-size:12px;outline:none;font-family:inherit}
.mds-tree{flex:1;overflow-y:auto;padding:4px 4px 16px;min-height:0}
.mds-row{width:100%;display:flex;align-items:center;gap:6px;text-align:left;background:transparent;border:none;color:inherit;padding:4px 6px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12.5px;white-space:nowrap;overflow:hidden}
.mds-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#31323b))}
.mds-row.active{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-bg-layer-2,#3a3b46))}
.mds-row .nm{overflow:hidden;text-overflow:ellipsis;flex:1}
.mds-row .sz{font-size:10px;color:var(--dsw-alias-label-tertiary,#7c7c88);flex:none}
.mds-row .tg{flex:none;width:14px;text-align:center;color:var(--dsw-alias-label-tertiary,#9a9aa5);font-size:10px}
.mds-row.is-md .nm{color:var(--dsw-alias-brand-text,#e8e8ea)}
.mds-del{flex:none;background:transparent;border:none;color:var(--dsw-alias-label-tertiary,#7c7c88);cursor:pointer;font-size:11px;padding:0 3px;border-radius:4px;visibility:hidden}
.mds-row:hover .mds-del{visibility:visible}
.mds-del:hover{color:#f87171}
.mds-newrow{display:flex;gap:4px;padding:4px 6px}
.mds-newrow input{flex:1;background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:3px 7px;font-size:12px;outline:none;font-family:ui-monospace,Menlo,Consolas,monospace}
.mds-ed{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.mds-ed-bar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.mds-ed-path{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary,#b6b6bf);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:80px}
.mds-dirty{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary,#fbbf24);flex:none}
.mds-ed textarea{flex:1;resize:none;background:var(--dsw-alias-bg-layer-1,#1c1d22);color:inherit;border:none;padding:12px;font-size:13px;line-height:1.6;outline:none;font-family:ui-monospace,"Cascadia Code",Menlo,Consolas,monospace;min-height:0}
.mds-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#7c7c88);font-size:12px;padding:20px;text-align:center;line-height:1.7}
.mds-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.mds-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function IconDoc() {
  return React.createElement('span', { className: 'tg' }, '≡')
}
function IconDir(open) {
  return React.createElement('span', { className: 'tg' }, open ? '▾' : '▸')
}

function buildTree(entries) {
  const rootDir = { name: '', path: '', type: 'dir', children: new Map() }
  const dirFor = (dirPath) => {
    if (dirPath === '') return rootDir
    let node = rootDir
    for (const part of dirPath.split('/')) {
      const p = node.path ? node.path + '/' + part : part
      if (!node.children.has(part)) node.children.set(part, { name: part, path: p, type: 'dir', children: new Map() })
      node = node.children.get(part)
    }
    return node
  }
  for (const ent of entries) {
    if (ent.type === 'dir') { dirFor(ent.path); continue }
    const parent = dirFor(ent.path.split('/').slice(0, -1).join('/'))
    parent.children.set(ent.name ?? ent.path.split('/').pop(), { ...ent, name: ent.path.split('/').pop(), children: undefined })
  }
  return rootDir
}

function MdsView(props) {
  const h = React.createElement
  SCOPE = props?.scope ? { sessionId: props.scope.sessionId, cwd: props.scope.cwd } : null
  const [status, setStatus] = React.useState(null) // { workspace, root, exists }
  const [entries, setEntries] = React.useState(null)
  const [q, setQ] = React.useState('')
  const [selected, setSelected] = React.useState(null) // { path, content, dirty }
  const [draft, setDraft] = React.useState('')
  const [expanded, setExpanded] = React.useState(() => new Set())
  const [creating, setCreating] = React.useState(null) // null | 'file' | 'dir'
  const [newName, setNewName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)
  const newInputRef = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 5200 : 2200)
  }, [])

  const loadStatus = React.useCallback(() => {
    api('status').then((r) => { if (r.ok) setStatus(r) }).catch(() => {})
  }, [])

  const loadList = React.useCallback(() => {
    api('list').then((r) => {
      if (!r.ok) return say(r.error || 'list failed', true)
      // The list re-answers folder existence too, so an externally deleted
      // mds folder drops the panel back to the create action immediately.
      if (r.exists === false) {
        setEntries([])
        setStatus((prev) => ({ workspace: prev?.workspace ?? '', root: prev?.root ?? '', folder: 'mds', exists: false }))
        return
      }
      setEntries(r.entries)
      setExpanded((prev) => {
        const next = new Set(prev)
        for (const e of r.entries) if (e.type === 'dir' && !next.has(e.path)) next.add(e.path)
        return next
      })
    }).catch((e) => say(String(e), true))
  }, [say])

  React.useEffect(() => { loadStatus(); loadList() }, [loadStatus, loadList])

  const createRoot = async () => {
    setBusy(true)
    const r = await api('create_folder_root')
    setBusy(false)
    if (!r.ok) return say(r.error || 'failed', true)
    say(`Created ${r.root}`)
    loadStatus(); loadList()
  }

  const openFile = async (path) => {
    const r = await api('read', { path })
    if (!r.ok) return say(r.error || 'read failed', true)
    setSelected({ path, content: r.content })
    setDraft(r.content)
  }

  const save = async () => {
    if (!selected || busy) return
    setBusy(true)
    const r = await api('write', { path: selected.path, content: draft })
    setBusy(false)
    if (!r.ok) return say(r.error || 'save failed', true)
    setSelected({ ...selected, content: draft })
    say('Saved')
    loadList()
  }

  const createEntry = async () => {
    const name = newName.trim().replaceAll('\\', '/')
    if (!name || busy) return
    setBusy(true)
    let r
    if (creating === 'dir') r = await api('create_dir', { path: name })
    else r = await api('write', { path: name, content: '# ' + (name.split('/').pop().replace(/\.md$/i, '')) + '\n\n' })
    setBusy(false)
    if (!r.ok) { say(r.error || 'create failed', true); return }
    setCreating(null); setNewName('')
    say(creating === 'dir' ? 'Folder created' : 'File created')
    loadList()
    if (creating !== 'dir') openFile(name)
  }

  const removeEntry = async (path, isDir) => {
    if (!window.confirm(`Delete "${path}"${isDir ? ' and everything inside it' : ''}?`)) return
    const r = await api('delete', { path })
    if (!r.ok) return say(r.error || 'delete failed', true)
    if (selected && (selected.path === path || selected.path.startsWith(path + '/'))) setSelected(null)
    say('Deleted')
    loadList()
  }

  const openExternal = async (path) => {
    const r = await api('open', { path })
    if (!r.ok) return say(r.error || 'open failed (is the "code" CLI installed?)', true)
    say('Opened in ' + r.editor)
  }

  const onEditorKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
  }

  const toggleDir = (path) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    return next
  })

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries ?? []
    return (entries ?? []).filter((e) => e.path.toLowerCase().includes(needle))
  }, [entries, q])

  const tree = React.useMemo(() => (q.trim() ? null : buildTree(filtered)), [filtered, q])

  const renderNodes = (parentNode, depth) => {
    const rows = []
    const children = [...parentNode.children.values()].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of children) {
      if (node.type === 'dir') {
        const open = expanded.has(node.path)
        rows.push(h('div', { key: 'd:' + node.path, style: { paddingLeft: depth * 12 } },
          h('div', { className: 'mds-row', onClick: () => toggleDir(node.path), style: { display: 'flex' } },
            IconDir(open),
            h('span', { className: 'nm' }, node.name)),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: -26, paddingRight: 2, pointerEvents: 'none' } },
            h('button', {
              className: 'mds-del', style: { pointerEvents: 'auto' }, title: 'Delete folder',
              onClick: (e) => { e.stopPropagation(); removeEntry(node.path, true) },
            }, '✕'))),
        )
        if (open) rows.push(...renderNodes(node, depth + 1))
      } else {
        rows.push(h('div', { key: 'f:' + node.path, style: { paddingLeft: depth * 12 } },
          h('div', {
            className: 'mds-row' + (node.md ? ' is-md' : '') + (selected && selected.path === node.path ? ' active' : ''),
            onClick: () => openFile(node.path), title: node.path,
          },
            node.md ? null : IconDoc(),
            h('span', { className: 'nm' }, node.name),
            h('span', { className: 'sz' }, node.size != null ? fmtSize(node.size) : '')),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: -26, paddingRight: 2, pointerEvents: 'none' } },
            h('button', {
              className: 'mds-del', style: { pointerEvents: 'auto' }, title: 'Delete file',
              onClick: (e) => { e.stopPropagation(); removeEntry(node.path, false) },
            }, '✕'))),
        )
      }
    }
    return rows
  }

  const fmtSize = (n) => (n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB')

  if (!status) {
    return h('div', { className: 'mds-root' },
      h('div', { className: 'mds-hint' }, 'Loading…'),
      toast && h('div', { className: 'mds-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  if (!status.exists) {
    // Gate the whole panel behind folder existence: until mds/ exists the tab
    // is the create action, nothing else.
    return h('div', { className: 'mds-root' },
      h('div', { className: 'mds-empty' },
        h('h3', null, 'Markdown artifacts'),
        h('p', null, 'This workspace has no ', h('code', null, 'mds/'), ' folder yet — the home for durable project notes, specs and artifacts.'),
        h('button', { className: 'mds-btn primary', disabled: busy, onClick: createRoot }, busy ? 'Creating…' : 'Create mds folder'),
        h('p', { style: { fontSize: 11 } }, status.root)),
      toast && h('div', { className: 'mds-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  const isDirty = selected !== null && draft !== selected.content

  return h('div', { className: 'mds-root' },
    h('div', { className: 'mds-main' },
      h('div', { className: 'mds-side' },
        h('div', { className: 'mds-side-bar' },
          h('button', { className: 'mds-btn', title: 'New markdown file', onClick: () => { setCreating(creating === 'file' ? null : 'file'); setNewName(''); setTimeout(() => newInputRef.current?.focus(), 30) } }, '+ File'),
          h('button', { className: 'mds-btn', title: 'New folder', onClick: () => { setCreating(creating === 'dir' ? null : 'dir'); setNewName(''); setTimeout(() => newInputRef.current?.focus(), 30) } }, '+ Folder'),
          h('span', { style: { flex: 1 } }),
          h('button', { className: 'mds-btn', title: 'Reload', onClick: loadList }, '⟳')),
        creating && h('div', { className: 'mds-newrow' },
          h('input', {
            ref: newInputRef, value: newName, placeholder: creating === 'dir' ? 'folder/name' : 'notes/name.md',
            onChange: (e) => setNewName(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') createEntry(); if (e.key === 'Escape') { setCreating(null); setNewName('') } },
          }),
          h('button', { className: 'mds-btn primary', disabled: busy || !newName.trim(), onClick: createEntry }, 'OK')),
        h('div', { style: { padding: '6px 8px 0' } },
          h('input', { type: 'text', value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Search…', style: { width: '100%', boxSizing: 'border-box', background: 'var(--dsw-alias-bg-layer-1,#26272e)', color: 'inherit', border: '1px solid var(--dsw-alias-border-l2,#4a4b55)', borderRadius: 6, padding: '3px 7px', fontSize: 12, outline: 'none', fontFamily: 'inherit' } })),
        h('div', { className: 'mds-tree' },
          entries === null && h('div', { className: 'mds-hint' }, 'Loading…'),
          entries !== null && filtered.length === 0 && h('div', { className: 'mds-hint' },
            q.trim() ? 'No matches.' : 'Empty. Create your first note with + File.'),
          tree && renderNodes(tree, 0),
          tree === null && q.trim() && filtered.map((e) => h('div', { key: e.path, className: 'mds-row' + (e.md ? ' is-md' : '') + (selected && selected.path === e.path ? ' active' : ''), onClick: () => e.type === 'file' && openFile(e.path) },
            h('span', { className: 'nm' }, e.path)))),
      ),
      selected
        ? h('div', { className: 'mds-ed' },
          h('div', { className: 'mds-ed-bar' },
            isDirty && h('span', { className: 'mds-dirty', title: 'Unsaved changes' }),
            h('span', { className: 'mds-ed-path', title: selected.path }, selected.path),
            h('button', { className: 'mds-btn primary', disabled: busy || !isDirty, onClick: save }, busy ? 'Saving…' : 'Save'),
            h('button', { className: 'mds-btn', title: 'Open in VS Code (or $DSH_EDITOR)', onClick: () => openExternal(selected.path) }, 'Open'),
            h('button', { className: 'mds-btn danger', onClick: () => removeEntry(selected.path, false) }, 'Delete')),
          h('textarea', { value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: onEditorKey, spellCheck: false }))
        : h('div', { className: 'mds-ed' },
          h('div', { className: 'mds-hint' },
            h('div', null, 'Select a file on the left to read or edit it.', h('br'), 'Ctrl+S saves. New files start with a heading template.'))),
    ),
    toast && h('div', { className: 'mds-toast' + (toast.err ? ' err' : '') }, toast.msg),
  )
}

function MdsIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('path', { d: 'M3 1.5h6.5L13 5v9.5H3z' }),
    React.createElement('path', { d: 'M9.5 1.5V5H13' }),
    React.createElement('path', { d: 'M5.2 8v4M5.2 8l1.8 2.2L8.8 8v4' }),
    React.createElement('path', { d: 'M10.4 10.2l1.2 1.4 1.2-1.4M11.6 11.6V8.4' }),
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
        title: 'MDS',
        order: 38,
        single: true,
        icon: (size) => MdsIcon(size),
        component: (props) => React.createElement(MdsView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
