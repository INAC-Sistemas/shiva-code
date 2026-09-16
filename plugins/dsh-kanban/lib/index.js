// dsh-kanban host half: a read/move API over the project's implementation
// tickets. Tickets live at `mds/epics/<epic>/06-tickets/NN-<slug>.md` and
// carry the frontmatter contract the 06-tickets skill writes (`ticket`,
// `epic`, `status`, `title`). The board reads that frontmatter; `move`
// rewrites only the `status:` line so every other byte of the ticket stays
// untouched. Agents edit the same files directly, so the board is a view over
// the filesystem, never a second source of truth.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, extname } from 'node:path'

export const inject = ['webServer', 'sessions']

/** The folder this plugin reads, fixed by convention so agents can rely on it. */
export const MDS_FOLDER = 'mds'

/** The epic-relative path of a ticket file. */
export const TICKETS_RE = /^epics\/[^/]+\/06-tickets\/[^/]+\.md$/

/**
 * Canonical board columns. `done` is the human's move on the board; agents
 * stop at `human_test` (06-tickets: "Never write `status: done`").
 */
export const STATUSES = ['active', 'in_progress', 'code_test', 'human_test', 'done']

const MAX_FILE_BYTES = 512 * 1024
const MAX_TICKETS = 2000

function log(msg) {
  console.log(`[dsh-kanban] ${msg}`)
}

/**
 * The workspace for one request. The tab sends the ACTIVE session's scope
 * ({sessionId, cwd} from better-sidebar), which wins: "first session in the
 * list" is whoever booted first, not what the user is looking at. Order:
 * explicit cwd → session matching the id → process cwd.
 */
function workspaceOf(ctx, payload) {
  // The session's own cwd is authoritative: the client-supplied `cwd` can be the
  // harness launch root (a desktop-only directory) while the conversation lives
  // in a workspace. Resolve the session first, and fall back to the hint only
  // when the session is unknown to this backend.
  try {
    const sessions = ctx.get('sessions')
    for (const s of sessions?.list() ?? []) {
      const sid = s?.id ?? s?.header?.id ?? s?.sessionId
      const scwd = s?.header?.cwd
      if (payload?.sessionId && sid === payload.sessionId && typeof scwd === 'string' && scwd) return scwd
    }
  } catch { /* sessions unavailable */ }
  const cwd = typeof payload?.cwd === 'string' ? payload.cwd.trim() : ''
  if (cwd && resolve(cwd) === cwd) return cwd
  return process.cwd()
}

function mdsRoot(ctx, payload) {
  return join(workspaceOf(ctx, payload), MDS_FOLDER)
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

/**
 * Parse one ticket's YAML frontmatter with a flat `key: value` reader. The
 * 06-tickets template writes only scalars, so a full YAML parser would be
 * unneeded surface; surrounding quotes are stripped and everything else is
 * kept verbatim.
 */
function parseFrontmatter(content) {
  const text = content.replace(/^\uFEFF/, '')
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (!m) return { data: {}, has: false }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!kv) continue
    let v = kv[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    data[kv[1]] = v
  }
  return { data, has: true }
}

/**
 * Return `content` with the frontmatter `status:` set to `status`, changing
 * only that line. Missing frontmatter gets a minimal block; a block without a
 * status line gets one appended before its closing fence.
 */
function withStatus(content, status) {
  const text = content.replace(/^\uFEFF/, '')
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text)
  if (!m) return `---\nstatus: ${status}\n---\n\n${text}`
  let block = m[1]
  if (/^status\s*:/m.test(block)) block = block.replace(/^status\s*:.*$/m, `status: ${status}`)
  else block = block.replace(/\s*$/, '') + `\nstatus: ${status}`
  return `---\n${block}\n---${m[2]}${text.slice(m[0].length)}`
}

