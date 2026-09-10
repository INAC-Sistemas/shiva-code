// Generic CLI provider host half for dsh: detects/installs a provider CLI,
// manages its login (through a pseudo-terminal when available), and exposes
// this workspace's provider state to a sidebar tab. The same file is shared
// verbatim by dsh-github, dsh-supabase, dsh-railway and dsh-vercel; provider
// specifics live in ./provider.js.

import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { PROVIDER } from './provider.js'

export const inject = ['webServer']

const DIR = join(homedir(), '.dsh', PROVIDER.id)
const TOKEN_FILE = join(DIR, 'token')
const WIN = process.platform === 'win32'
const job = { phase: 'idle', kind: '', log: [] }
let loginChild = null
let loginInfo = null
let loginExit = null
let loginTail = ''
let tokenCache = null

const log = (m) => console.log(`[dsh-${PROVIDER.id}] ${m}`)
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')

/**
 * Run one CLI command, capturing combined output.
 * @param cmd - executable name.
 * @param args - argument array (never a shell string).
 * @param opts - `cwd`, `env`, `timeout` (ms), `stdin` (written then closed).
 * @returns `{code, out}`; `code -1` spawn failure, `-2` timeout.
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolveP) => {
    const env = { ...process.env, ...(opts.env ?? {}) }
    if (PROVIDER.tokenEnv && tokenCache && !env[PROVIDER.tokenEnv]) env[PROVIDER.tokenEnv] = tokenCache
    let child
    try {
      child = spawn(cmd, args, { windowsHide: true, shell: WIN, cwd: opts.cwd, env })
    } catch (e) { resolveP({ code: -1, out: String(e) }); return }
    let out = ''
    const cap = (d) => { if (out.length < 256 * 1024) out += d }
    child.stdout?.on('data', cap)
    child.stderr?.on('data', cap)
    let done = false
    const finish = (code) => { if (!done) { done = true; clearTimeout(t); resolveP({ code, out }) } }
    const t = setTimeout(() => { try { child.kill() } catch { /* já saiu */ } finish(-2) }, opts.timeout ?? 30000)
    child.on('error', () => finish(-1))
    child.on('close', (code) => finish(code))
    if (opts.stdin !== undefined) { try { child.stdin?.write(opts.stdin); child.stdin?.end() } catch { /* pipe fechado */ } }
  })
}

async function loadToken() {
  try { tokenCache = (await readFile(TOKEN_FILE, 'utf8')).trim() || null } catch { tokenCache = null }
  return tokenCache
}

async function saveToken(token) {
  await mkdir(DIR, { recursive: true })
  await writeFile(TOKEN_FILE, token, 'utf8')
  tokenCache = token
}

async function clearToken() {
  try { await writeFile(TOKEN_FILE, '', 'utf8') } catch { /* sem arquivo */ }
  tokenCache = null
}

function jobLog(kind, line) {
  job.kind = kind
  if (line) {
    job.log.push(`[${new Date().toISOString().slice(11, 19)}] ${line}`)
    while (job.log.length > 100) job.log.shift()
    log(`${kind}: ${line}`)
  }
}

async function cliInfo() {
  const r = await run(PROVIDER.cli, PROVIDER.versionArgs, { timeout: 15000 })
  if (r.code === 0) {
    const m = r.out.match(/\d+\.\d+\.\d+/)
    return { installed: true, version: m ? m[0] : r.out.trim().split('\n')[0].slice(0, 40) }
  }
  return { installed: false, version: null }
}

async function authInfo() {
  const cli = await cliInfo()
  if (!cli.installed) return { loggedIn: false, account: null }
  const r = await run(PROVIDER.cli, PROVIDER.authCheck.args, { timeout: 25000 })
  const loggedIn = PROVIDER.authCheck.loggedInExitZero === false ? r.code !== 0 : r.code === 0
  if (!loggedIn) return { loggedIn: false, account: null }
  let account = null
  if (PROVIDER.account) {
    const a = await run(PROVIDER.cli, PROVIDER.account.args, { timeout: 25000 })
    if (a.code === 0) account = a.out.trim().split('\n').filter(Boolean)[0] ?? null
  }
  return { loggedIn: true, account }
}

