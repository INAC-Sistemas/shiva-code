// 9Router as a dsh plugin (openviking-style lifecycle): adopt a healthy
// 9Router server already listening on the port, or spawn our own child from
// this repo's standalone build (cli/app). The child dies with the harness.
// The agent-facing value is the router endpoint itself (http://127.0.0.1:<port>/v1);
// this half only manages the process, exposes control routes, and hosts the
// dashboard in the client tab.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

export const inject = ['webServer']

const PORT = Number(process.env.DSH_9ROUTER_PORT ?? 20128)
const BASE = `http://127.0.0.1:${PORT}`
const PLUGIN_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const STANDALONE = join(PLUGIN_DIR, 'cli', 'app')
const SERVER_JS = existsSync(join(STANDALONE, 'custom-server.js'))
  ? join(STANDALONE, 'custom-server.js')
  : join(STANDALONE, 'server.js')
const ENV_FILE = join(homedir(), '.dsh', '9router', '.env')
const DATA_DIR = process.env.DSH_9ROUTER_DATA ?? join(homedir(), '.dsh', '9router', 'data')

function log(msg) {
  console.log(`[9router] ${msg}`)
}

/** Minimal KEY=VALUE parser so users can override env without a dotenv dep. */
function readEnvFile(path) {
  try {
    const out = {}
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return out
  } catch { return {} }
}

async function healthy(timeoutMs = 2000) {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(timeoutMs) })
    return res.ok
  } catch { return false }
}

let child = null
let adopted = false
let spawnLog = []
let booting = null

async function spawnServer() {
  spawnLog = []
  if (!existsSync(SERVER_JS)) {
    log(`standalone build ausente em ${STANDALONE} — rode: npm run build && node cli/scripts/build-cli.js`)
    return false
  }
  const userEnv = readEnvFile(ENV_FILE)
  const env = {
    ...process.env,
    ...userEnv,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV ?? 'production',
    DATA_DIR: userEnv.DATA_DIR ?? DATA_DIR,
    // Safe local defaults; override everything in ~/.dsh/9router/.env.
    JWT_SECRET: userEnv.JWT_SECRET ?? `dsh-9router-${Math.random().toString(36).slice(2)}`,
    INITIAL_PASSWORD: userEnv.INITIAL_PASSWORD ?? 'dsh',
    BASE_URL: userEnv.BASE_URL ?? `http://localhost:${PORT}`,
    AUTH_COOKIE_SECURE: userEnv.AUTH_COOKIE_SECURE ?? 'false',
  }
  child = spawn(process.execPath, [SERVER_JS, '--port', String(PORT)], {
    cwd: STANDALONE,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', (d) => { spawnLog.push(String(d)); if (spawnLog.length > 100) spawnLog.shift() })
  child.stderr?.on('data', (d) => { spawnLog.push(String(d)); if (spawnLog.length > 100) spawnLog.shift() })
  child.on('exit', (code) => { log(`servidor filho saiu (code ${code})`); child = null })
  log(`spawned 9router pid=${child.pid} port=${PORT}`)
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (await healthy(2000)) { log(`servidor saudável na porta ${PORT}`); return true }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error(`9router não respondeu em 90s: ${spawnLog.slice(-6).join(' | ')}`)
}

async function ensureServer() {
  if (await healthy()) {
    adopted = true
    log(`adotado servidor já em execução na porta ${PORT}`)
    return
  }
  adopted = false
  await spawnServer()
}

function statusPayload() {
  return {
    ok: true,
    port: PORT,
    baseUrl: BASE,
    dashboardUrl: `${BASE}/dashboard`,
    endpoint: `${BASE}/v1`,
    running: !!(child || adopted),
    adopted,
    owned: !!child,
    pid: child?.pid ?? null,
    built: existsSync(SERVER_JS),
    spawnLog: spawnLog.slice(-8),
  }
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
      if (size > 64 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { resolveP({}) }
    })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/9router/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    await readBody(req)
    try {
      switch (method) {
        case 'status':
          return json(res, 200, statusPayload())
        case 'start': {
          if (await healthy()) { adopted = true; return json(res, 200, { ...statusPayload(), started: false }) }
          await ensureServer()
          return json(res, 200, { ...statusPayload(), started: true })
        }
        case 'stop': {
          if (child) {
            const pid = child.pid
            child.removeAllListeners?.('exit')
            child.kill()
            child = null
            log(`encerrado pelo usuário (pid ${pid})`)
            return json(res, 200, { ok: true, stopped: true })
          }
          return json(res, 200, { ok: true, stopped: false, note: adopted ? 'servidor adotado — não é nosso filho' : 'não estava rodando' })
        }
        case 'restart': {
          if (child) { child.removeAllListeners?.('exit'); child.kill(); child = null }
          await new Promise((r) => setTimeout(r, 1500))
          if (!(await healthy())) await spawnServer()
          return json(res, 200, statusPayload())
        }
        case 'open': {
          const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open'
          const target = process.platform === 'win32' ? `${BASE}/dashboard` : `${BASE}/dashboard`
          const c = spawn(cmd, [target], { detached: true, stdio: 'ignore' })
          c.on('error', () => {})
          c.unref()
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 500, { ok: false, error: String((e && e.message) || e), spawnLog: spawnLog.slice(-8) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/9router/api', handler }), '9router: api')

  // Adopt-or-spawn without blocking harness boot; failures are logged, the tab
  // offers Start/Restart.
  booting = ensureServer().catch((e) => log(`falha ao subir o servidor: ${e.message}`))
  ctx.effect(() => async () => {
    if (child) {
      const c = child
      child = null
      log('encerrando 9router (nosso filho)')
      try { c.removeAllListeners?.('exit'); c.kill() } catch { /* já saiu */ }
    }
  }, '9router: child lifecycle')

  log('loaded')
  log(`/9router/api route registered (port ${PORT})`)
}
