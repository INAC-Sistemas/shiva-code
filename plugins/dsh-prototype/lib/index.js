// dsh-prototype host half: serves the workspace `prototype/` folder over a
// same-origin route (so relative links, css, js and localStorage all work),
// injects the automation shim into every served HTML page, and runs the
// single-slot command queue agents use to drive the live browser view.

import { readFile, writeFile, readdir, mkdir, rm, rename, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative, dirname, sep, basename, extname } from 'node:path'
import { spawn } from 'node:child_process'

export const inject = ['webServer', 'sessions']

/** The folder this plugin owns, fixed by convention so agents can rely on it. */
export const PROTOTYPE_FOLDER = 'prototype'

const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_ENTRIES = 2000
const CMD_TTL_MS = 12 * 1000
const WAIT_MAX_MS = 10 * 1000
const NAME_RE = /^[^\\/:*?"<>|\x00-\x1f]+$/
const SKIP_DIRS = new Set(['node_modules', '.git'])

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
}

function log(msg) {
  console.log(`[dsh-prototype] ${msg}`)
}

/**
 * The workspace for one request. The tab sends the ACTIVE session's scope
 * ({sessionId, cwd}); explicit cwd wins, then a session matching the id,
 * then the process cwd.
 */
function workspaceOf(ctx, payload) {
  const cwd = typeof payload?.cwd === 'string' ? payload.cwd.trim() : ''
  if (cwd && resolve(cwd) === cwd) return cwd
  try {
    const sessions = ctx.get('sessions')
    for (const s of sessions?.list() ?? []) {
      const sid = s?.id ?? s?.header?.id ?? s?.sessionId
      const scwd = s?.header?.cwd
      if (payload?.sessionId && sid === payload.sessionId && typeof scwd === 'string' && scwd) return scwd
    }
  } catch { /* sessions unavailable */ }
  return process.cwd()
}

function prototypeRoot(ctx, payload) {
  return join(workspaceOf(ctx, payload), PROTOTYPE_FOLDER)
}

function guardRel(root, rel) {
  const value = String(rel ?? '').replaceAll('\\', '/').replace(/^\/+/, '')
  if (value === '') throw new Error('path required')
  const parts = value.split('/').filter((p) => p !== '' && p !== '.')
  if (parts.length === 0) throw new Error('path required')
  for (const part of parts) {
    if (part === '..') throw new Error('path traversal rejected')
    if (!NAME_RE.test(part)) throw new Error(`invalid name "${part}"`)
  }
  return join(root, ...parts)
}

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_FILE_BYTES + 64 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { rejectP(new Error('invalid JSON body')) }
    })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

async function walk(root, rel, out) {
  if (out.length >= MAX_ENTRIES) return
  const abs = join(root, rel)
  let entries = []
  try { entries = await readdir(abs, { withFileTypes: true }) } catch { return }
  entries.sort((a, b) => (a.isDirectory() === b.isDirectory()
    ? a.name.localeCompare(b.name)
    : a.isDirectory() ? -1 : 1))
  for (const ent of entries) {
    if (out.length >= MAX_ENTRIES) return
    if (ent.name.startsWith('.')) continue
    const childRel = rel ? `${rel}/${ent.name}` : ent.name
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue
      out.push({ path: childRel, type: 'dir' })
      await walk(root, childRel, out)
    } else if (ent.isFile()) {
      let size = 0
      try { size = (await stat(join(root, childRel))).size } catch { /* raced */ }
      out.push({ path: childRel, type: 'file', size, html: ['.html', '.htm'].includes(extname(ent.name).toLowerCase()) })
    }
  }
}

async function isDir(p) {
  try { return (await stat(p)).isDirectory() } catch { return false }
}

// â”€â”€ automation shim â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Injected into every served HTML page. Bridges agent commands (relayed by
// the plugin tab over postMessage) into the live page: clicks, fills, reads,
// eval, waits â€” and captures console error/warn plus runtime errors.

