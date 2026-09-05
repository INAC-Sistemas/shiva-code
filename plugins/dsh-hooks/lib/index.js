// dsh-hooks host half: a registry of NON-CORE hooks — listeners on the harness
// core events that WE author and that are discoverable + per-profile
// enable/disable. Each hook attaches its ctx.on listeners only when it is
// enabled for the ACTIVE profile (profiles.json). Toggling updates the profile
// and the UI reloads; switching profiles re-attaches only that profile's hooks.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const inject = ['webServer', 'sessions']

const PROFILES_FILE = join(homedir(), '.dsh', 'profiles', 'profiles.json')
const BUILTIN_DIRS = ['mds', 'prototype']
const TICKET_DIR = 'mds'
const MAX_CTX = 2000

function log(msg) {
  console.log(`[dsh-hooks] ${msg}`)
}

async function activeProfile() {
  try {
    const raw = JSON.parse(await readFile(PROFILES_FILE, 'utf8'))
    return raw.profiles?.find((p) => p.id === raw.active) ?? null
  } catch { return null }
}

/** True when a hook is enabled: profile.hooks allow-list, else its default. */
async function hookEnabled(id, def) {
  const p = await activeProfile()
  if (!p) return def.defaultEnabled
  const list = Array.isArray(p.hooks) ? p.hooks : []
  return list.length ? list.includes(id) : def.defaultEnabled
}

/** Nome/status dos tickets abertos (Kanban) do workspace, para process-awareness. */
async function ticketState(workspace) {
  const epicsDir = join(workspace, 'mds', 'epics')
  if (!existsSync(epicsDir)) return ''
  let dirs = []
  try { dirs = await readdir(epicsDir, { withFileTypes: true }) } catch { return '' }
  const lines = []
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith('.')) continue
    const td = join(epicsDir, d.name, '06-tickets')
    if (!existsSync(td)) continue
    let files = []
    try { files = await readdir(td) } catch { continue }
    for (const f of files.sort()) {
      if (!f.toLowerCase().endsWith('.md') || f.startsWith('.')) continue
      try {
        const text = await readFile(join(td, f), 'utf8')
        const status = /^status:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? 'active'
        const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? f.replace(/\.md$/i, '')
        lines.push(`${f.replace(/\.md$/i, '')} [${status}] — ${title}`)
      } catch { /* pula */ }
    }
  }
  return lines.slice(0, 12).join('\n')
}

// ── the hook definitions we author ────────────────────────────────────────
export const HOOKS = [
  {
    id: 'workspace-ready',
    label: 'Workspace pronto',
    description: 'Garante mds/ e prototype/ no workspace ao abrir uma sessão.',
    defaultEnabled: true,
    attach(ctx) {
      ctx.on('agent/session-start', ({ agent }) => {
        const cwd = agent?.session?.header?.cwd
        if (!cwd) return
        for (const dir of BUILTIN_DIRS) {
          mkdir(join(cwd, dir), { recursive: true }).catch(() => {})
        }
      })
    },
  },
  {
    id: 'process-awareness',
    label: 'Consciência do processo',
    description: 'Injecta no primeiro turno um system-reminder com os tickets/Kanban abertos do workspace.',
    defaultEnabled: true,
    attach(ctx) {
      const done = new Set()
      ctx.on('agent/pre-step', async ({ agent, turn, step, signal }, next) => {
        const decision = await next()
        if (decision.kind === 'reject') return decision
        if (turn !== 0 || step !== 0) return decision
        if (done.has(agent.id)) return decision
        const cwd = agent?.session?.header?.cwd
        if (!cwd) return decision
        signal.throwIfAborted()
        const state = await ticketState(cwd)
        if (!state) return decision
        done.add(agent.id)
        const reminder = createUserMessage({
          content: [{
            type: 'text',
            text: '<system-reminder><dsh_hooks_process>\nTickets/estado do processo:\n' + state + '\n</dsh_hooks_process></system-reminder>',
          }],
        })
        return { kind: 'enter', messages: [...decision.messages, reminder] }
      })
    },
  },
  {
    id: 'action-log',
    label: 'Log de ações',
    description: 'Guarda no OpenViking (remember) cada ferramenta executada, para trilha de auditoria.',
    defaultEnabled: true,
    attach(ctx) {
      ctx.on('tools/result', (exec, result) => {
        const name = exec?.tool?.name ?? exec?.name ?? 'tool'
        if (!name || name.startsWith('mcp__openviking__')) return
        const ok = !result?.error
        const text = `[action] ${name} ${ok ? 'OK' : 'ERRO'}`
        void fetch('http://127.0.0.1:1933/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 'h', method: 'tools/call', params: { name: 'remember', arguments: { messages: [{ role: 'user', content: text }] } } }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => {})
      })
    },
  },
]

// ── apply ─────────────────────────────────────────────────────────────────

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') return

  // Só liga os hooks habilitados no perfil ativo (o dsh-hooks é o registro).
  for (const hook of HOOKS) {
    void hookEnabled(hook.id, hook).then((on) => {
      if (on) hook.attach(ctx)
    })
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/hooks/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    const payload = {}
    try {
      for await (const chunk of req) { /* dreno, ignora corpo */ }
    } catch { /* corpo opcional */ }
    try {
      switch (method) {
        case 'list': {
          const p = await activeProfile()
          const hooks = HOOKS.map((h) => ({
            id: h.id, label: h.label, description: h.description,
            defaultEnabled: h.defaultEnabled,
            enabled: null, // preenchido abaixo
          }))
          for (const h of hooks) h.enabled = await hookEnabled(h.id, HOOKS.find((x) => x.id === h.id))
          return json(res, 200, { ok: true, hooks, profileHooks: p?.hooks ?? null })
        }
        case 'toggle': {
          const id = String(payload.id ?? '')
          const on = !!payload.on
          const p = await activeProfile()
          if (!p) return json(res, 404, { ok: false, error: 'nenhum perfil ativo' })
          const list = Array.isArray(p.hooks) ? p.hooks : []
          const next = on ? [...new Set([...list, id])] : list.filter((x) => x !== id)
          const raw = JSON.parse(await readFile(PROFILES_FILE, 'utf8'))
          const prof = raw.profiles.find((x) => x.id === p.id)
          if (prof) { prof.hooks = next; await writeFile(PROFILES_FILE, JSON.stringify(raw, null, 2), 'utf8') }
          log(`hook "${id}" ${on ? 'ativado' : 'desativado'} no perfil ${p.id}`)
          return json(res, 200, { ok: true, hooks: next })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/hooks/api', handler }), 'dsh-hooks: api')
  log('loaded — registro de hooks (hooks non-core, por perfil)')
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}
