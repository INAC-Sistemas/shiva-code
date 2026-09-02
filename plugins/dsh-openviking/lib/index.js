// dsh-openviking host half: makes the OpenViking context database belong to
// the dsh server. On activation it adopts a healthy server on the port, or
// auto-installs (pinned wheel into a dedicated venv) and spawns one as a
// child process that dies with dsh. Model tools arrive through the
// dsh-mcp-client row in cordis.patch.yml; the Web Studio is framed by the tab.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import * as mcpClient from '@deepseek-ai/dsh-mcp-client'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const inject = ['webServer', 'sessions']

/**
 * `pythonCandidates` overrides the probed interpreter commands, best first;
 * empty (the default) means {@link platformInterpreters}. Each entry is a
 * command with optional arguments, split on spaces (`py -3.12`, `python3.12`,
 * or an absolute path). The version range is not configurable: the pinned
 * wheel's native dependencies decide it.
 */
export const Config = z.object({
  pythonCandidates: z.array(String).default([]),
})

const OV_VERSION = '0.4.17'
const OV_PORT = 1933
const OV_BASE = `http://127.0.0.1:${OV_PORT}`
const OV_DIR = join(homedir(), '.dsh', 'openviking')
const VENV_DIR = join(OV_DIR, 'venv')
const OV_CONF = join(homedir(), '.openviking', 'ov.conf')
const SETTINGS_FILE = join(OV_DIR, 'settings.json')

/** Inclusive minor-version range for the venv interpreter; 3.13+ may miss native deps for `openviking==OV_VERSION`. */
const PY_MIN_MINOR = 10
const PY_MAX_MINOR = 12

/**
 * Interpreter commands probed on install, best first. Windows resolves
 * versions through the `py` launcher; POSIX exposes versioned `python3.X`
 * names. The trailing generic name is a fallback that the version check still
 * gates, so an out-of-range default interpreter is rejected, not used.
 */
const PLATFORM_INTERPRETERS = {
  win32: ['py -3.12', 'py -3.11', 'py -3.10', 'python'],
  darwin: ['python3.12', 'python3.11', 'python3.10', 'python3'],
  linux: ['python3.12', 'python3.11', 'python3.10', 'python3'],
}

/**
 * Interpreter candidates for a platform.
 * @param platform - the platform to resolve for; defaults to the process platform.
 * @returns the probe order, falling back to the POSIX names on an unlisted platform.
 */
export function platformInterpreters(platform = process.platform) {
  return PLATFORM_INTERPRETERS[platform] ?? PLATFORM_INTERPRETERS.linux
}

/**
 * Path to an executable inside the venv. The layout belongs to CPython's
 * `venv` module, not to us: `Scripts\<name>.exe` on Windows, `bin/<name>`
 * everywhere else.
 * @param name - the executable's base name, without extension.
 * @param platform - the platform to resolve for; defaults to the process platform.
 * @returns the absolute path under {@link VENV_DIR}.
 */
export function venvExe(name, platform = process.platform) {
  return platform === 'win32'
    ? join(VENV_DIR, 'Scripts', `${name}.exe`)
    : join(VENV_DIR, 'bin', name)
}

/**
 * Read the version out of `<interpreter> --version` output.
 * @param out - the command's combined stdout/stderr.
 * @returns `[major, minor]`, or `null` when the output carries no version.
 */
export function parsePythonVersion(out) {
  const m = /Python\s+(\d+)\.(\d+)/i.exec(String(out ?? ''))
  return m ? [Number(m[1]), Number(m[2])] : null
}

/**
 * Whether an interpreter version can build the venv.
 * @param version - the `[major, minor]` pair from {@link parsePythonVersion}, or `null`.
 * @returns `true` only for 3.PY_MIN_MINOR through 3.PY_MAX_MINOR inclusive.
 */
export function supportedPython(version) {
  if (!version) return false
  const [major, minor] = version
  return major === 3 && minor >= PY_MIN_MINOR && minor <= PY_MAX_MINOR
}

const SERVER_EXE = venvExe('openviking-server')

function log(msg) {
  console.log(`[dsh-openviking] ${msg}`)
}

// ── installer (one at a time, in-memory job) ──────────────────────────────
const job = { phase: 'idle', step: '', log: [] }

function jobLog(step, line) {
  job.step = step
  if (line) {
    job.log.push(`[${new Date().toISOString().slice(11, 19)}] ${line}`)
    while (job.log.length > 80) job.log.shift()
    log(`${step}: ${line}`)
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolveP) => {
    const child = spawn(cmd, args, { windowsHide: true, ...opts })
    let out = ''
    child.stdout?.on('data', (d) => { out += d })
    child.stderr?.on('data', (d) => { out += d })
    child.on('error', (e) => resolveP({ code: -1, out: String(e) }))
    child.on('close', (code) => resolveP({ code, out }))
  })
}

