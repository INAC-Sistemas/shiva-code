// dsh-assets host half: one workspace-root folder (`assets/`) holding the
// project's AI-generated media (images, videos, audio). The plugin picks a
// provider and per-kind models in settings, exposes generation as agent tools
// (generate_image / generate_video / generate_audio) so the agents know they
// can produce media, serves the folder over the API for gallery previews, and
// saves every generated file into the workspace. Every path the API accepts is
// relative and guarded to stay inside that folder.

import { readFile, writeFile, readdir, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative, dirname, sep, basename, extname } from 'node:path'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['webServer', 'sessions', 'tools']

/** The folder this plugin owns inside the workspace; overridable via cordis config. */
export const ASSETS_FOLDER = 'assets'

/** The settings document the plugin owns under the dsh home (provider + models). */
const SETTINGS_FILE = join(homedir(), '.dsh', 'assets', 'settings.json')

const NAME_RE = /^[^\\/:*?"<>|\x00-\x1f]+$/
const MAX_PROMPT_CHARS = 8000
const MAX_LIST_ENTRIES = 2000

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac',
}

function kindOf(name) {
  const ext = extname(name).toLowerCase()
  if (MIME[ext]?.startsWith('image/')) return 'image'
  if (MIME[ext]?.startsWith('video/')) return 'video'
  if (MIME[ext]?.startsWith('audio/')) return 'audio'
  return null
}

function log(msg) {
  console.log(`[dsh-assets] ${msg}`)
}

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

function readBody(req, limitBytes = 128 * 1024) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limitBytes) { rejectP(new Error('payload too large')); req.destroy(); return }
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
 * The workspace for one request. The tab sends the ACTIVE session's scope
 * ({sessionId, cwd} from better-sidebar), which wins. Order: explicit absolute
 * cwd → session matching the id → process cwd.
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

/** Slug for generated filenames: keeps the prompt recognizable in the gallery. */
function slugOf(text, maxWords = 6) {
  const words = String(text ?? '').toLowerCase().normalize('NFKD')
    .replaceAll(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, maxWords)
  return words.join('-').slice(0, 60) || 'asset'
}

async function uniqueTarget(root, name) {
  const ext = extname(name)
  const stem = basename(name, ext)
  let candidate = join(root, name)
  let n = 2
  while (existsSync(candidate)) {
    candidate = join(root, `${stem}-${n}${ext}`)
    n++
    if (n > 500) throw new Error('too many files with the same stem')
  }
  return candidate
}

// ── settings ─────────────────────────────────────────────────────────────────
// One provider plus one model per kind. Empty model for a kind = generation
// for that kind stays disabled with a clear message.

const DEFAULT_SETTINGS = { provider: 'openrouter', imageModel: '', videoModel: '', audioModel: '' }

async function readSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(await readFile(SETTINGS_FILE, 'utf8')) } }
  catch { return { ...DEFAULT_SETTINGS } }
}

async function writeSettings(patch) {
  const next = { ...(await readSettings()), ...patch, updatedAt: new Date().toISOString() }
  await mkdir(dirname(SETTINGS_FILE), { recursive: true })
  await writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8')
  log(`settings saved (${next.provider})`)
  return next
}

/** Resolve a provider API key from the dsh credentials seam, never sent to the browser. */
async function resolveKey(ctx, name) {
  try {
    const credentials = ctx?.get?.('credentials')
    if (credentials?.resolve) {
      const hit = await credentials.resolve(name)
      if (hit?.value) return hit.value
    }
  } catch { /* service not reachable from this scope */ }
  try {
    const { load } = await import('js-yaml')
    // The desktop harness keeps its own home (DSH_HOME); the web checkout uses
    // ~/.dsh. Both documents use the same refs shape, so try both.
    const homes = [process.env.DSH_HOME, join(homedir(), '.dsh')].filter(Boolean)
    for (const home of homes) {
      const text = await readFile(join(home, '.credentials.yaml'), 'utf8').catch(() => null)
      if (!text) continue
      const doc = load(text)
      const v = doc?.refs?.[name]
      if (typeof v === 'string' && v) return v
      if (v && typeof v === 'object' && typeof v.value === 'string' && v.value) return v.value
    }
  } catch { /* not found */ }
  return null
}

// ── provider catalogs ────────────────────────────────────────────────────────
// openrouter: the public /models endpoint, filtered by output modality (video
// is not offered there). fal: a curated list — fal has no public catalog
// endpoint; the UI also accepts a custom model id, so the list is a shortcut,
// not a wall.

