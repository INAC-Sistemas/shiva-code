// dsh-paramiko host half: detects a local Python, installs paramiko into a
// dedicated venv with one click (same job/log flow as dsh-openviking), manages
// saved SSH connections, and gives the agents native tools (ssh_run,
// ssh_transfer) that reach external VPS servers through paramiko. Credentials
// are resolved server-side from the saved connections file, so the model can
// reference a connection by name without ever holding the secret.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['webServer', 'tools']

/**
 * `pythonCandidates` overrides the probed interpreter commands, best first;
 * empty (the default) means {@link platformInterpreters}. Each entry is a
 * command with optional arguments, split on spaces (`py -3.12`, `python3.12`,
 * or an absolute path). paramiko is pure Python, so any interpreter from
 * 3.8 on works; the floor exists to keep `venv` and current wheels happy.
 */
export const Config = z.object({
  pythonCandidates: z.array(String).default([]),
})

const here = dirname(fileURLToPath(import.meta.url))
const SSH_RUN_PY = join(here, 'ssh-run.py')
const SSH_TRANSFER_PY = join(here, 'ssh-transfer.py')
const DIR = process.env.DSH_PARAMIKO_DIR ?? join(homedir(), '.dsh', 'paramiko')
const VENV_DIR = process.env.DSH_PARAMIKO_VENV ?? join(DIR, 'venv')
const CONNECTIONS_FILE = join(DIR, 'connections.json')

const PY_MIN_MINOR = 8
const MAX_TOOL_OUTPUT_CHARS = 100_000
const DEFAULT_PORT = 22

const PLATFORM_INTERPRETERS = {
  win32: ['py -3', 'python'],
  darwin: ['python3', 'python'],
  linux: ['python3', 'python'],
}

function log(msg) {
  console.log(`[dsh-paramiko] ${msg}`)
}

/**
 * Path to an executable inside the venv. The layout belongs to CPython's
 * `venv` module: `Scripts\<name>.exe` on Windows, `bin/<name>` elsewhere.
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
 * Whether an interpreter version can host paramiko.
 * @param version - the `[major, minor]` pair from {@link parsePythonVersion}, or `null`.
 * @returns `true` for Python 3.PY_MIN_MINOR or newer.
 */
export function supportedPython(version) {
  if (!version) return false
  const [major, minor] = version
  return major === 3 && minor >= PY_MIN_MINOR
}

/**
 * Interpreter candidates for a platform.
 * @param platform - the platform to resolve for; defaults to the process platform.
 * @returns the probe order, falling back to the POSIX names on an unlisted platform.
 */
export function platformInterpreters(platform = process.platform) {
  return PLATFORM_INTERPRETERS[platform] ?? PLATFORM_INTERPRETERS.linux
}

// ── one-click installer (single in-memory job, dsh-openviking flow) ────────
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
  try {
    await mkdir(DIR, { recursive: true })
    // 1. pick an interpreter. `--version` exiting 0 is not enough: generic
    // fallback names resolve to whatever the machine defaults to.
    jobLog('interpreter', 'procurando Python 3.8+…')
    let picked = null
    for (const candidate of candidates) {
      const [cmd, ...args] = candidate.split(' ')
      const r = await run(cmd, [...args, '--version'])
      const version = r.code === 0 ? parsePythonVersion(r.out) : null
      if (!supportedPython(version)) {
        const why = version ? `${version[0]}.${version[1]} < 3.${PY_MIN_MINOR}` : (r.out.trim() || `exit ${r.code}`)
        jobLog('interpreter', `${candidate} → ${why}`)
        continue
      }
      jobLog('interpreter', `${candidate} → ${version[0]}.${version[1]} aceito`)
      picked = { cmd, args }
      break
    }
    if (!picked) throw new Error(`Python 3.${PY_MIN_MINOR}+ não encontrado nesta máquina`)
    // 2. venv dedicado (não toca no Python do sistema).
    jobLog('venv', `criando venv em ${VENV_DIR}…`)
    const venv = await run(picked.cmd, [...picked.args, '-m', 'venv', VENV_DIR])
    if (venv.code !== 0) throw new Error(`venv falhou: ${venv.out.slice(-400)}`)
    const pip = venvExe('pip')
    // 3. paramiko (e dependências cryptography/nacl) no venv.
    jobLog('install', 'pip install paramiko (baixa cryptography/nacl, aguarde)…')
    const ins = await run(pip, ['install', '--disable-pip-version-check', 'paramiko'])
    if (ins.code !== 0) throw new Error(`pip install falhou: ${ins.out.slice(-600)}`)
    const version = await paramikoVersion()
    if (!version) throw new Error('paramiko não importável no venv após a instalação')
    jobLog('install', `paramiko ${version} instalado`)
    job.phase = 'done'
    jobLog('done', 'pronto — as tools ssh_run/ssh_transfer já funcionam para os agentes')
  } catch (e) {
    job.phase = 'error'
    jobLog('error', String((e && e.message) || e))
  }
}