const SHIM_JS = [
  '(function(){',
  "if (window.__DSH_PROTOTYPE_SHIM__) return;",
  "window.__DSH_PROTOTYPE_SHIM__ = true;",
  "var buffer = [];",
  "var MAX = 200;",
  "function push(level, text) {",
  "  var entry = { level: level, text: String(text), time: new Date().toISOString() };",
  "  buffer.push(entry); if (buffer.length > MAX) buffer.shift();",
  "  try { parent.postMessage({ source: 'dsh-prototype-shim', console: entry }, '*'); } catch (e) {}",
  "}",
  "['error','warn'].forEach(function (level) {",
  "  var original = console[level].bind(console);",
  "  console[level] = function () {",
  "    var parts = []; for (var i = 0; i < arguments.length; i++) { try { parts.push(typeof arguments[i] === 'object' ? JSON.stringify(arguments[i]) : String(arguments[i])); } catch (e) { parts.push('[unserializable]'); } }",
  "    push(level, parts.join(' '));",
  "    original.apply(null, arguments);",
  "  };",
  "});",
  "window.addEventListener('error', function (e) { push('error', 'Uncaught: ' + e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0)); });",
  "window.addEventListener('unhandledrejection', function (e) { push('error', 'Unhandled rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || String(e.reason))); });",
  "function findByText(text) {",
  "  var nodes = document.querySelectorAll('button, a, [role=button], input[type=button], input[type=submit], label, li, span, div');",
  "  var needle = String(text).trim().toLowerCase();",
  "  for (var i = 0; i < nodes.length; i++) {",
  "    var t = (nodes[i].textContent || '').trim().toLowerCase();",
  "    if (t && t.indexOf(needle) !== -1 && nodes[i].offsetParent !== null) return nodes[i];",
  "  }",
  "  return null;",
  "}",
  "function one(el) { el.scrollIntoView({ block: 'center' }); el.click(); return { clicked: true, tag: el.tagName, text: (el.textContent || el.value || '').trim().slice(0, 120) }; }",
  "function setNative(el, value) {",
  "  var proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;",
  "  var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;",
  "  setter.call(el, value);",
  "  el.dispatchEvent(new Event('input', { bubbles: true }));",
  "  el.dispatchEvent(new Event('change', { bubbles: true }));",
  "}",
  "var ops = {",
  "  click: function (a) {",
  "    var el = a.selector ? document.querySelector(a.selector) : findByText(a.text);",
  "    if (!el) throw new Error('element not found: ' + (a.selector || a.text));",
  "    return one(el);",
  "  },",
  "  fill: function (a) {",
  "    var el = document.querySelector(a.selector);",
  "    if (!el) throw new Error('element not found: ' + a.selector);",
  "    setNative(el, String(a.value));",
  "    return { filled: true, value: String(a.value).slice(0, 120) };",
  "  },",
  "  read: function (a) {",
  "    var el = document.querySelector(a.selector);",
  "    if (!el) throw new Error('element not found: ' + a.selector);",
  "    if (a.attr) return el.getAttribute(a.attr);",
  "    return el.value !== undefined && el.tagName !== 'DIV' && el.tagName !== 'SPAN' ? el.value : (el.textContent || '').trim();",
  "  },",
  "  eval: function (a) {",
  "    var fn = new Function('return (' + a.code + ')');",
  "    return fn();",
  "  },",
  "  wait_for: function (a) {",
  "    var deadline = Date.now() + (a.timeoutMs || 5000);",
  "    return new Promise(function (resolveP, rejectP) {",
  "      (function check() {",
  "        var el = document.querySelector(a.selector);",
  "        if (el) return resolveP({ found: true });",
  "        if (Date.now() > deadline) return rejectP(new Error('wait_for timeout: ' + a.selector));",
  "        setTimeout(check, 120);",
  "      })();",
  "    });",
  "  },",
  "  console_dump: function () { return { entries: buffer }; },",
  "};",
  "window.addEventListener('message', function (e) {",
  "  var cmd = e.data;",
  "  if (!cmd || cmd.source !== 'dsh-prototype' || !cmd.id) return;",
  "  var op = ops[cmd.op];",
  "  if (!op) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: false, error: 'unknown op ' + cmd.op }, '*'); return; }",
  "  Promise.resolve().then(function () { return op(cmd); })",
  "    .then(function (result) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: true, result: result, consoleTail: buffer.slice(-20) }, '*'); })",
  "    .catch(function (err) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: false, error: String((err && err.message) || err) }, '*'); });",
  "});",
  "})();",
].join('\n')

