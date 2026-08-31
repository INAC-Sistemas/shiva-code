// dsh-skill-manager host half: CRUD over every skill root the harness reads.
// Skills are plain files (<name>/SKILL.md bundles or <name>.md flats); the
// FileSystemSkillProvider watches these roots, so writes here hot-reload
// without restarting dsh.

import { readFile, writeFile, readdir, stat, mkdir, rm, rename, realpath, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, relative, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

export const inject = ['webServer', 'sessions']

/** User-tier skills live INSIDE this plugin, versioned with the repo. */
const PLUGIN_SKILLS_DIR = fileURLToPath(new URL('../skills', import.meta.url))

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_BODY = 512 * 1024

function log(msg) {
  console.log(`[dsh-skill-manager] ${msg}`)
}

/**
 * The active session's workspace: the tab sends the ACTIVE session's scope
 * ({sessionId, cwd}); explicit cwd wins, then a matching session, then the
 * process cwd.
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
 * Skill roots this plugin manages, in three tiers:
 * - DSH: the harness installation's own skills (its repo .agents/.dsh dirs) —
 *   always listed no matter which workspace is active. Read-only here.
 * - User: skills stored INSIDE this plugin folder, versioned with the repo so
 *   they travel with it to GitHub.
 * - Workspace: `<activeWorkspace>/.skills`, created on demand.
 */
function computeRoots(ctx, payload) {
  const install = process.cwd()
  const workspace = workspaceOf(ctx, payload)
  return [
    { scope: 'dsh-agents', tag: 'dsh', label: 'DSH · .agents/skills', path: join(install, '.agents', 'skills') },
    { scope: 'dsh-dsh', tag: 'dsh', label: 'DSH · .dsh/skills', path: join(install, '.dsh', 'skills') },
    { scope: 'user', tag: 'user', label: 'User · plugin/skills (versioned)', path: PLUGIN_SKILLS_DIR },
    { scope: 'workspace', tag: 'ws', label: 'Workspace · .skills', path: join(workspace, '.skills') },
  ]
}

/** Roots a new skill may be written to (the DSH tier is the harness's own). */
const WRITABLE_SCOPES = new Set(['user', 'workspace'])

/**
 * One-time migration: machine-level user skills (~/.agents/skills,
 * ~/.dsh/skills) are copied into the plugin's versioned folder so nothing the
 * user already had is stranded outside the repo. Existing destinations win —
 * the migration never overwrites.
 */
async function migrateMachineUserSkills() {
  const homes = [
    process.env.DSH_AGENTS_HOME && process.env.DSH_AGENTS_HOME.trim()
      ? resolve(process.env.DSH_AGENTS_HOME.trim())
      : join(homedir(), '.agents'),
    process.env.DSH_HOME && process.env.DSH_HOME.trim()
      ? resolve(process.env.DSH_HOME.trim())
      : join(homedir(), '.dsh'),
  ]
  for (const home of homes) {
    const src = join(home, 'skills')
    if (!existsSync(src)) continue
    let entries = []
    try { entries = await readdir(src, { withFileTypes: true }) } catch { continue }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      const from = join(src, ent.name)
      const to = join(PLUGIN_SKILLS_DIR, ent.name)
      if (existsSync(to)) continue
      if (ent.isDirectory() && existsSync(join(from, 'SKILL.md'))) {
        await mkdir(dirname(to), { recursive: true }).catch(() => {})
        await cp(from, to, { recursive: true }).then(() => log(`migrated ${ent.name} -> plugin/skills`)).catch(() => {})
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        await mkdir(dirname(to), { recursive: true }).catch(() => {})
        await cp(from, to).then(() => log(`migrated ${ent.name} -> plugin/skills`)).catch(() => {})
      }
    }
  }
}