const FAL_CATALOG = {
  image: ['fal-ai/flux-pro/v1.1', 'fal-ai/flux/schnell', 'fal-ai/recraft-v3'],
  video: ['fal-ai/veo3', 'fal-ai/kling-video/v2.1/master/text-to-video', 'fal-ai/minimax/video-01'],
  audio: ['fal-ai/playai/tts'],
}

async function providerCatalog(ctx, provider, kind) {
  if (provider === 'fal') return { models: FAL_CATALOG[kind] ?? [], needsKey: true, keyName: 'FAL_KEY', hasKey: !!(await resolveKey(ctx, 'FAL_KEY')) }
  if (provider === 'openrouter') {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return { models: [], needsKey: true, keyName: 'OPENROUTER_API_KEY', hasKey: !!(await resolveKey(ctx, 'OPENROUTER_API_KEY')), error: `openrouter /models respondeu ${res.status}` }
      const doc = await res.json()
      const want = kind === 'video' ? ['video'] : [kind]
      const models = (doc?.data ?? [])
        .filter((m) => (m?.architecture?.output_modalities ?? []).some((x) => want.includes(x)))
        .map((m) => m.id)
        .sort()
      return { models, needsKey: true, keyName: 'OPENROUTER_API_KEY', hasKey: !!(await resolveKey(ctx, 'OPENROUTER_API_KEY')) }
    } catch (e) {
      return { models: [], needsKey: true, keyName: 'OPENROUTER_API_KEY', hasKey: !!(await resolveKey(ctx, 'OPENROUTER_API_KEY')), error: String((e && e.message) || e) }
    }
  }
  return { models: [], needsKey: false, keyName: null, hasKey: false, error: `provedor desconhecido "${provider}"` }
}

// ── generation ───────────────────────────────────────────────────────────────

function extFor(mime, fallback) {
  const hit = Object.entries(MIME).find(([, v]) => v === mime)
  return hit ? hit[0] : fallback
}

/** Save one generated asset into the workspace folder; returns its relative path. */
async function saveAsset(root, kind, bytes, filename, mime) {
  await mkdir(root, { recursive: true })
  const safeName = NAME_RE.test(basename(String(filename ?? ''))) ? basename(filename) : null
  const base = safeName ?? `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now() % 100000}-${slugOf('asset')}.${extFor(mime, { image: '.png', video: '.mp4', audio: '.mp3' })[kind]}`
  const name = /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.${extFor(mime, { image: '.png', video: '.mp4', audio: '.mp3' })[kind]}`
  const target = await uniqueTarget(root, name)
  await writeFile(target, bytes)
  log(`saved ${relative(root, target).split(sep).join('/')} (${(bytes.length / 1024).toFixed(0)} KiB)`)
  return relative(root, target).split(sep).join('/')
}

/** OpenRouter chat completion carrying binary output back (images / audio). */
async function openRouterGenerate(ctx, { kind, model, prompt, signal }) {
  const key = await resolveKey(ctx, 'OPENROUTER_API_KEY')
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada no dsh (settings → models)')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    signal,
  })
  if (!res.ok) throw new Error(`openrouter respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const doc = await res.json()
  const msg = doc?.choices?.[0]?.message ?? {}
  if (kind === 'image') {
    const img = (msg.images ?? [])[0]?.image_url?.url ?? ''
    const m = /^data:([^;]+);base64,(.*)$/s.exec(img)
    if (!m) throw new Error(`o modelo ${model} não devolveu imagem (message.images vazio)`)
    return { bytes: Buffer.from(m[2], 'base64'), mime: m[1] }
  }
  if (kind === 'audio') {
    const aud = msg.audio
    if (!aud?.data) throw new Error(`o modelo ${model} não devolveu áudio (message.audio vazio)`)
    return { bytes: Buffer.from(aud.data, 'base64'), mime: `audio/${aud.format || 'mpeg'}` }
  }
  throw new Error('openrouter não suporta geração de vídeo; escolha o provedor fal para vídeo')
}

