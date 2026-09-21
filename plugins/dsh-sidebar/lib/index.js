// dsh-sidebar host half: the agent's control of the sidebar tabs. The client
// half owns the better-sidebar service (list/focus/close/open); this host half
// relays one command at a time and returns the client's answer to the tool.
//
// It also owns AUTO-OPEN: the one place that opens a sidebar tab because an
// agent created a file. Rules come from config (`autoOpen`), one observer
// watches the tool pipeline, and one channel carries the events to the client.

import { defineTool } from '@deepseek-ai/dsh-tools'
import { AutoOpenBoard, compileAutoOpen, writeTargetOf } from './auto-open.js'

export const inject = ['webServer', 'tools']

let seq = 0
let pending = null
const waiters = new Map()

function log(msg) {
  console.log(`[dsh-sidebar] ${msg}`)
}

/** Queue one command for the client and await its answer (bounded). */
function issue(cmd) {
  const id = String(++seq)
  pending = { id, ...cmd }
  return new Promise((resolveP) => {
    waiters.set(id, resolveP)
    setTimeout(() => {
      if (waiters.has(id)) {
        waiters.delete(id)
        resolveP({ ok: false, error: 'timeout — a interface da sidebar não respondeu' })
      }
      if (pending && pending.id === id) pending = null
    }, 12000)
  })
}

function settle(id, result) {
  const key = String(id)
  const waiter = waiters.get(key)
  if (waiter) { waiters.delete(key); waiter(result) }
  if (pending && pending.id === key) pending = null
}

/** Ops the agent tool exposes. */
const SIDEBAR_OPS = ['list', 'focus', 'close', 'open']

function createTool() {
  return defineTool({
    name: 'sidebar',
    description:
      'Control the sidebar tabs of this session. ops: list (open tabs with ids + which is active, and every available tab type) · ' +
      'focus (bring a tab to the front; give its id) · close (close a tab; give its id) · open (open a tab by type, optionally at a ' +
      'url for the browser tab). Call op=list first to get real ids. Tab ids look like "dsh-railway:tab", "dsh-prototype:view", ' +
      '"dsh-browser:view", "dsh-mds:artifacts", "dsh-kanban:board", "editor", "terminal", "git".',
    parameters: {
      op: { type: 'string', required: true, enum: SIDEBAR_OPS, description: 'Operation to run.' },
      tab: { type: 'string', description: 'Tab id (focus/close).' },
      type: { type: 'string', description: 'Tab type to open (open), from op=list available.' },
      url: { type: 'string', description: 'URL for the browser tab (open).' },
    },
    output: {
      schema: { type: 'json' },
      render: (args, value) => [{ type: 'text', text: `sidebar ${args.op}: ${JSON.stringify(value)}` }],
    },
    async execute(args) {
      return await issue({ op: String(args.op), tab: args.tab, type: args.type, url: args.url })
    },
    presentCall: (args) => ({ card: 'generic', title: `Sidebar: ${args.op}`, kind: 'other', rawInput: args }),
  })
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req, limitBytes = 256 * 1024) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > limitBytes) { rejectP(new Error('payload too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { rejectP(new Error('invalid JSON body')) } })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

export function apply(ctx, config = {}) {
  const board = new AutoOpenBoard(compileAutoOpen(config?.autoOpen))
  if (board.rules.length > 0) {
    // Both listeners delegate first, so the guard and every other policy keep
    // their say; a write another listener denied never reaches the file.
    ctx.on('tools/pre-execute', async (exec, next) => {
      const decision = await next()
      // `ask` may still be approved; a later denial reaches post-execute as an error.
      if (decision?.kind !== 'deny') board.before(writeTargetOf(exec))
      return decision
    })
    ctx.on('tools/post-execute', async (exec, result, next) => {
      const decision = await next()
      board.after(writeTargetOf(exec), result?.isError === true || decision?.kind === 'block')
      return decision
    })
    log(`auto-open: ${board.rules.map((rule) => `${rule.path} → ${rule.tab}`).join(', ')}`)
  }

  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer unavailable — plugin inactive')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/sidebar-agent/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'pending': {
          const cmd = pending
          pending = null
          return json(res, 200, { ok: true, cmd })
        }
        case 'auto_open': {
          const after = typeof payload.after === 'number' ? payload.after : Number.MAX_SAFE_INTEGER
          return json(res, 200, { ok: true, ...board.since(after) })
        }
        case 'result':
          settle(payload.id, { ok: payload.ok !== false, ...(payload.data ?? {}), error: payload.error ?? null })
          return json(res, 200, { ok: true })
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/sidebar-agent/api', handler }), 'dsh-sidebar: api')

  const tools = ctx.get('tools')
  if (tools && typeof tools.register === 'function') {
    const tool = createTool()
    ctx.effect(() => tools.register(tool), `dsh-sidebar: tool ${tool.name}`)
    log(`agent tool: ${tool.name}`)
  }
  log('loaded')
}