async function installFlow(candidates) {
  job.phase = 'installing'
  const range = `3.${PY_MIN_MINOR}–3.${PY_MAX_MINOR}`
  try {
    await mkdir(OV_DIR, { recursive: true })
    // 1. pick an interpreter in range. `--version` exiting 0 is not enough:
    // the generic fallback names resolve to whatever the machine defaults to,
    // which is routinely outside the range the pinned wheel needs.
    jobLog('interpreter', `procurando Python ${range}…`)
    let picked = null
    for (const candidate of candidates) {
      const [cmd, ...args] = candidate.split(' ')
      const r = await run(cmd, [...args, '--version'])
      const version = r.code === 0 ? parsePythonVersion(r.out) : null
      if (!supportedPython(version)) {
        const why = version ? `${version[0]}.${version[1]} fora da faixa ${range}` : (r.out.trim() || `exit ${r.code}`)
        jobLog('interpreter', `${candidate} → ${why}`)
        continue
      }
      jobLog('interpreter', `${candidate} → ${version[0]}.${version[1]} aceito`)
      picked = { cmd, args }
      break
    }
    if (!picked) throw new Error(`Python ${range} não encontrado nesta máquina`)
    // 2. venv dedicado.
    jobLog('venv', `criando venv em ${VENV_DIR}…`)
    const venv = await run(picked.cmd, [...picked.args, '-m', 'venv', VENV_DIR])
    if (venv.code !== 0) throw new Error(`venv falhou: ${venv.out.slice(-400)}`)
    const pip = venvExe('pip')
    // 3. instalar o wheel pinado (baixa ~26 MB + dependências).
    jobLog('install', `pip install openviking==${OV_VERSION} (baixa ~26 MB, aguarde)…`)
    const ins = await run(pip, ['install', '--disable-pip-version-check', `openviking==${OV_VERSION}`])
    if (ins.code !== 0) throw new Error(`pip install falhou: ${ins.out.slice(-600)}`)
    if (!existsSync(SERVER_EXE)) throw new Error('openviking-server não encontrado no venv após a instalação')
    jobLog('install', 'instalado')
    // 4. ov.conf a partir das settings salvas (se existirem).
    await writeOvConf()
    job.phase = 'done'
    jobLog('done', 'OpenViking instalado — subindo o servidor…')
    await ensureServer(true)
  } catch (e) {
    job.phase = 'error'
    jobLog('error', String((e && e.message) || e))
  }
}

function spawnInstaller(candidates) {
  if (job.phase === 'installing') return
  job.phase = 'installing'
  void installFlow(candidates)
}

// ── settings → ov.conf ────────────────────────────────────────────────────
async function readSettings() {
  try { return JSON.parse(await readFile(SETTINGS_FILE, 'utf8')) } catch { return null }
}

// O OpenViking não conhece 'openrouter' como provider. O endpoint do OpenRouter
// é OpenAI-compatível, então um provider 'openai' + api_base OpenRouter funciona.
function toOvProvider(provider) {
  return provider === 'openrouter' ? 'openai' : (provider || 'openai')
}

async function writeOvConf() {
  const s = await readSettings()
  if (!s?.embedding?.api_base) return false // sem embedding o server não sobe
  const conf = {}
  if (s.embedding?.api_base) {
    conf.embedding = { dense: { api_base: s.embedding.api_base, api_key: s.embedding.api_key ?? '', provider: toOvProvider(s.embedding.provider), dimension: Number(s.embedding.dimension) || 1024, model: s.embedding.model ?? '' } }
  }
  if (s.vlm?.api_base) {
    conf.vlm = { api_base: s.vlm.api_base, api_key: s.vlm.api_key ?? '', provider: toOvProvider(s.vlm.provider), model: s.vlm.model ?? '' }
  }
  await mkdir(join(homedir(), '.openviking'), { recursive: true })
  await writeFile(OV_CONF, JSON.stringify(conf, null, 2), 'utf8')
  log(`ov.conf escrito (${Object.keys(conf).join(', ')})`)
  return true
}

async function isConfigured() {
  const s = await readSettings()
  return !!(s?.embedding?.api_base)
}