function spawnInstaller(candidates) {
  if (job.phase === 'installing') return
  void installFlow(candidates)
}

// ── saved connections ──────────────────────────────────────────────────────
// Plaintext local file, same trust level as dsh's own .credentials.yaml. The
// API never returns passwords back to the browser; saving again is the only
// way to change one.

const NAME_RE = /^\S.{0,63}\S$|^\S$/

async function readConnections() {
  try {
    const doc = JSON.parse(await readFile(CONNECTIONS_FILE, 'utf8'))
    return Array.isArray(doc?.connections) ? doc.connections : []
  } catch { return [] }
}

async function writeConnections(list) {
  await mkdir(DIR, { recursive: true })
  await writeFile(CONNECTIONS_FILE, JSON.stringify({ connections: list }, null, 2), 'utf8')
}

function publicConnection(c) {
  const { password, ...rest } = c
  return { ...rest, hasPassword: typeof password === 'string' && password.length > 0 }
}

/**
 * Turn tool/API args into one concrete SSH connection spec: either a saved
 * connection by name, or explicit host + username (+ password or key path).
 * @param list - the saved connections.
 * @param payload - request/tool arguments.
 * @returns a connection spec with numeric port and normalized auth fields.
 */
export function resolveConnection(list, payload = {}) {
  const name = typeof payload.connection === 'string' ? payload.connection.trim() : ''
  if (name) {
    const hit = list.find((c) => c.name === name)
    if (!hit) throw new Error(`conexão "${name}" não encontrada — salve-a na aba SSH`)
    return normalizeConnection(hit)
  }
  const host = String(payload.host ?? '').trim()
  const username = String(payload.username ?? '').trim()
  if (!host || !username) throw new Error('informe "connection" (nome salvo) ou "host" + "username"')
  return normalizeConnection({ host, port: payload.port, username, password: payload.password ?? '', keyPath: payload.key_path ?? payload.keyPath ?? '' })
}

/**
 * Normalize one connection spec: numeric port, auth chosen by what is present.
 * @param c - raw connection object (saved or explicit).
 * @returns the normalized spec consumed by the Python helpers.
 */
export function normalizeConnection(c) {
  const keyPath = String(c.keyPath ?? c.key_path ?? '').trim()
  const password = String(c.password ?? '')
  return {
    name: String(c.name ?? ''),
    host: String(c.host ?? '').trim(),
    port: Number(c.port) > 0 ? Number(c.port) : DEFAULT_PORT,
    username: String(c.username ?? '').trim(),
    auth: keyPath ? 'key' : 'password',
    password,
    keyPath,
  }
}

// ── paramiko subprocess bridge ──────────────────────────────────────────────
// Secrets travel on stdin (never argv, which leaks into process listings) and
// the helpers answer with exactly one JSON line on stdout.