/** True when target lives strictly inside one managed root (realpath-based). */
async function guardPath(roots, target) {
  const t = resolve(target)
  for (const r of roots) {
    if (!existsSync(r.path)) continue
    const base = await realpath(r.path).catch(() => resolve(r.path))
    const tt = await realpath(t).catch(() => t)
    const rel = relative(base, tt)
    if (rel && !rel.startsWith('..') && !resolve(base, rel).startsWith('..')) return { ok: true, root: r }
  }
  return { ok: false }
}

const TRUE_RE = /^\s*(true|1|yes|on)\s*$/i
const FALSE_RE = /^\s*(false|0|no|off)\s*$/i

/** Lenient frontmatter parse: known keys, unknown top-level lines preserved. */
function parseSkill(text) {
  const out = { fmRaw: '', body: text, name: '', description: '', whenToUse: '', modelInvocable: true, userInvocable: true, hasFm: false, complex: false }
  if (!text.startsWith('---')) return out
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  const end = text.slice(3).search(new RegExp(`^---\\r?\\n`, 'm'))
  if (end < 0) return out
  out.hasFm = true
  out.fmRaw = text.slice(3, end + 3).replace(/\r?\n$/, '')
  out.body = text.slice(end + 3 + 1).replace(/^\r?\n/, '')
  const lines = out.fmRaw.split(/\r?\n/)
  const known = new Set(['name', 'description', 'whenToUse', 'disable-model-invocation', 'user-invocable'])
  for (let i = 0; i < lines.length; i++) {
    const m = /^(name|description|whenToUse):\s*(.*)$/.exec(lines[i])
    if (m) {
      let v = m[2].trim()
      if (v === '|' || v === '>' || v === '|-' || v === '>-') { out.complex = true; continue }
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[m[1]] = v
      continue
    }
    let dm
    if ((dm = /^disable-model-invocation:\s*(.*)$/.exec(lines[i]))) out.modelInvocable = !TRUE_RE.test(dm[1])
    else if ((dm = /^user-invocable:\s*(.*)$/.exec(lines[i]))) out.userInvocable = !FALSE_RE.test(dm[1])
  }
  return out
}

async function scanRoot(root) {
  const skills = []
  let entries = []
  try { entries = await readdir(root.path, { withFileTypes: true }) } catch { return skills }
  for (const ent of entries) {
    if (!ent.name || ent.name.startsWith('.')) continue
    let fp
    if (ent.isDirectory()) fp = join(root.path, ent.name, 'SKILL.md')
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) fp = join(root.path, ent.name)
    else continue
    if (!existsSync(fp)) continue
    let parsed
    try { parsed = parseSkill(await readFile(fp, 'utf8')) } catch { continue }
    const valid = NAME_RE.test(parsed.name) && parsed.description.length > 0
    skills.push({
      name: valid ? parsed.name : ent.isDirectory() ? ent.name : ent.name.replace(/\.md$/i, ''),
      description: parsed.description,
      whenToUse: parsed.whenToUse,
      modelInvocable: parsed.modelInvocable,
      userInvocable: parsed.userInvocable,
      valid,
      kind: ent.isDirectory() ? 'bundle' : 'flat',
      scope: root.scope,
      scopeTag: root.tag,
      scopeLabel: root.label,
      path: fp,
    })
  }
  return skills
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
      if (size > MAX_BODY) { rejectP(new Error('payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch (e) { rejectP(new Error('invalid JSON body')) }
    })
    req.on('error', rejectP)
  })
}

/** Same-origin fence: a browser Origin must match the Host the UI is served from. */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === String(req.headers.host ?? '')
  } catch { return false }
}

async function buildSkillFile(p) {
  const lines = ['---', `name: ${p.name}`, `description: ${quote(p.description)}`]
  if (p.whenToUse) lines.push(`whenToUse: ${quote(p.whenToUse)}`)
  if (!p.modelInvocable) lines.push('disable-model-invocation: true')
  if (!p.userInvocable) lines.push('user-invocable: false')
  lines.push('---', '')
  return lines.join('\n') + (p.body ?? '') + ((p.body ?? '').endsWith('\n') || !p.body ? '' : '\n')
}