async function workspaceInfo(cwd) {
  const info = { root: cwd, linked: false, name: null, url: null, details: [] }
  if (!PROVIDER.detectWorkspace) return info
  try { return await PROVIDER.detectWorkspace(run, cwd, info) } catch { return info }
}

async function collectState(cwd) {
  const items = []
  const activity = []
  const actions = []
  try { await PROVIDER.collect(run, cwd, { items, activity, actions }) }
  catch (e) { items.push({ label: 'erro ao consultar', value: String((e && e.message) || e), tone: 'err' }) }
  return {
    items,
    activity: activity.slice(0, 12),
    actions: actions.map((a) => ({ id: a.id, label: a.label, primary: !!a.primary, danger: !!a.danger, confirm: a.confirm ?? null })),
  }
}

async function fullStatus(cwd) {
  await loadToken()
  const cli = await cliInfo()
  const auth = await authInfo()
  const workspace = await workspaceInfo(cwd)
  let state = { items: [], activity: [], actions: [] }
  if (cli.installed && auth.loggedIn) state = await collectState(cwd)
  if (auth.loggedIn && loginChild) {
    try { loginChild.kill() } catch { /* já saiu */ }
    loginChild = null
  }
  return {
    ok: true,
    provider: PROVIDER.id,
    title: PROVIDER.title,
    cli,
    auth,
    workspace,
    status: state.items,
    activity: state.activity,
    actions: state.actions,
    login: { ...(loginInfo ?? {}), tail: loginTail.slice(-1500), active: !!loginChild, exit: loginExit },
    job: { phase: job.phase, kind: job.kind, log: job.log.slice(-15) },
  }
}

/**
 * Start an interactive login. Uses a pseudo-terminal (node-pty, already in the
 * harness tree) so CLIs that require a TTY can run; falls back to piped stdio.
 * The child is kept alive so the user can answer prompts; `login/input` writes
 * back to it and `status` reports progress.
 * @param cwd - workspace directory to run the login in.
 * @returns the parsed `{url, code}` when found, else a soft "waiting" result.
 */
