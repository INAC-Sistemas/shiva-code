// dsh-mds host half: CRUD over one workspace-root folder (`mds/`) that holds
// the project's markdown artifacts. Every path the API accepts is relative and
// guarded to stay inside that folder, so the same endpoints can back agent
// tools later without widening the blast radius.

import { readFile, writeFile, readdir, mkdir, rm, rename, stat, realpath } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative, dirname, sep, basename, extname } from 'node:path'
import { spawn } from 'node:child_process'

export const inject = ['webServer', 'sessions']

/** The folder this plugin owns, fixed by convention so agents can rely on it. */
export const MDS_FOLDER = 'mds'

const MAX_FILE_BYTES = 512 * 1024
const MAX_ENTRIES = 2000
const NAME_RE = /^[^\\/:*?"<>|\x00-\x1f]+$/
const SKIP_DIRS = new Set(['node_modules', '.git'])

function log(msg) {
  console.log(`[dsh-mds] ${msg}`)
}

/**
 * The workspace for one request. The tab sends the ACTIVE session's scope
 * ({sessionId, cwd} from better-sidebar), which wins: "first session in the
 * list" is whoever booted first, not what the user is looking at. Order:
 * explicit cwd → session matching the id → process cwd.
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

function mdsRoot(ctx, payload) {
  return join(workspaceOf(ctx, payload), MDS_FOLDER)
}

/**
 * Resolve one guard-approved absolute path from a relative request path.
 * Rejects absolute paths, `..` segments, and names the filesystem forbids.
 */
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
      if (size > MAX_FILE_BYTES + 16 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { rejectP(new Error('invalid JSON body')) }
    })
    req.on('error', rejectP)
  })
}

/** Same-origin fence: a browser Origin must match the serving Host. */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

/** Depth-first entry walk, capped, stable order: folders first, then files. */
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
      let mtime = 0
      try { const st = await stat(join(root, childRel)); size = st.size; mtime = st.mtimeMs } catch { /* raced */ }
      out.push({ path: childRel, type: 'file', size, mtime, md: extname(ent.name).toLowerCase() === '.md' })
    }
  }
}

async function isDir(p) {
  try { return (await stat(p)).isDirectory() } catch { return false }
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/mds/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }

    const workspace = workspaceOf(ctx, payload)
    const root = mdsRoot(ctx, payload)
    try {
      switch (method) {
        case 'status': {
          return json(res, 200, { ok: true, workspace, root, folder: MDS_FOLDER, exists: existsSync(root) })
        }
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
          if (st.size > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'file larger than 512 KiB' })
          return json(res, 200, { ok: true, content: await readFile(target, 'utf8'), size: st.size, mtime: st.mtimeMs })
        }
        case 'write': {
          const target = guardRel(root, payload.path)
          if (basename(target) === '' ) throw new Error('path required')
          const content = String(payload.content ?? '')
          if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'content larger than 512 KiB' })
          await mkdir(dirname(target), { recursive: true })
          const existed = existsSync(target)
          await writeFile(target, content, 'utf8')
          log(`${existed ? 'updated' : 'created'} ${target}`)
          return json(res, 200, { ok: true, path: relative(root, target).split(sep).join('/') })
        }
        case 'create_dir': {
          const target = guardRel(root, payload.path)
          if (existsSync(target)) return json(res, 409, { ok: false, error: `already exists: ${String(payload.path)}` })
          await mkdir(target, { recursive: true })
          log(`created dir ${target}`)
          return json(res, 200, { ok: true })
        }
        case 'delete': {
          const target = guardRel(root, payload.path)
          if (target === resolve(root)) throw new Error('cannot delete the mds folder itself')
          if (!existsSync(target)) return json(res, 404, { ok: false, error: 'not found' })
          await rm(target, { recursive: true, force: true })
          log(`deleted ${target}`)
          return json(res, 200, { ok: true })
        }
        case 'rename': {
          const from = guardRel(root, payload.path)
          const name = String(payload.name ?? '')
          if (!NAME_RE.test(name) || name !== name.trim()) throw new Error(`invalid name "${name}"`)
          const to = join(dirname(from), name)
          if (existsSync(to)) return json(res, 409, { ok: false, error: `already exists: ${name}` })
          await rename(from, to)
          log(`renamed ${from} -> ${to}`)
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
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/mds/api', handler }), 'dsh-mds: api')
  log('loaded')
  log('/mds/api route registered')
}