/** fal.run synchronous call; the response carries provider-hosted URLs. */
async function falGenerate({ kind, model, prompt, signal }) {
  const key = await resolveKey(null, 'FAL_KEY')
  if (!key) throw new Error('FAL_KEY não configurada no dsh (settings → models)')
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { authorization: `Key ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  })
  if (!res.ok) throw new Error(`fal respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const doc = await res.json()
  const url = kind === 'image'
    ? (doc?.images?.[0]?.url ?? doc?.image?.url)
    : kind === 'video'
      ? (doc?.video?.url ?? doc?.video_url)
      : (doc?.audio?.url ?? doc?.audio_url)
  if (!url) throw new Error(`fal/${model} não devolveu ${kind} na resposta`)
  const bin = await fetch(url, { signal })
  if (!bin.ok) throw new Error(`download do ${kind} falhou (${bin.status})`)
  const mime = bin.headers.get('content-type') ?? ''
  return { bytes: Buffer.from(await bin.arrayBuffer()), mime }
}

async function generateAndSave(ctx, root, { kind, prompt, filename, signal }) {
  const settings = await readSettings()
  const model = settings[`${kind}Model`]
  if (!model) throw new Error(`nenhum modelo de ${kind} configurado (aba Assets → configurações)`)
  if (!['image', 'video', 'audio'].includes(kind)) throw new Error(`tipo inválido "${kind}"`)
  const promptText = String(prompt ?? '').trim()
  if (!promptText) throw new Error('prompt required')
  if (promptText.length > MAX_PROMPT_CHARS) throw new Error(`prompt maior que ${MAX_PROMPT_CHARS} caracteres`)
  const out = settings.provider === 'fal'
    ? await falGenerate({ kind, model, prompt: promptText, signal })
    : await openRouterGenerate(ctx, { kind, model, prompt: promptText, signal })
  const rel = await saveAsset(root, kind, out.bytes, filename, out.mime)
  return { path: rel, kind, model, provider: settings.provider, bytes: out.bytes.length }
}

// ── agent tools ──────────────────────────────────────────────────────────────
// The descriptions are the agents' knowledge that media generation exists and
// where files land: model-visible, always in sync with the folder the gallery
// reads.

function assetsTool(kind, label, pluginCtx) {
  return defineTool({
    name: `generate_${kind}`,
    description:
      `Generate one ${kind} with the AI provider configured in the Assets plugin and SAVE it into the ` +
      `workspace's "${ASSETS_FOLDER}/" folder. Use it whenever the user asks for images, videos or audios, or any ` +
      'visual/audio asset for the project. The result returns the saved path relative to the workspace; reference ' +
      `the file in markdown and code as "${ASSETS_FOLDER}/<file>" (relative path, no leading slash). One ${kind} per ` +
      'call; pass a short English description as the prompt and, optionally, a filename (letters, numbers, hyphen).',
    parameters: {
      prompt: { type: 'string', required: true, description: `What the ${kind} should show; short, concrete, English works best across providers.` },
      filename: { type: 'string', description: `Optional file name inside "${ASSETS_FOLDER}/", e.g. "hero-banner". The extension is derived from the provider response.` },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          file: { type: 'string', required: true, description: `Path relative to the workspace root, inside "${ASSETS_FOLDER}/".` },
          kind: { type: 'string', required: true, enum: ['image', 'video', 'audio'] },
          model: { type: 'string', required: true },
          provider: { type: 'string', required: true },
          bytes: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Saved ${value.kind} to ${value.file} (${(value.bytes / 1024).toFixed(0)} KiB, ${value.provider}/${value.model}). Reference it as ${value.file}.`,
      }],
    },
    async execute(args, exec) {
      const cwd = exec?.agent?.session?.header?.cwd ?? process.cwd()
      return generateAndSave(pluginCtx, join(cwd, ASSETS_FOLDER), {
        kind, prompt: args.prompt, filename: args.filename, signal: exec.signal,
      })
    },
    presentCall: (args) => ({ card: 'generic', title: `Generate ${label}`, kind: 'other', rawInput: args }),
  })
}

// ── apply ────────────────────────────────────────────────────────────────────

export function apply(ctx, config = {}) {
  const folder = typeof config.assetsFolder === 'string' && config.assetsFolder.trim() && NAME_RE.test(config.assetsFolder.trim())
    ? config.assetsFolder.trim()
    : ASSETS_FOLDER

  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }

  const assetsRoot = (ctx2, payload) => join(workspaceOf(ctx2, payload), folder)

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/assets/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }

    const workspace = workspaceOf(ctx, payload)
    const root = assetsRoot(ctx, payload)
    try {
      switch (method) {
        case 'status': {
          const settings = await readSettings()
          return json(res, 200, { ok: true, workspace, root, folder, exists: existsSync(root), settings })
        }
        case 'list': {
          if (!existsSync(root)) return json(res, 200, { ok: true, exists: false, folder, entries: [] })
          const entries = []
          const stack = ['']
          while (stack.length > 0 && entries.length < MAX_LIST_ENTRIES) {
            const rel = stack.pop()
            const dirents = await readdir(join(root, rel), { withFileTypes: true }).catch(() => [])
            for (const ent of dirents) {
              if (entries.length >= MAX_LIST_ENTRIES) break
              if (ent.name.startsWith('.')) continue
              const childRel = rel ? `${rel}/${ent.name}` : ent.name
              if (ent.isDirectory()) { stack.push(childRel); continue }
              if (!ent.isFile()) continue
              const kind = kindOf(ent.name)
              if (!kind) continue
              let size = 0
              let mtime = 0
              try { const st = await stat(join(root, childRel)); size = st.size; mtime = st.mtimeMs } catch { /* raced */ }
              entries.push({ path: childRel, kind, size, mtime })
            }
          }
          entries.sort((a, b) => b.mtime - a.mtime)
          return json(res, 200, { ok: true, exists: true, folder, entries })
        }
        case 'config': {
          const patch = {}
          if (payload.provider !== undefined) patch.provider = String(payload.provider)
          for (const k of ['imageModel', 'videoModel', 'audioModel']) {
            if (payload[k] !== undefined) patch[k] = String(payload[k] ?? '')
          }
          const settings = await writeSettings(patch)
          return json(res, 200, { ok: true, settings })
        }
        case 'models': {
          const settings = await readSettings()
          const provider = String(payload.provider ?? settings.provider)
          const kind = ['image', 'video', 'audio'].includes(payload.kind) ? payload.kind : null
          if (!kind) return json(res, 400, { ok: false, error: 'kind required (image|video|audio)' })
          return json(res, 200, { ok: true, provider, kind, ...(await providerCatalog(ctx, provider, kind)) })
        }
        case 'generate': {
          const out = await generateAndSave(ctx, root, {
            kind: payload.kind, prompt: payload.prompt, filename: payload.filename, signal: undefined,
          })
          return json(res, 200, { ok: true, ...out })
        }
        case 'delete': {
          const target = guardRel(root, payload.path)
          if (target === resolve(root)) throw new Error('cannot delete the assets folder itself')
          if (!existsSync(target)) return json(res, 404, { ok: false, error: 'not found' })
          await rm(target, { force: true })
          log(`deleted ${target}`)
          return json(res, 200, { ok: true })
        }
        case 'open_folder': {
          const target = existsSync(root) ? root : workspaceOf(ctx, payload)
          const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open'
          const child = spawn(cmd, [target], { detached: true, stdio: 'ignore' })
          child.on('error', () => {})
          child.unref()
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  /** Media server: GET with Range support so video/audio previews can seek. */
  const fileHandler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, error: 'GET only' })
    let rel
    try { rel = decodeURIComponent(url.pathname.slice('/assets/file/'.length)) } catch { return json(res, 400, { ok: false, error: 'bad path' }) }
    const root = join(workspaceOf(ctx, {}), folder)
    let target
    try { target = guardRel(root, rel) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    const st = await stat(target).catch(() => null)
    if (!st || st.isDirectory()) return json(res, 404, { ok: false, error: 'file not found' })
    const mime = MIME[extname(target).toLowerCase()]
    if (!mime) return json(res, 415, { ok: false, error: 'unsupported media type' })
    const range = String(req.headers.range ?? '')
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    let start = 0
    let end = st.size - 1
    let status = 200
    if (m && (m[1] !== '' || m[2] !== '')) {
      if (m[1] === '' && m[2] !== '') { start = Math.max(0, st.size - Number(m[2])); end = st.size - 1 }
      else {
        start = Number(m[1])
        if (m[2] !== '') end = Math.min(Number(m[2]), st.size - 1)
      }
      if (Number.isNaN(start) || start > end || start >= st.size) {
        res.writeHead(416, { 'content-range': `bytes */${st.size}` })
        return res.end()
      }
      status = 206
    }
    const head = {
      'content-type': mime,
      'content-length': String(end - start + 1),
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
      ...(status === 206 ? { 'content-range': `bytes ${start}-${end}/${st.size}` } : {}),
    }
    res.writeHead(status, head)
    if (req.method === 'HEAD') return res.end()
    const { createReadStream } = await import('node:fs')
    const stream = createReadStream(target, { start, end })
    stream.pipe(res)
    stream.on('error', () => res.destroy())
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/assets/api', handler }), 'dsh-assets: api')
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/assets/file', handler: fileHandler }), 'dsh-assets: files')

  const tools = [assetsTool('image', 'image', ctx), assetsTool('video', 'video', ctx), assetsTool('audio', 'audio', ctx)]
  for (const tool of tools) {
    ctx.effect(() => ctx.tools.register(tool), `dsh-assets: tool ${tool.name}`)
  }

  log('loaded')
  log('/assets/api and /assets/file routes registered')
  log(`agent tools: ${tools.map((t) => t.name).join(', ')} (folder "${folder}/" no workspace)`)
}