function runJson(script, payload, timeoutMs, signal) {
  return new Promise((resolveP, rejectP) => {
    const venvPython = venvExe('python')
    if (!existsSync(venvPython)) {
      rejectP(new Error('paramiko não instalado — abra a aba SSH e clique em "Instalar paramiko"'))
      return
    }
    const child = spawn(venvPython, [script], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; try { child.kill() } catch { /* já saiu */ } rejectP(new Error(`tempo esgotado (${Math.round(timeoutMs / 1000)}s) — processo encerrado`)) }
    }, timeoutMs)
    signal?.addEventListener('abort', () => {
      if (!settled) { settled = true; clearTimeout(timer); try { child.kill() } catch { /* já saiu */ } rejectP(new Error('cancelado')) }
    }, { once: true })
    child.stdout?.on('data', (d) => { if (out.length < 512 * 1024) out += d })
    child.stderr?.on('data', (d) => { if (err.length < 64 * 1024) err += d })
    child.on('error', (e) => { if (!settled) { settled = true; clearTimeout(timer); rejectP(new Error(String(e))) } })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const lines = out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{'))
      const last = lines[lines.length - 1]
      if (last) {
        try {
          const doc = JSON.parse(last)
          resolveP(doc)
          return
        } catch { /* cai no erro abaixo */ }
      }
      rejectP(new Error(`helper Python saiu (exit ${code}) sem JSON: ${(err || out || 'sem saída').slice(-400)}`))
    })
    child.stdin?.write(JSON.stringify(payload))
    child.stdin?.end()
  })
}

/**
 * Run one command (or a connectivity test when `command` is null) on a remote
 * server through the paramiko helper script.
 * @param conn - normalized connection spec.
 * @param command - the remote shell command, or null for connect-only.
 * @param timeout - per-command inactivity timeout in seconds.
 * @param signal - optional abort signal propagated to the child process.
 * @returns the helper's JSON answer (`{ok, exit_code, stdout, stderr}` or `{ok:false, error}`).
 */
async function sshExec(conn, command, timeout, signal) {
  return runJson(SSH_RUN_PY, {
    conn: { host: conn.host, port: conn.port, username: conn.username, password: conn.password, key_path: conn.keyPath },
    command,
    timeout,
  }, timeout * 1000 + 20_000, signal)
}

/**
 * Upload or download one file through the paramiko SFTP helper script.
 * @param conn - normalized connection spec.
 * @param direction - 'upload' (local → remote) or 'download' (remote → local).
 * @param localPath - absolute local path.
 * @param remotePath - absolute remote path.
 * @param signal - optional abort signal propagated to the child process.
 * @returns the helper's JSON answer (`{ok, bytes}` or `{ok:false, error}`).
 */
async function sftpTransfer(conn, direction, localPath, remotePath, signal) {
  return runJson(SSH_TRANSFER_PY, {
    conn: { host: conn.host, port: conn.port, username: conn.username, password: conn.password, key_path: conn.keyPath },
    direction,
    local_path: localPath,
    remote_path: remotePath,
  }, 120_000, signal)
}

async function paramikoVersion() {
  if (!existsSync(venvExe('python'))) return null
  const r = await run(venvExe('python'), ['-c', 'import paramiko; print(paramiko.__version__)'])
  return r.code === 0 ? r.out.trim() || null : null
}

async function statusPayload(interpreters) {
  let python = { found: false, command: null, version: null }
  for (const candidate of interpreters) {
    const [cmd, ...args] = candidate.split(' ')
    const r = await run(cmd, [...args, '--version'])
    const version = r.code === 0 ? parsePythonVersion(r.out) : null
    if (supportedPython(version)) {
      python = { found: true, command: candidate, version: r.out.trim() }
      break
    }
  }
  const connections = await readConnections()
  const pv = await paramikoVersion()
  return {
    python,
    venv: { exists: existsSync(venvExe('python')), dir: VENV_DIR },
    paramiko: { installed: !!pv, version: pv },
    connections: connections.length,
    ready: !!pv,
    job: { phase: job.phase, step: job.step, log: job.log.slice(-12) },
  }
}

/** Truncate one tool output field, keeping the tail of stderr on overflow. */
function clip(text, max = MAX_TOOL_OUTPUT_CHARS) {
  const s = String(text ?? '')
  return s.length <= max ? s : s.slice(0, max) + `\n… (${s.length - max} caracteres cortados)`
}

// ── agent tools ──────────────────────────────────────────────────────────────
// The descriptions are the agents' knowledge that SSH exists, how to address a
// server (saved connection name or explicit host), and the auto-accept host
// key policy: model-visible, always in sync with the SSH tab.