/** Resolve the OpenRouter key the user already stored in dsh (never sent to the browser). */
async function resolveOpenRouterKey(ctx) {
  // Prefer the credentials seam when the service is visible; fall back to the
  // file-backed provider document the Models page writes.
  try {
    const credentials = ctx.get('credentials')
    if (credentials?.resolve) {
      const hit = await credentials.resolve('OPENROUTER_API_KEY')
      if (hit?.value) return hit.value
    }
  } catch { /* service not reachable from this scope */ }
  try {
    const { load } = await import('js-yaml')
    const text = await readFile(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8')
    const doc = load(text)
    const v = doc?.refs?.OPENROUTER_API_KEY
    if (typeof v === 'string') return v
    if (v && typeof v === 'object' && typeof v.value === 'string') return v.value
  } catch { /* não encontrado */ }
  return null
}

/** List models from the OpenRouter API (embedding + vision) using the resolved key. */
async function openRouterModels(ctx) {
  const key = await resolveOpenRouterKey(ctx)
  if (!key) return { configured: false, embedding: [], vision: [] }
  const headers = { authorization: `Bearer ${key}` }
  const embedding = []
  const vision = []
  try {
    const r = await fetch('https://openrouter.ai/api/v1/embeddings/models', { headers, signal: AbortSignal.timeout(20_000) })
    if (r.ok) {
      const j = await r.json()
      for (const m of j?.data ?? []) if (typeof m?.id === 'string') embedding.push(m.id)
    }
  } catch { /* sem rede */ }
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { headers, signal: AbortSignal.timeout(20_000) })
    if (r.ok) {
      const j = await r.json()
      const seen = new Set()
      for (const m of j?.data ?? []) {
        const id = typeof m?.id === 'string' ? m.id : ''
        if (!id || id.includes('embed')) continue
        const mods = m?.architecture?.input_modalities ?? m?.architecture?.modalities ?? m?.supported_parameters ?? {}
        const imagelike = JSON.stringify(mods).toLowerCase().includes('image')
        if (imagelike && !seen.has(id)) { vision.push(id); seen.add(id) }
      }
      vision.sort()
    }
  } catch { /* sem rede */ }
  // Cobre o caso de uma API que não expõe image na architecture.
  return { configured: true, embedding, vision }
}

// ── server lifecycle ──────────────────────────────────────────────────────
let child = null // process we spawned; dies with dsh
let adopted = false // healthy server found on the port before we spawned
let spawnLog = []

async function serverAlive(timeoutMs = 1500) {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), timeoutMs)
    const r = await fetch(`${OV_BASE}/`, { signal: ac.signal })
    clearTimeout(t)
    return r.status >= 200 && r.status < 600 // any HTTP answer counts
  } catch { return false }
}

async function studioAvailable() {
  try {
    const r = await fetch(`${OV_BASE}/studio`, { signal: AbortSignal.timeout(2500) })
    return r.status < 400
  } catch { return false }
}

