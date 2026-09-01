// dsh-prototype host half: serves the workspace `prototype/` folder over a
// same-origin route (so relative links, css, js and localStorage all work),
// injects the automation shim into every served HTML page, and connects the tab
// to the command queue agents use to drive the live browser view.
//
// What is local stays local: the file server, the `prototype/` CRUD, the
// same-origin iframe, the screen capture and `open` in the editor all need the
// user's own machine. The queue, the console ring, the stored screenshots and
// the shim source live in the plugin library on the VPS — configure
// `config.endpoint` and this plugin becomes their proxy, so the API the agent
// and the tab call does not move.

import { readFile, writeFile, readdir, mkdir, rm, rename, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative, dirname, sep, basename, extname } from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolveLoginAuthorization } from 'dsh-login/vps-auth'

export const inject = ['webServer', 'sessions']

/**
 * Plugin config.
 *
 * `endpoint` decides where the queue runs, once, at load — there is no runtime
 * fallback between the two. Configured: every automation call is proxied to the
 * plugin library, authenticated as whoever signed in through dsh-login.
 * Absent: the queue stays in this process, which is the offline mode the plugin
 * shipped with — one client, nothing durable, gone on restart.
 * @typedef {object} Config
 * @property {string} [endpoint] Base URL of the library's prototype plugin,
 *   e.g. `https://vps/api/plugins/prototype`. Sub-paths are appended to it.
 * @property {number} [timeoutMs] Deadline for a library request other than the
 *   `wait` long-poll, which gets its own budget on top of the awaited command.
 */

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
 * ({sessionId, cwd}); explicit cwd wins, then the session's own `header.cwd`,
 * then the process cwd.
 *
 * The session is resolved by direct lookup, the same way the rest of the app
 * resolves it. Scanning `list()` for a matching id resolved nothing here, and
 * the fallback then served the SERVER's cwd — a different workspace than the
 * one the tab is showing whenever `dsh web` was started outside it, which shows
 * up as an existing prototype folder reported as missing.
 *
 * `process.cwd()` is reached only when the request carries no session at all;
 * an unresolvable session id is logged rather than silently answered with
 * another directory's files.
 */
function workspaceOf(ctx, payload) {
  const cwd = typeof payload?.cwd === 'string' ? payload.cwd.trim() : ''
  if (cwd && resolve(cwd) === cwd) return cwd
  const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : ''
  if (sessionId) {
    let headerCwd
    try {
      headerCwd = ctx.sessions?.get?.(sessionId)?.header?.cwd
    } catch {
      // `ctx.sessions` throws when no sessions service is mounted at all (a
      // harness assembled without one); every other outcome is `undefined`.
    }
    if (typeof headerCwd === 'string' && headerCwd) return headerCwd
    log(`session "${sessionId}" has no cwd - falling back to ${process.cwd()}`)
  }
  return process.cwd()
}

/**
 * Opaque, stable handle for one workspace. The file route is reached by the
 * iframe and by the relative links inside it, and neither can carry the JSON
 * scope the API routes receive — so the workspace travels in the URL path as
 * this token, and relative navigation stays pinned to the workspace that
 * minted it. Only workspaces the tab has reported are resolvable, so the route
 * cannot be pointed at an arbitrary directory.
 */