function connectionParams() {
  return {
    connection: { type: 'string', description: 'Name of a saved SSH connection (SSH tab in the sidebar). Omit to connect with explicit host/username instead.' },
    host: { type: 'string', description: 'Explicit mode: remote hostname or IP. Required when "connection" is omitted.' },
    port: { type: 'number', description: 'SSH port; default 22.' },
    username: { type: 'string', description: 'Explicit mode: remote user. Required when "connection" is omitted.' },
    password: { type: 'string', description: 'Explicit mode: password (or key passphrase when key_path is set). Saved connections keep their own.' },
    key_path: { type: 'string', description: 'Explicit mode: path to a local private key file (e.g. ~/.ssh/id_ed25519).' },
  }
}

function sshRunTool() {
  return defineTool({
    name: 'ssh_run',
    description:
      'Run ONE shell command on a remote server over SSH (external VPS/host) and return its exit code, stdout and stderr. ' +
      'Address the server either by the name of a saved connection (managed in the SSH sidebar tab) or with explicit ' +
      'host + username (+ password or key_path). Use it for remote operations the user asks for: deploys, service ' +
      'restarts, log inspection, remote builds, server diagnosis. The command runs in the remote user\'s login shell; ' +
      'working directory and environment do not persist between calls, so use absolute paths or `cd … && …` in one ' +
      'command. Unknown host keys are auto-accepted on first connect. Prefer short commands; pass a timeout for ' +
      'long-running ones.',
    parameters: {
      ...connectionParams(),
      command: { type: 'string', required: true, description: 'The shell command to execute on the remote server.' },
      timeout: { type: 'number', description: 'Inactivity timeout in seconds before the call is abandoned; default 60.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          exit_code: { type: 'integer', required: true },
          stdout: { type: 'string', required: true },
          stderr: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `exit ${value.exit_code}\n${clip(value.stdout)}${value.stderr ? `\n[stderr]\n${clip(value.stderr)}` : ''}`,
      }],
    },
    async execute(args, exec) {
      const list = await readConnections()
      const conn = resolveConnection(list, args)
      const timeout = Number(args.timeout) > 0 ? Number(args.timeout) : 60
      const r = await sshExec(conn, String(args.command ?? ''), timeout, exec?.signal)
      if (!r.ok) throw new Error(r.error || 'ssh_run falhou sem detalhes')
      return {
        exit_code: Number(r.exit_code ?? -1),
        stdout: clip(r.stdout ?? ''),
        stderr: clip(r.stderr ?? ''),
      }
    },
    presentCall: (args) => ({
      card: 'generic',
      title: 'SSH run',
      kind: 'other',
      rawInput: args.password ? { ...args, password: '***' } : args,
    }),
  })
}

function sshTransferTool() {
  return defineTool({
    name: 'ssh_transfer',
    description:
      'Upload or download a single file over SFTP between this machine and a remote SSH server (external VPS/host). ' +
      'direction "upload" sends the local file to remote_path; "download" writes the remote file to local_path. ' +
      'Address the server by saved connection name or explicit host + username (+ password or key_path), same as ' +
      'ssh_run. Relative local paths resolve against the session workspace.',
    parameters: {
      ...connectionParams(),
      direction: { type: 'string', required: true, description: '"upload" (local → remote) or "download" (remote → local).' },
      local_path: { type: 'string', required: true, description: 'Local file path; relative paths resolve against the session workspace.' },
      remote_path: { type: 'string', required: true, description: 'Absolute remote file path.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          direction: { type: 'string', required: true },
          local_path: { type: 'string', required: true },
          remote_path: { type: 'string', required: true },
          bytes: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `${value.direction === 'upload' ? 'Enviado' : 'Baixado'} ${value.bytes} bytes: ${value.local_path} ⇄ ${value.remote_path}`,
      }],
    },
    async execute(args, exec) {
      const direction = args.direction === 'download' ? 'download' : args.direction === 'upload' ? 'upload' : null
      if (!direction) throw new Error('direction deve ser "upload" ou "download"')
      const local = isAbsolute(String(args.local_path ?? ''))
        ? resolve(String(args.local_path))
        : resolve(exec?.agent?.session?.header?.cwd ?? process.cwd(), String(args.local_path))
      const remote = String(args.remote_path ?? '').trim()
      if (!remote) throw new Error('remote_path obrigatório')
      const list = await readConnections()
      const conn = resolveConnection(list, args)
      const r = await sftpTransfer(conn, direction, local, remote, exec?.signal)
      if (!r.ok) throw new Error(r.error || 'ssh_transfer falhou sem detalhes')
      return { direction, local_path: local, remote_path: remote, bytes: Number(r.bytes ?? 0) }
    },
    presentCall: (args) => ({
      card: 'generic',
      title: 'SSH transfer',
      kind: 'other',
      rawInput: args.password ? { ...args, password: '***' } : args,
    }),
  })
}

