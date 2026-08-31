// dsh-profiles host half: a KISS multiuser profile layer. One dsh, one home;
// a profile just decides which preset, which skills and which better-sidebar
// plugins are in play. Switching is logout → `location.reload()`. The active
// profile is persisted in ~/.dsh/profiles/profiles.json.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const inject = ['webServer', 'sessions']
export const PROFILES_FILE = join(homedir(), '.dsh', 'profiles', 'profiles.json')

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

function log(msg) {
  console.log(`[dsh-profiles] ${msg}`)
}

async function readStore() {
  try {
    const raw = JSON.parse(await readFile(PROFILES_FILE, 'utf8'))
    return { profiles: Array.isArray(raw.profiles) ? raw.profiles : [], active: raw.active ?? null }
  } catch { return { profiles: [], active: null } }
}

async function writeStore(store) {
  await mkdir(join(homedir(), '.dsh', 'profiles'), { recursive: true })
  await writeFile(PROFILES_FILE, JSON.stringify(store, null, 2), 'utf8')
}

async function getActive() {
  const s = await readStore()
  return s.profiles.find((p) => p.id === s.active) ?? null
}

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

// Plugin ids the profile can toggle. Kept as the source of truth for the
// create/edit modal so a profile only ever offers real tabs.
export const KNOWN_PLUGINS = [
  'dsh-better-sidebar:skills',
  'dsh-mds:artifacts',
  'dsh-prototype:view',
  'dsh-kanban:board',
  'dsh-openviking:memory',
  'dsh-ssh-tunnel:*',
  'dsh-docs-panel:docs',
  'dsh-flowglass:*',
  'dsh-sidebar-qa:*',
]

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer indisponível — perfil inativo')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/profiles/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'bootstrap': {
          const store = await readStore()
          const active = store.profiles.find((p) => p.id === store.active) ?? null
          return json(res, 200, { ok: true, active, profiles: store.profiles, plugins: KNOWN_PLUGINS })
        }
        case 'list': {
          const store = await readStore()
          return json(res, 200, { ok: true, profiles: store.profiles, active: store.active })
        }
        case 'create': {
          const id = String(payload.id ?? '').trim().toLowerCase()
          const label = String(payload.label ?? '').trim()
          if (!NAME_RE.test(id)) return json(res, 400, { ok: false, error: `id inválido "${id}" (minúsculas, 1-32 chars)` })
          if (!label) return json(res, 400, { ok: false, error: 'label obrigatório' })
          const store = await readStore()
          if (store.profiles.some((p) => p.id === id)) return json(res, 409, { ok: false, error: 'já existe' })
          const profile = {
            id,
            label,
            preset: String(payload.preset ?? 'default'),
            plugins: Array.isArray(payload.plugins) ? payload.plugins.map(String) : [],
            skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [],
            createdAt: new Date().toISOString(),
          }
          store.profiles.push(profile)
          await writeStore(store)
          log(`criado perfil "${id}"`)
          return json(res, 200, { ok: true, profile })
        }
        case 'update': {
          const id = String(payload.id ?? '')
          const store = await readStore()
          const p = store.profiles.find((x) => x.id === id)
          if (!p) return json(res, 404, { ok: false, error: 'não encontrado' })
          if (payload.label !== undefined) p.label = String(payload.label)
          if (payload.preset !== undefined) p.preset = String(payload.preset)
          if (payload.plugins !== undefined) p.plugins = Array.isArray(payload.plugins) ? payload.plugins.map(String) : []
          if (payload.skills !== undefined) p.skills = Array.isArray(payload.skills) ? payload.skills.map(String) : []
          await writeStore(store)
          return json(res, 200, { ok: true, profile: p })
        }
        case 'delete': {
          const id = String(payload.id ?? '')
          const store = await readStore()
          const before = store.profiles.length
          store.profiles = store.profiles.filter((p) => p.id !== id)
          if (store.active === id) store.active = null
          await writeStore(store)
          return json(res, 200, { ok: true, deleted: store.profiles.length < before })
        }
        case 'setActive': {
          const id = payload.active === null ? null : String(payload.active ?? '')
          const store = await readStore()
          if (id !== null && !store.profiles.some((p) => p.id === id)) return json(res, 404, { ok: false, error: 'perfil não encontrado' })
          store.active = id
          await writeStore(store)
          log(`perfil ativo: ${id ?? '(nenhum)'}`)
          return json(res, 200, { ok: true, active: id })
        }
        case 'logout': {
          const store = await readStore()
          store.active = null
          await writeStore(store)
          log('logout')
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/profiles/api', handler }), 'dsh-profiles: api')
  log('loaded')
}