/** Resolve one guard-approved absolute ticket path from a relative request path. */
function ticketPath(root, rel) {
  const value = String(rel ?? '').replaceAll('\\', '/').replace(/^\/+/, '')
  if (!TICKETS_RE.test(value) || value.includes('..')) throw new Error('invalid ticket path')
  return join(root, ...value.split('/'))
}

/**
 * Scan every epic's `06-tickets/` folder and return one card per ticket,
 * ordered by epic then the ticket's numeric filename prefix. Unreadable files
 * are skipped rather than failing the whole board.
 */
async function scanTickets(root) {
  const epicsDir = join(root, 'epics')
  let epics = []
  try { epics = await readdir(epicsDir, { withFileTypes: true }) } catch { return [] }
  const cards = []
  for (const epic of epics) {
    if (cards.length >= MAX_TICKETS) break
    if (!epic.isDirectory() || epic.name.startsWith('.')) continue
    const ticketsDir = join(epicsDir, epic.name, '06-tickets')
    let files = []
    try { files = await readdir(ticketsDir, { withFileTypes: true }) } catch { continue }
    for (const f of files) {
      if (cards.length >= MAX_TICKETS) break
      if (!f.isFile() || extname(f.name).toLowerCase() !== '.md') continue
      let content = ''
      let mtime = 0
      try {
        const abs = join(ticketsDir, f.name)
        const st = await stat(abs)
        if (st.size > MAX_FILE_BYTES) continue
        mtime = st.mtimeMs
        content = await readFile(abs, 'utf8')
      } catch { continue }
      const fm = parseFrontmatter(content)
      const prefix = /^(\d+)/.exec(f.name)
      cards.push({
        file: `epics/${epic.name}/06-tickets/${f.name}`,
        name: f.name,
        epic: fm.data.epic || epic.name,
        ticket: fm.data.ticket || f.name.replace(/\.md$/i, ''),
        title: fm.data.title || '',
        status: fm.data.status || '',
        order: prefix ? Number(prefix[1]) : 9999,
        mtime,
      })
    }
  }
  cards.sort((a, b) => (a.epic.localeCompare(b.epic) || a.order - b.order || a.name.localeCompare(b.name)))
  return cards
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/kanban/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }

    const workspace = workspaceOf(ctx, payload)
    const root = mdsRoot(ctx, payload)
    try {
      switch (method) {
        case 'status': {
          return json(res, 200, { ok: true, workspace, root, folder: MDS_FOLDER, exists: existsSync(root), statuses: STATUSES })
        }
        case 'list': {
          if (!existsSync(root)) return json(res, 200, { ok: true, exists: false, cards: [], statuses: STATUSES })
          const cards = await scanTickets(root)
          return json(res, 200, { ok: true, exists: true, cards, statuses: STATUSES })
        }
        case 'read': {
          const target = ticketPath(root, payload.file)
          const st = await stat(target).catch(() => null)
          if (!st || st.isDirectory()) return json(res, 404, { ok: false, error: 'ticket not found' })
          if (st.size > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'ticket larger than 512 KiB' })
          return json(res, 200, { ok: true, content: await readFile(target, 'utf8'), size: st.size, mtime: st.mtimeMs })
        }
        case 'move': {
          const status = String(payload.status ?? '')
          if (!STATUSES.includes(status)) return json(res, 400, { ok: false, error: `invalid status "${status}"` })
          const target = ticketPath(root, payload.file)
          const st = await stat(target).catch(() => null)
          if (!st || st.isDirectory()) return json(res, 404, { ok: false, error: 'ticket not found' })
          const content = await readFile(target, 'utf8')
          const before = parseFrontmatter(content).data.status || ''
          if (before === status) return json(res, 200, { ok: true, file: payload.file, status, changed: false })
          await writeFile(target, withStatus(content, status), 'utf8')
          log(`moved ${payload.file} ${before || '(none)'} -> ${status}`)
          return json(res, 200, { ok: true, file: payload.file, status, changed: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/kanban/api', handler }), 'dsh-kanban: api')
  log('loaded')
  log('/kanban/api route registered')
}