function scopeToken(workspace) {
  return createHash('sha256').update(workspace).digest('hex').slice(0, 16)
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
// eval, waits - and captures console error/warn plus runtime errors.
//
// The source of record is the plugin library (`plugins/prototype/shim.ts`), so
// a fix to the browser-side automation ships by deploying the VPS rather than
// by reinstalling this plugin on every machine. The copy below is the frozen
// fallback served when no endpoint is configured or the library is unreachable;
// it is what this plugin can still guarantee offline.

/** Version of the frozen copy below. The library's copy carries its own. */
const BUNDLED_SHIM_VERSION = '1'

const BUNDLED_SHIM_JS = [
  '(function(){',
  "if (window.__DSH_PROTOTYPE_SHIM__) return;",
  `window.__DSH_PROTOTYPE_SHIM__ = ${JSON.stringify(BUNDLED_SHIM_VERSION)};`,
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

// -- automation backend ------------------------------------------------------
// One seam, two implementations, chosen once at load. Both answer the same
// `{code, body}` the local API returns, so the route handler dispatches to
// either without knowing which is mounted.

/** Methods the tab and the agent may call. Anything else is a 404 at the route. */
const AUTOMATION_METHODS = new Set([
  'submit', 'pending', 'result', 'wait', 'results', 'console', 'console_push',
])

/**
 * Reject a malformed endpoint at load rather than on the first command.
 * @param {string} endpoint - the configured base URL.
 * @returns {URL} the parsed base.
 * @throws {Error} when the value is not an absolute http(s) URL.
 */
function resolveEndpoint(endpoint) {
  let url
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error(`dsh-prototype: endpoint is not an absolute URL: ${endpoint}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`dsh-prototype: endpoint must be http(s), got ${url.protocol}`)
  }
  // A trailing slash makes `new URL('automation/submit', base)` keep the base
  // path instead of replacing its last segment.
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url
}

/**
 * The in-process queue: one command in flight, results in a small ring, console
 * in another. This is the whole backend when no endpoint is configured.
 * @returns {{call: (method: string, payload: object, scope: object) => Promise<{code: number, body: object}>}}
 */
function createLocalQueue() {
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

  return {
    async call(method, payload, scope) {
      switch (method) {
        case 'submit': {
          expirePending(Date.now())
          if (pending) return { code: 409, body: { ok: false, error: 'a command is already in flight' } }
          const cmd = payload?.cmd
          if (!cmd || typeof cmd.op !== 'string') return { code: 400, body: { ok: false, error: 'cmd.op required' } }
          const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
          pending = { id, cmd, createdAt: Date.now(), delivered: false }
          return { code: 200, body: { ok: true, id } }
        }
        case 'pending': {
          expirePending(Date.now())
          if (pending && !pending.delivered) {
            pending.delivered = true
            return { code: 200, body: { ok: true, cmd: { id: pending.id, ...pending.cmd } } }
          }
          return { code: 200, body: { ok: true, cmd: null } }
        }
        case 'result': {
          const id = String(payload.id ?? '')
          if (pending && pending.id === id) pending = null
          const { data } = await cacheShot(scope.root, payload)
          remember(id, { ok: !!payload.ok, data, error: payload.error ?? null, at: new Date().toISOString() })
          return { code: 200, body: { ok: true } }
        }
        case 'wait': {
          const id = String(payload.id ?? '')
          const deadline = Date.now() + Math.min(Number(payload.timeoutMs) || WAIT_MAX_MS, WAIT_MAX_MS)
          while (Date.now() < deadline) {
            if (results.has(id)) return { code: 200, body: { ok: true, result: results.get(id) } }
            await new Promise((r) => setTimeout(r, 120))
          }
          return { code: 200, body: { ok: false, error: 'timeout waiting for command result' } }
        }
        case 'results':
          return { code: 200, body: { ok: true, results: resultsOrder.map((id) => ({ id, ...results.get(id) })) } }
        case 'console':
          return { code: 200, body: { ok: true, entries: consoleRing.slice(-200) } }
        case 'console_push': {
          for (const entry of Array.isArray(payload.entries) ? payload.entries : []) {
            consoleRing.push({ level: String(entry.level ?? 'log'), text: String(entry.text ?? ''), time: String(entry.time ?? new Date().toISOString()) })
          }
          while (consoleRing.length > 200) consoleRing.shift()
          return { code: 200, body: { ok: true } }
        }
        default:
          return { code: 404, body: { ok: false, error: `unknown method "automation/${method}"` } }
      }
    },
  }
}

/** What the caller is told when there is no session to authenticate with. */
const NO_SESSION_TEXT = {
  'absent': 'No one is signed in, so there is no credential for the plugin library. Sign in in the app and try again.',
  'expired': 'The signed-in session expired. Sign in again and try again.',
  'no-store': 'This harness mounts no credential store, so a sign-in has nowhere to be recorded. Mount dsh-credentials-local.',
  'malformed': 'The stored session record could not be read. Sign out and in again.',
}

/**
 * The library-backed queue: every call is proxied to the VPS as the signed-in
 * user, and the workspace travels as its opaque token so no local path leaves
 * the machine.
 *
 * A screenshot is written to `prototype/.shots/` on the way through and the
 * relative path rides along in `data.saved`, because the agent reads the PNG as
 * a file. The durable copy is the library's; the local one is a cache.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context, for credentials.
 * @param {URL} base - validated endpoint base.
 * @param {number} timeoutMs - deadline for a request other than `wait`.
 * @returns {{call: (method: string, payload: object, scope: object) => Promise<{code: number, body: object}>}}
 */
function createRemoteQueue(ctx, base, timeoutMs) {
  return {
    async call(method, payload, scope) {
      if (!AUTOMATION_METHODS.has(method)) {
        return { code: 404, body: { ok: false, error: `unknown method "automation/${method}"` } }
      }
      const authorization = await resolveLoginAuthorization(ctx.get('credentials'), Date.now())
      if (!authorization.ok) {
        return { code: 401, body: { ok: false, error: NO_SESSION_TEXT[authorization.reason] } }
      }
      const body = { ...payload, workspace: scope.token }
      if (method === 'result') {
        // The image goes up so the library can store it; `data` already names
        // the local cache copy the agent reads.
        const { data, dataUrl } = await cacheShot(scope.root, payload)
        body.data = dataUrl ? { ...data, dataUrl } : data
      }
      // The long-poll is bounded by the library, so its deadline is that budget
      // plus one ordinary timeout of slack for the round trip.
      const budget = method === 'wait' ? WAIT_MAX_MS + timeoutMs : timeoutMs
      let response
      try {
        response = await fetch(new URL(`automation/${method}`, base), {
          method: 'POST',
          signal: AbortSignal.timeout(budget),
          headers: {
            'content-type': 'application/json',
            authorization: authorization.authorization,
            accept: 'application/json',
          },
          body: JSON.stringify(body),
        })
      } catch (e) {
        return { code: 502, body: { ok: false, error: `plugin library unreachable: ${String((e && e.message) || e)}` } }
      }
      let parsed
      try {
        parsed = await response.json()
      } catch {
        return { code: 502, body: { ok: false, error: `plugin library answered ${response.status} with a non-JSON body` } }
      }
      return { code: response.status, body: parsed }
    },
  }
}

/**
 * Write a screenshot result to `prototype/.shots/` and name it in the payload.
 *
 * The agent reads the capture as a file, so the PNG has to land on the machine
 * the agent runs on, whichever backend stores it durably.
 *
 * The `data:` URL is split out rather than recorded: it is megabytes of base64
 * that only the durable store needs, and leaving it in the result would put the
 * whole image in front of the model on every read of the queue.
 * @param {string} root - the workspace's `prototype/` folder.
 * @param {object} payload - the `automation/result` payload from the tab.
 * @returns {Promise<{data: unknown, dataUrl: string | null}>} the data to
 *   record, carrying `saved` when a file was written, and the image to upload.
 */
async function cacheShot(root, payload) {
  const data = payload.data ?? null
  const dataUrl = data && typeof data.dataUrl === 'string' ? data.dataUrl : null
  if (!payload.ok || !dataUrl?.startsWith('data:image/')) return { data, dataUrl: null }
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const shotsDir = join(root, '.shots')
  await mkdir(shotsDir, { recursive: true })
  const name = `shot-${Date.now()}.png`
  await writeFile(join(shotsDir, name), Buffer.from(b64, 'base64'))
  log(`screenshot saved: ${name}`)
  const { dataUrl: _image, ...rest } = data
  return { data: { ...rest, saved: `${PROTOTYPE_FOLDER}/.shots/${name}` }, dataUrl }
}

/**
 * Resolve the shim served at `/prototype/shim.js`.
 *
 * The library's copy wins and is cached for the process; the bundled copy is
 * the answer when no endpoint is configured, nobody is signed in, or the
 * library cannot be reached. Which one is in use is logged the first time,
 * because a stale shim explains automation failures that look like page bugs.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context, for credentials.
 * @param {URL | null} base - validated endpoint base, or null in offline mode.
 * @param {number} timeoutMs - request deadline.
 * @returns {() => Promise<string>} reader for the current shim source.
 */
function createShimSource(ctx, base, timeoutMs) {
  let cached = null
  if (!base) {
    log(`shim: bundled copy v${BUNDLED_SHIM_VERSION} (no endpoint configured)`)
    return async () => BUNDLED_SHIM_JS
  }
  return async () => {
    if (cached) return cached
    const authorization = await resolveLoginAuthorization(ctx.get('credentials'), Date.now())
    if (!authorization.ok) {
      log(`shim: bundled copy v${BUNDLED_SHIM_VERSION} (${authorization.reason} session)`)
      return BUNDLED_SHIM_JS
    }
    try {
      const response = await fetch(new URL('shim', base), {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: authorization.authorization, accept: 'text/javascript' },
      })
      if (!response.ok) throw new Error(`answered ${response.status}`)
      cached = await response.text()
      log(`shim: library copy v${response.headers.get('x-shim-version') ?? '?'}`)
      return cached
    } catch (e) {
      log(`shim: bundled copy v${BUNDLED_SHIM_VERSION} (library unreachable: ${String((e && e.message) || e)})`)
      return BUNDLED_SHIM_JS
    }
  }
}

/** Inject the shim tag before </body> (or append when the tag is absent). */
function injectShim(html) {
  const tag = '<script src="/prototype/shim.js"></script>'
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`)
  return html + tag
}

// â”€â”€ plugin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function apply(ctx, config = {}) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable - API not registered')
    return
  }

  // Where the queue runs is decided here, once. A bad endpoint fails the load
  // rather than the first command the agent sends.
  const timeoutMs = config.timeoutMs ?? 10_000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`dsh-prototype: timeoutMs must be a positive finite number, got ${config.timeoutMs}`)
  }
  const base = config.endpoint ? resolveEndpoint(config.endpoint) : null
  const queue = base
    ? createRemoteQueue(ctx, base, timeoutMs)
    : createLocalQueue()
  const readShim = createShimSource(ctx, base, timeoutMs)
  log(base ? `automation queue: plugin library at ${base.href}` : 'automation queue: in-process (no endpoint configured)')

  // token -> workspace, filled by every API request (the tab polls the queue,
  // so a live tab re-registers its workspace continuously).
  const scopes = new Map()

  const apiHandler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/prototype/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }

    const workspace = workspaceOf(ctx, payload)
    const root = join(workspace, PROTOTYPE_FOLDER)
    const token = scopeToken(workspace)
    scopes.set(token, workspace)
    try {
      switch (method) {
        case 'status':
          return json(res, 200, { ok: true, workspace, root, token, folder: PROTOTYPE_FOLDER, exists: existsSync(root) })
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
        default: {
          // Everything under automation/ belongs to the queue backend, wherever
          // it runs. The scope carries the workspace token the library indexes
          // by and the local folder a screenshot is cached into.
          if (method.startsWith('automation/')) {
            const { code, body } = await queue.call(method.slice('automation/'.length), payload, { token, root })
            return json(res, code, body)
          }
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
        }
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
    // `/prototype/file/<scope token>/<path>`: the token pins the request to the
    // workspace the tab is showing, and rides along on relative navigation.
    const rest = url.pathname.slice('/prototype/file/'.length)
    const cut = rest.indexOf('/')
    const workspace = scopes.get(cut === -1 ? rest : rest.slice(0, cut))
    if (!workspace) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('unknown workspace — reload the Prototype tab')
    }
    const root = join(workspace, PROTOTYPE_FOLDER)
    try {
      const target = guardRel(root, decodeURIComponent(cut === -1 ? '' : rest.slice(cut + 1)))
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
    res.end(await readShim())
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/api', handler: apiHandler }), 'dsh-prototype: api')
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/shim.js', handler: shimHandler }), 'dsh-prototype: shim')
  // No trailing slash: the webserver prefix contract is `p` or `p/<anything>`.
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/prototype/file', handler: fileHandler }), 'dsh-prototype: files')
  log('loaded')
  log('/prototype/api, /prototype/file/, /prototype/shim.js registered')
}