async function spawnServer() {
  spawnLog = []
  if (!existsSync(SERVER_EXE)) throw new Error('openviking-server não instalado')
  const env = { ...process.env }
  // Studio local: o wheel não traz o bundle da SPA; apontamos para o dist
  // construído, quando existir.
  const studioDir = join(OV_DIR, 'web-studio')
  if (existsSync(join(studioDir, 'index.html'))) env.OPENVIKING_WEB_STUDIO_DIR = studioDir
  child = spawn(SERVER_EXE, [], {
    cwd: OV_DIR,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', (d) => { spawnLog.push(String(d)); if (spawnLog.length > 100) spawnLog.shift() })
  child.stderr?.on('data', (d) => { spawnLog.push(String(d)); if (spawnLog.length > 100) spawnLog.shift() })
  child.on('exit', (code) => { log(`servidor filho saiu (code ${code})`); child = null })
  log(`spawned openviking-server pid=${child.pid}`)
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (await serverAlive(1500)) { log(`servidor saudável na porta ${OV_PORT}`); return true }
    await new Promise((r) => setTimeout(r, 1200))
  }
  throw new Error(`servidor não respondeu em 90s: ${spawnLog.slice(-8).join(' | ')}`)
}

async function ensureServer(fromInstall = false) {
  if (await serverAlive()) {
    adopted = true
    if (!fromInstall) log(`adotado servidor já em execução na porta ${OV_PORT}`)
    return
  }
  adopted = false
  if (existsSync(SERVER_EXE)) await spawnServer()
}

function statusPayload() {
  return {
    ok: true,
    phase: job.phase,
    step: job.step,
    log: job.log.slice(-30),
    installed: existsSync(SERVER_EXE),
    running: !!(child || adopted),
    adopted,
    owned: !!child,
    pid: child?.pid ?? null,
    port: OV_PORT,
    configured: null, // preenchido no handler (async)
    studio: null,
    spawnLog: spawnLog.slice(-8),
    baseUrl: OV_BASE,
  }
}

// ── MCP bridge ────────────────────────────────────────────────────────────
// Mounts the harness mcp-client AFTER the server is healthy, so the first
// connection succeeds and the model gains mcp__openviking__* tools without a
// dsh restart. Mounted once per process; server restarts don't remount (the
// mcp-client's own reconnect handles the gap).
let mcpMounted = false

function mountMcp(ctx) {
  if (mcpMounted) return
  mcpMounted = true
  ctx.plugin({
    inject: ['tools'],
    apply(toolsCtx) {
      return Promise.resolve(mcpClient.apply(toolsCtx, {
        serverName: 'openviking',
        transport: 'streamable-http',
        url: `${OV_BASE}/mcp`,
        failOnStartupError: false,
        reconnect: { enabled: true, initialDelayMs: 2000, maxDelayMs: 30000, maxAttempts: 50 },
        toolCallTimeoutMs: 120_000,
      })).then(() => log('mcp conectado — tools mcp__openviking__* registradas'))
        .catch((e) => { mcpMounted = false; log(`mcp falhou: ${e.message}`) })
    },
  })
}

// ── memory hooks ──────────────────────────────────────────────────────────
// Recall at session start (inject a system-reminder on the first step) and
// capture at agent disposal (remember the session's latest decisions). Both
// are no-ops unless the OpenViking server is healthy and configured.

let hookLive = false
const recalledAgents = new Set()

async function ovRpc(tool, args) {
  const payload = { jsonrpc: '2.0', id: Date.now().toString(36), method: 'tools/call', params: { name: tool, arguments: args } }
  const res = await fetch(`${OV_BASE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })
  const text = await res.text()
  const dataLine = text.split('\n').find((l) => l.startsWith('data:'))?.replace(/^data:\s?/, '')
  const json = dataLine ? JSON.parse(dataLine) : null
  const content = json?.result?.content
  const resultText = Array.isArray(content)
    ? content.filter((c) => c?.type === 'text').map((c) => c.text).join('\n')
    : (json?.result?.structuredContent?.result ?? '')
  if (json?.result?.isError) throw new Error(resultText || 'OpenViking tool error')
  return resultText
}

const msgText = (content) => Array.isArray(content)
  ? content.map((c) => (typeof c === 'string' ? c : c?.text ?? '')).join(' ')
  : String(content ?? '')

function sessionMessages(agent) {
  const out = []
  try {
    for (const e of agent.session.events) {
      if (e?.type !== 'user/message' && e?.type !== 'assistant/message') continue
      const role = e.type === 'user/message' ? 'user' : 'assistant'
      const payload = e?.payload ?? {}
      const content = e.type === 'assistant/message' ? payload?.message?.content : payload?.content
      const text = msgText(content)
      if (text) out.push({ role, content: text })
    }
  } catch { /* sessão ainda não pronta */ }
  return out.slice(-24)
}

async function recallContext(agent) {
  const cwd = agent?.session?.header?.cwd ?? process.cwd()
  const probe = `Decisions, preferences and project context for workspace ${cwd}`
  try {
    const found = await ovRpc('search', { query: probe, mode: 'context', limit: 5 })
    return found.trim() && !/no matching context/i.test(found) ? found : ''
  } catch { return '' }
}

function installMemoryHooks(ctx) {
  // Recall: on the FIRST step of the FIRST turn, inject the recalled memory as
  // a system-reminder (exact idiom the harness tool-skill uses).
  ctx.on('agent/pre-step', async ({ agent, turn, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    if (!hookLive || turn !== 0 || step !== 0) return decision
    if (recalledAgents.has(agent.id)) return decision
    signal.throwIfAborted()
    const memory = await recallContext(agent)
    if (!memory) return decision
    recalledAgents.add(agent.id)
    signal.throwIfAborted()
    const reminder = createUserMessage({
      content: [{
        type: 'text',
        text: '<system-reminder><openviking_memory>\n' + memory + '\n</openviking_memory></system-reminder>',
      }],
    })
    return { kind: 'enter', messages: [...decision.messages, reminder] }
  })

  // Capture: at agent disposal, remember what the session established.
  ctx.on('agent/disposed', ({ agent }) => {
    if (!hookLive) return
    const messages = sessionMessages(agent)
    if (messages.length === 0) return
    void ovRpc('remember', { messages }).then(() => log(`captured ${messages.length} mensagens da sessão ${agent.id}`))
      .catch((e) => log(`capture falhou: ${e.message}`))
  })
}

// ── API ───────────────────────────────────────────────────────────────────
function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > 256 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { rejectP(new Error('invalid JSON')) } })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

export function apply(ctx, config = {}) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer indisponível — plugin inativo')
    return
  }

  // Configured order wins whole; otherwise this platform's probe order.
  const interpreters = config.pythonCandidates?.length ? config.pythonCandidates : platformInterpreters()

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/openviking/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'status': {
          const p = statusPayload()
          p.configured = await isConfigured()
          p.studio = p.running ? await studioAvailable() : null
          p.openrouterKey = !!await resolveOpenRouterKey(ctx)
          return json(res, 200, p)
        }
        case 'install': {
          if (job.phase === 'installing') return json(res, 409, { ok: false, error: 'install already running' })
          spawnInstaller(interpreters)
          return json(res, 200, { ok: true })
        }
        case 'models': {
          return json(res, 200, { ok: true, ...await openRouterModels(ctx) })
        }
        case 'configure': {
          const s = {
            embedding: payload.embedding ?? null,
            vlm: payload.vlm ?? null,
          }
          // OpenRouter sem chave digitada → importa a chave que o usuário já
          // tem no dsh (via credentials seam); a chave nunca vai pro browser.
          if (s.embedding?.provider === 'openrouter' && !s.embedding.api_key) {
            s.embedding.api_key = await resolveOpenRouterKey(ctx) ?? ''
          }
          if (s.embedding?.provider === 'openrouter' && s.vlm && !s.vlm.api_key) {
            s.vlm.api_key = await resolveOpenRouterKey(ctx) ?? ''
          }
          await mkdir(OV_DIR, { recursive: true })
          await writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8')
          const wrote = await writeOvConf()
          if (!wrote) return json(res, 400, { ok: false, error: 'embedding é obrigatório para subir o servidor' })
          // Reinicia apenas o processo que nós spawnamos; um servidor adotado
          // recarrega ov.conf sozinho ("picked up without a restart").
          if (child) {
            try { child.kill() } catch { /* já saiu */ }
            child = null
            await new Promise((r) => setTimeout(r, 1500))
            await ensureServer()
          } else if (!adopted) {
            await ensureServer()
          }
          mountMcp(ctx); hookLive = true
          log(`configuração salva (ov.conf escrito) — servidor no ar`)
          return json(res, 200, { ok: true })
        }
        case 'restart': {
          if (child) {
            try { child.kill() } catch { /* já saiu */ }
            child = null
            await new Promise((r) => setTimeout(r, 1500))
            await ensureServer()
            return json(res, 200, { ok: true, restarted: true })
          }
          if (!(await isConfigured())) return json(res, 400, { ok: false, error: 'configure o embedding antes de subir o servidor' })
          await ensureServer()
          return json(res, 200, { ok: true, restarted: false, adopted })
        }
        case 'reset': {
          // Desinstalação limpa: mata nosso processo e apaga venv.
          if (child) { try { child.kill() } catch { /* já saiu */ } child = null }
          await rm(VENV_DIR, { recursive: true, force: true }).catch(() => {})
          job.phase = 'idle'
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/openviking/api', handler }), 'dsh-openviking: api')

  // Boot automático: instala se faltar, adota um servidor já vivo e só
  // spawna o nosso quando houver embedding configurado — sem ov.conf o
  // server cai no embedder local e morre na inicialização. Com o servidor
  // saudável, monta a ponte MCP (tools no modelo). O bloqueio aqui não
  // segura a ativação do plugin.
  void (async () => {
    if (await serverAlive()) {
      adopted = true
      log(`servidor já em execução na porta ${OV_PORT} — adotado`)
      mountMcp(ctx); hookLive = true
      return
    }
    if (!existsSync(SERVER_EXE)) {
      log('primeira execução: instalando OpenViking automaticamente…')
      spawnInstaller(interpreters)
      return
    }
    if (!(await isConfigured())) {
      log('instalado mas sem embedding configurado — aguardando configuração na aba Memory')
      return
    }
    try {
      await ensureServer()
      mountMcp(ctx); hookLive = true
    } catch (e) { log(`falha ao subir servidor: ${e.message}`) }
  })()

  ctx.effect(() => () => {
    if (child) {
      log('encerrando openviking-server (nosso filho)')
      try { child.kill() } catch { /* já saiu */ }
      child = null
    }
  }, 'dsh-openviking: teardown')

  installMemoryHooks(ctx)

  log('loaded')
}
