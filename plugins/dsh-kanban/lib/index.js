// dsh-kanban host half: reads the workspace's mds/epics/*/*06-tickets/*.md
// files and moves tickets between statuses by rewriting one frontmatter line.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const inject = ['webServer', 'sessions']

export const STATUSES = ['active', 'in_progress', 'code_test', 'human_test', 'done']

const NAME_RE = /^[^\\/:*?"<>|\x00-\x1f]+$/

function log(msg) {
  console.log(`[dsh-kanban] ${msg}`)
}

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
      if (size > 256 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return }
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

/** Pull `status:` and `title:` out of a ticket's frontmatter (lenient). */
function parseTicket(text, fileName) {
  const out = { status: 'active', title: fileName.replace(/\.md$/i, ''), hasFm: false }
  if (!text.startsWith('---')) {
    const h = /^#\s+(.+)$/m.exec(text)
    if (h) out.title = h[1].trim()
    return out
  }
  const end = text.slice(3).search(/^---\r?\n/m)
  if (end < 0) return out
  out.hasFm = true
  const fm = text.slice(3, end + 3)
  const sm = /^status:\s*(.+)$/m.exec(fm)
  if (sm && STATUSES.includes(sm[1].trim())) out.status = sm[1].trim()
  const tm = /^title:\s*(.+)$/m.exec(fm)
  if (tm) {
    let v = tm[1].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out.title = v
    return out
  }
  const h = /^#\s+(.+)$/m.exec(text.slice(end + 3))
  if (h) out.title = h[1].trim()
  return out
}

async function scanBoard(mds) {
  const epicsDir = join(mds, 'epics')
  if (!existsSync(epicsDir)) return { mdsExists: existsSync(mds), epics: [] }
  let dirs = []
  try { dirs = await readdir(epicsDir, { withFileTypes: true }) } catch { return { mdsExists: true, epics: [] } }
  const epics = []
  for (const dir of dirs) {
    if (!dir.isDirectory() || dir.name.startsWith('.')) continue
    const ticketsDir = join(epicsDir, dir.name, '06-tickets')
    if (!existsSync(ticketsDir)) continue
    let files = []
    try { files = await readdir(ticketsDir) } catch { continue }
    const tickets = []
    for (const f of files.sort()) {
      if (!f.toLowerCase().endsWith('.md') || f.startsWith('.')) continue
      const fp = join(ticketsDir, f)
      const st = await stat(fp).catch(() => null)
      if (!st || !st.isFile()) continue
      try {
        const parsed = parseTicket((await readFile(fp, 'utf8')).replace(/^\uFEFF/, ''), f)
        tickets.push({ file: f, path: `${dir.name}/06-tickets/${f}`, epic: dir.name, title: parsed.title, status: parsed.status })
      } catch { /* unreadable ticket: skip */ }
    }
    epics.push({ name: dir.name, tickets })
  }
  return { mdsExists: true, epics }
}

/** Rewrite only the `status:` line inside the existing frontmatter block. */
function setStatusLine(text, status) {
  if (!text.startsWith('---')) throw new Error('ticket has no frontmatter')
  const end = text.slice(3).search(/^---\r?\n/m)
  if (end < 0) throw new Error('ticket has malformed frontmatter')
  const head = text.slice(0, end + 3)
  const rest = text.slice(end + 3)
  if (/^status:.*$/m.test(head)) {
    const updated = head.replace(/^status:.*$/m, `status: ${status}`)
    return updated + rest
  }
  return head.replace(/\r?\n$/, '') + `\nstatus: ${status}\n---\n` + rest
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') return

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/kanban/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    const mds = join(workspaceOf(ctx, payload), 'mds')
    try {
      switch (method) {
        case 'board':
          return json(res, 200, { ok: true, ...await scanBoard(mds) })
        case 'move': {
          const rel = String(payload.path ?? '')
          const status = String(payload.status ?? '')
          const segments = rel.split('/')
          if (segments.length < 2 || segments.some((p) => !p || p === '..' || !NAME_RE.test(p))) throw new Error('invalid path')
          if (!STATUSES.includes(status)) throw new Error(`invalid status "${status}"`)
          const target = join(mds, 'epics', ...rel.split('/'))
          if (!existsSync(target)) return json(res, 404, { ok: false, error: 'ticket not found' })
          const text = (await readFile(target, 'utf8')).replace(/^\uFEFF/, '')
          await writeFile(target, setStatusLine(text, status), 'utf8')
          log(`moved ${rel} -> ${status}`)
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/kanban/api', handler }), 'dsh-kanban: api')
  log('loaded — /kanban/api registered')
}