async function startLogin(cwd) {
  const ptyMod = await import('node-pty').catch(() => null)
  return new Promise((resolveP) => {
    let settled = false
    const done = (v) => { if (!settled) { settled = true; resolveP(v) } }
    let out = ''
    const clean = () => stripAnsi(out)
    const collect = () => {
      const text = clean()
      const url = PROVIDER.login.urlRegex ? (text.match(PROVIDER.login.urlRegex) || [])[0] : (text.match(/https?:\/\/[^\s"'<>]+/) || [])[0]
      if (!url) return false
      const code = PROVIDER.login.codeRegex ? (text.match(PROVIDER.login.codeRegex) || [])[0] : null
      loginInfo = { url, code, startedAt: Date.now() }
      loginExit = null
      done({ ok: true, url, code, output: out.slice(0, 2000) })
      return true
    }
    const onData = (d) => {
      out += d
      loginTail = clean()
      if (loginInfo && !loginInfo.code && PROVIDER.login.codeRegex) {
        const m = clean().match(PROVIDER.login.codeRegex)
        if (m) loginInfo.code = m[0]
      }
      collect()
    }
    let proc = null
    let write = () => {}
    try {
      if (ptyMod) {
        const file = WIN ? 'cmd.exe' : PROVIDER.cli
        const args = WIN ? ['/c', PROVIDER.cli, ...PROVIDER.login.args] : [...PROVIDER.login.args]
        proc = ptyMod.spawn(file, args, { name: 'xterm-color', cols: 120, rows: 30, cwd: cwd || process.cwd(), env: process.env })
        proc.onData(onData)
        write = (t) => { try { proc.write(t) } catch { /* saiu */ } }
      } else {
        proc = spawn(PROVIDER.cli, PROVIDER.login.args, { windowsHide: true, shell: WIN, cwd, env: process.env })
        proc.stdout?.on('data', onData)
        proc.stderr?.on('data', onData)
        write = (t) => { try { proc.stdin?.write(t) } catch { /* saiu */ } }
      }
    } catch (e) { done({ ok: false, error: String(e) }); return }
    loginChild = { kill: () => { try { proc.kill() } catch { /* já saiu */ } }, write }
    // Several CLIs wait on a "Press Enter" prompt before opening the browser.
    setTimeout(() => { if (loginChild) write('\r') }, 1200)
    const onExit = (code) => {
      loginExit = { code, out: out.slice(-1500) }
      loginChild = null
      log(`login encerrou (exit ${code})`)
      if (!collect()) done({ ok: false, error: 'a CLI encerrou sem retornar uma URL de login', output: out.slice(0, 2000) })
    }
    const t = setTimeout(() => {
      clearTimeout(t)
      if (collect()) return
      if (loginChild) done({ ok: true, url: null, code: null, note: 'conclua a autorização no navegador' })
      else done({ ok: false, error: 'a CLI não retornou uma URL de login', output: out.slice(0, 2000) })
    }, 12000)
    if (ptyMod) proc.onExit(({ exitCode }) => { clearTimeout(t); onExit(exitCode) })
    else {
      proc.on('close', (code) => { clearTimeout(t); onExit(code) })
      proc.on('error', (e) => { clearTimeout(t); loginExit = { code: -1, out: String(e) }; loginChild = null; done({ ok: false, error: String(e), output: out.slice(0, 1000) }) })
    }
  })
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req, limitBytes = 128 * 1024) {
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

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer indisponível — plugin inativo')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice(`/${PROVIDER.id}/api/`.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    const cwd = typeof payload.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : process.cwd()
    try {
      switch (method) {
        case 'status':
          return json(res, 200, await fullStatus(cwd))
        case 'install': {
          if (job.phase === 'installing') return json(res, 409, { ok: false, error: 'instalação já em andamento' })
          job.phase = 'installing'; job.log = []
          void (async () => {
            try {
              let ok = false
              for (const inst of PROVIDER.installs) {
                jobLog('install', `tentando ${inst.label}…`)
                const r = await run(inst.cmd, inst.args, { timeout: 900000 })
                if (r.code === 0) { jobLog('install', `${inst.label}: ok`); ok = true; break }
                jobLog('install', `${inst.label} falhou (exit ${r.code}): ${r.out.slice(-300)}`)
              }
              job.phase = ok ? 'done' : 'error'
              if (ok) jobLog('done', 'CLI instalada')
            } catch (e) { job.phase = 'error'; jobLog('error', String((e && e.message) || e)) }
          })()
          return json(res, 200, { ok: true })
        }
        case 'login': {
          if (typeof payload.token === 'string' && payload.token.trim()) {
            await saveToken(payload.token.trim())
            jobLog('login', 'token salvo')
            return json(res, 200, { ok: true, token: true })
          }
          if (loginChild) { try { loginChild.kill() } catch { /* já saiu */ } loginChild = null }
          loginInfo = null; loginExit = null; loginTail = ''
          const r = await startLogin(cwd)
          jobLog('login', r.ok ? `login: ${r.url ?? 'aguardando navegador'}` : `falha: ${r.error}`)
          return json(res, 200, r)
        }
        case 'login/input': {
          if (!loginChild) return json(res, 409, { ok: false, error: 'nenhum login ativo' })
          const text = typeof payload.text === 'string' ? payload.text : '\r'
          loginChild.write(text.endsWith('\r') || text.endsWith('\n') ? text : text + '\r')
          return json(res, 200, { ok: true })
        }
        case 'logout': {
          if (loginChild) { try { loginChild.kill() } catch { /* já saiu */ } loginChild = null }
          loginInfo = null; loginExit = null; loginTail = ''
          await clearToken()
          if (PROVIDER.logout) { const r = await run(PROVIDER.cli, PROVIDER.logout.args, { timeout: 20000 }); jobLog('logout', r.out.slice(-200)) }
          return json(res, 200, { ok: true })
        }
        case 'action': {
          const def = PROVIDER.actions ? PROVIDER.actions[payload.name] : null
          if (!def) return json(res, 404, { ok: false, error: `ação desconhecida "${payload.name}"` })
          const r = await def(run, cwd, payload.args ?? {})
          return json(res, 200, { ok: r?.ok !== false, output: r?.output ?? '', open: r?.open ?? null })
        }
        case 'job':
          return json(res, 200, { ok: true, job: { phase: job.phase, kind: job.kind, log: job.log.slice(-20) } })
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: `/${PROVIDER.id}/api`, handler }), `dsh-${PROVIDER.id}: api`)
  void loadToken()
  log('loaded')
}