// ── API ───────────────────────────────────────────────────────────────────
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

export function apply(ctx, config = {}) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }
  const tools = ctx.get('tools')
  if (!tools || typeof tools.register !== 'function') {
    log('tools service unavailable — agent tools not registered')
    return
  }

  const interpreters = config.pythonCandidates?.length ? config.pythonCandidates : platformInterpreters()

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/paramiko/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'status': {
          const p = await statusPayload(interpreters)
          return json(res, 200, { ok: true, ...p })
        }
        case 'install': {
          if (job.phase === 'installing') return json(res, 409, { ok: false, error: 'instalação já em andamento' })
          if (await paramikoVersion()) return json(res, 200, { ok: true, already: true })
          spawnInstaller(interpreters)
          return json(res, 200, { ok: true })
        }
        case 'connections/list': {
          const list = await readConnections()
          return json(res, 200, { ok: true, connections: list.map(publicConnection) })
        }
        case 'connections/save': {
          const name = String(payload.name ?? '').trim()
          const host = String(payload.host ?? '').trim()
          const username = String(payload.username ?? '').trim()
          if (!name || !NAME_RE.test(name)) return json(res, 400, { ok: false, error: 'nome de conexão inválido' })
          if (!host) return json(res, 400, { ok: false, error: 'host obrigatório' })
          if (!username) return json(res, 400, { ok: false, error: 'username obrigatório' })
          const list = await readConnections()
          const prev = list.find((c) => c.name === name)
          const entry = {
            name,
            host,
            port: Number(payload.port) > 0 ? Number(payload.port) : DEFAULT_PORT,
            username,
            auth: payload.keyPath ? 'key' : 'password',
            // Sem senha no payload → mantém a salva antes (a UI nunca devolve a senha).
            password: typeof payload.password === 'string' && payload.password.length > 0 ? payload.password : (prev?.password ?? ''),
            keyPath: String(payload.keyPath ?? '').trim(),
          }
          const next = list.filter((c) => c.name !== name).concat(entry)
          await writeConnections(next)
          log(`conexão salva: ${name} (${username}@${host}:${entry.port})`)
          return json(res, 200, { ok: true, connections: next.map(publicConnection) })
        }
        case 'connections/delete': {
          const name = String(payload.name ?? '').trim()
          const list = await readConnections()
          const next = list.filter((c) => c.name !== name)
          if (next.length === list.length) return json(res, 404, { ok: false, error: `conexão "${name}" não existe` })
          await writeConnections(next)
          return json(res, 200, { ok: true, connections: next.map(publicConnection) })
        }
        case 'connections/test': {
          const list = await readConnections()
          const conn = resolveConnection(list, payload)
          const r = await sshExec(conn, null, 30, null)
          return json(res, 200, r.ok ? { ok: true, message: `conectado a ${conn.host}:${conn.port} como ${conn.username}` } : { ok: false, error: r.error })
        }
        case 'run': {
          const list = await readConnections()
          const conn = resolveConnection(list, payload)
          const command = String(payload.command ?? '').trim()
          if (!command) return json(res, 400, { ok: false, error: 'command obrigatório' })
          const timeout = Number(payload.timeout) > 0 ? Number(payload.timeout) : 60
          const r = await sshExec(conn, command, timeout, null)
          if (!r.ok) return json(res, 200, { ok: false, error: r.error })
          return json(res, 200, { ok: true, exit_code: Number(r.exit_code ?? -1), stdout: clip(r.stdout), stderr: clip(r.stderr) })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/paramiko/api', handler }), 'dsh-paramiko: api')

  const toolsToRegister = [sshRunTool(), sshTransferTool()]
  for (const tool of toolsToRegister) {
    ctx.effect(() => tools.register(tool), `dsh-paramiko: tool ${tool.name}`)
  }
  log(`agent tools: ${toolsToRegister.map((t) => t.name).join(', ')} (venv em ${VENV_DIR})`)
  log('loaded')
}