function quote(v) {
  if (!/[:#{}[\]&*!|>'"%@`\s]/.test(v)) return v
  return `"${v.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — API not registered')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/skill-manager/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    const roots = computeRoots(ctx, payload)
    try {
      switch (method) {
        case 'list': {
          const skills = []
          for (const root of roots) skills.push(...await scanRoot(root))
          return json(res, 200, { ok: true, roots: roots.map((r) => ({ scope: r.scope, label: r.label, path: r.path, exists: existsSync(r.path) })), skills })
        }
        case 'read': {
          const target = resolve(String(payload.path ?? ''))
          const g = await guardPath(roots, target)
          if (!g.ok) return json(res, 403, { ok: false, error: 'path outside managed skill roots' })
          return json(res, 200, { ok: true, content: await readFile(target, 'utf8') })
        }
        case 'create': {
          const name = String(payload.name ?? '')
          if (!NAME_RE.test(name)) return json(res, 400, { ok: false, error: `invalid skill name "${name}" (kebab-case required)` })
          const root = roots.find((r) => r.scope === payload.scope)
          if (!root) return json(res, 400, { ok: false, error: 'unknown scope' })
          if (!WRITABLE_SCOPES.has(root.scope)) return json(res, 403, { ok: false, error: `"${root.scope}" skills are read-only (harness installation)` })
          const dir = join(root.path, name)
          if (existsSync(dir)) return json(res, 409, { ok: false, error: `already exists: ${dir}` })
          await mkdir(dir, { recursive: true })
          const content = await buildSkillFile({ ...payload, name })
          await writeFile(join(dir, 'SKILL.md'), content, 'utf8')
          log(`created ${join(root.path, name, 'SKILL.md')}`)
          return json(res, 200, { ok: true, path: join(dir, 'SKILL.md') })
        }
        case 'update': {
          const target = resolve(String(payload.path ?? ''))
          const g = await guardPath(roots, target)
          if (!g.ok) return json(res, 403, { ok: false, error: 'path outside managed skill roots' })
          const isBundle = target.split(sep).pop() === 'SKILL.md'
          let dir = isBundle ? dirname(target) : dirname(target)
          let fileName = isBundle ? 'SKILL.md' : target.split(sep).pop()
          const newName = payload.newName ? String(payload.newName) : ''
          if (newName && newName !== (isBundle ? dir.split(sep).pop() : String(fileName).replace(/\.md$/i, ''))) {
            if (!NAME_RE.test(newName)) return json(res, 400, { ok: false, error: `invalid new name "${newName}" (kebab-case required)` })
            const dest = isBundle ? join(dirname(dir), newName) : join(dir, newName + '.md')
            if (existsSync(dest)) return json(res, 409, { ok: false, error: `already exists: ${dest}` })
            await rename(isBundle ? dir : target, dest)
            dir = isBundle ? dest : dirname(dest)
            fileName = isBundle ? 'SKILL.md' : newName + '.md'
          }
          const fp = join(dir, fileName)
          await writeFile(fp, String(payload.content ?? ''), 'utf8')
          log(`updated ${fp}`)
          return json(res, 200, { ok: true, path: fp })
        }
        case 'delete': {
          const target = resolve(String(payload.path ?? ''))
          const g = await guardPath(roots, target)
          if (!g.ok) return json(res, 403, { ok: false, error: 'path outside managed skill roots' })
          const isBundle = target.split(sep).pop() === 'SKILL.md'
          const victim = isBundle ? dirname(target) : target
          await rm(victim, { recursive: true, force: true })
          log(`deleted ${victim}`)
          return json(res, 200, { ok: true })
        }
        case 'open': {
          const target = resolve(String(payload.path ?? ''))
          const g = await guardPath(roots, target)
          if (!g.ok) return json(res, 403, { ok: false, error: 'path outside managed skill roots' })
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
      return json(res, 500, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/skill-manager/api', handler }), 'dsh-skill-manager: api')
  migrateMachineUserSkills().catch(() => {})
  log('loaded')
  log('/skill-manager/api route registered')
}