/** Inject the shim tag before </body> (or append when the tag is absent). */
function injectShim(html) {
  const tag = '<script src="/prototype/shim.js"></script>'
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`)
  return html + tag
}

// â”€â”€ plugin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable â€” API not registered')
    return
  }

  // Single-slot automation state. One command in flight; results keyed by id
  // in a small ring so late readers still find them.
  let pending = null // { id, cmd, createdAt, delivered }
  const results = new Map() // id -> { ok, data?, error?, at }
  const resultsOrder = []
  const consoleRing = []

  function remember(id, entry) {
    results.set(id, entry)
    resultsOrder.push(id)
    while (resultsOrder.length > 50) results.delete(resultsOrder.shift())
  }

  function expirePending(now) {
    if (pending && now - pending.createdAt > CMD_TTL_MS) {
      remember(pending.id, { ok: false, error: 'command expired before execution', at: new Date().toISOString() })
      pending = null
    }
  }

  const apiHandler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/prototype/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }

    const workspace = workspaceOf(ctx, payload)
    const root = prototypeRoot(ctx, payload)
    try {
      switch (method) {
        case 'status':
          return json(res, 200, { ok: true, workspace, root, folder: PROTOTYPE_FOLDER, exists: existsSync(root) })
        case 'create_folder_root': {
          if (existsSync(root)) return json(res, 200, { ok: true, root, existed: true })
          await mkdir(root, { recursive: true })
          log(`created ${root}`)
          return json(res, 200, { ok: true, root, existed: false })
        }
        case 'list': {
          if (!existsSync(root)) return json(res, 200, { ok: true, exists: false, entries: [] })
          const entries = []
          await walk(root, '', entries)
          return json(res, 200, { ok: true, exists: true, entries })
        }
        case 'read': {
          const target = guardRel(root, payload.path)
          const st = await stat(target).catch(() => null)
          if (!st || st.isDirectory()) return json(res, 404, { ok: false, error: 'file not found' })
          if (st.size > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'file larger than 4 MiB' })
          return json(res, 200, { ok: true, content: await readFile(target, 'utf8') })
        }
        case 'write': {
          const target = guardRel(root, payload.path)
          const content = String(payload.content ?? '')
          if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'content larger than 4 MiB' })
          await mkdir(dirname(target), { recursive: true })
          await writeFile(target, content, 'utf8')
          log(`wrote ${target}`)
          return json(res, 200, { ok: true, path: relative(root, target).split(sep).join('/') })
        }
        case 'create_dir': {
          const target = guardRel(root, payload.path)
          if (existsSync(target)) return json(res, 409, { ok: false, error: `already exists: ${String(payload.path)}` })
          await mkdir(target, { recursive: true })
          return json(res, 200, { ok: true })
        }
        case 'delete': {
          const target = guardRel(root, payload.path)
          if (target === resolve(root)) throw new Error('cannot delete the prototype folder itself')
          if (!existsSync(target)) return json(res, 404, { ok: false, error: 'not found' })
          await rm(target, { recursive: true, force: true })
          return json(res, 200, { ok: true })
        }
        case 'rename': {
          const from = guardRel(root, payload.path)
          const name = String(payload.name ?? '')
          if (!NAME_RE.test(name)) throw new Error(`invalid name "${name}"`)
          const to = join(dirname(from), name)
          if (existsSync(to)) return json(res, 409, { ok: false, error: `already exists: ${name}` })
          await rename(from, to)
          return json(res, 200, { ok: true })
        }
        case 'open': {
          const target = guardRel(root, payload.path ?? '.')
          const editor = process.env.DSH_EDITOR || 'code'
          const child = spawn(editor, [target], { detached: true, stdio: 'ignore' })
          child.on('error', () => {})
          child.unref()
          return json(res, 200, { ok: true, editor })
        }
        // â”€â”€ automation â”€â”€
        case 'automation/submit': {
          expirePending(Date.now())
          if (pending) return json(res, 409, { ok: false, error: 'a command is already in flight' })
          const cmd = payload?.cmd
          if (!cmd || typeof cmd.op !== 'string') return json(res, 400, { ok: false, error: 'cmd.op required' })
          const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
          pending = { id, cmd, createdAt: Date.now(), delivered: false }
          return json(res, 200, { ok: true, id })
        }
        case 'automation/pending': {
          expirePending(Date.now())
          if (pending && !pending.delivered) {
            pending.delivered = true
            return json(res, 200, { ok: true, cmd: { id: pending.id, ...pending.cmd } })
          }
          return json(res, 200, { ok: true, cmd: null })
        }
        case 'automation/result': {
          const id = String(payload.id ?? '')
          if (pending && pending.id === id) pending = null
          let entry = { ok: !!payload.ok, data: payload.data ?? null, error: payload.error ?? null, at: new Date().toISOString() }
          // Full-screen screenshots arrive as a data URL; persist them under
          // prototype/.shots/ so the agent (and the human) can read the file.
          const dataUrl = entry.data && typeof entry.data.dataUrl === 'string' ? entry.data.dataUrl : null
          if (entry.ok && dataUrl?.startsWith('data:image/')) {
            const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
            const shotsDir = join(root, '.shots')
            await mkdir(shotsDir, { recursive: true })
            const name = `shot-${Date.now()}.png`
            await writeFile(join(shotsDir, name), Buffer.from(b64, 'base64'))
            entry = { ...entry, data: { ...entry.data, saved: `${PROTOTYPE_FOLDER}/.shots/${name}` } }
            log(`screenshot saved: ${name}`)
          }
          remember(id, entry)
          return json(res, 200, { ok: true })
        }
        case 'automation/wait': {
          const id = String(payload.id ?? '')
          const deadline = Date.now() + Math.min(Number(payload.timeoutMs) || WAIT_MAX_MS, WAIT_MAX_MS)
          while (Date.now() < deadline) {
            if (results.has(id)) return json(res, 200, { ok: true, result: results.get(id) })
            await new Promise((r) => setTimeout(r, 120))
          }
          return json(res, 200, { ok: false, error: 'timeout waiting for command result' })
        }
        case 'automation/results':
          return json(res, 200, { ok: true, results: resultsOrder.map((id) => ({ id, ...results.get(id) })) })
        case 'automation/console':
          return json(res, 200, { ok: true, entries: consoleRing.slice(-200) })
        case 'automation/console_push': {
          for (const entry of Array.isArray(payload.entries) ? payload.entries : []) {
            consoleRing.push({ level: String(entry.level ?? 'log'), text: String(entry.text ?? ''), time: String(entry.time ?? new Date().toISOString()) })
          }
          while (consoleRing.length > 200) consoleRing.shift()
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  // GET file server for the iframe: correct MIME for every asset, shim
  // injected into HTML. Same-origin, so relative navigation just works.
  const fileHandler = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, error: 'GET only' })
    const url = new URL(req.url ?? '/', 'http://local')
    const root = prototypeRoot(ctx, payload)
    try {
      const target = guardRel(root, decodeURIComponent(url.pathname.slice('/prototype/file/'.length)))
      const st = await stat(target).catch(() => null)
      if (!st || st.isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end('not found')
      }
      if (st.size > MAX_FILE_BYTES) {
        res.writeHead(413, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end('too large')
      }
      const ext = extname(target).toLowerCase()
      const mime = MIME[ext] ?? 'application/octet-stream'
      const buf = await readFile(target)
      if (ext === '.html' || ext === '.htm') {
        res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
        return res.end(injectShim(buf.toString('utf8')))
      }
      res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
      return res.end(req.method === 'HEAD' ? undefined : buf)
    } catch (e) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end(String((e && e.message) || e))
    }
  }

  const shimHandler = async (req, res) => {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'GET only' })
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' })
    res.end(SHIM_JS)
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/api', handler: apiHandler }), 'dsh-prototype: api')
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/shim.js', handler: shimHandler }), 'dsh-prototype: shim')
  // No trailing slash: the webserver prefix contract is `p` or `p/<anything>`.
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/file', handler: fileHandler }), 'dsh-prototype: files')
  log('loaded')
  log('/prototype/api, /prototype/file/, /prototype/shim.js registered')
}
