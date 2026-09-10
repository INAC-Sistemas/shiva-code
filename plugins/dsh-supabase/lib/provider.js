// Supabase CLI provider config for the generic dsh CLI-provider skeleton.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function projectRef(cwd) {
  try {
    const toml = await readFile(join(cwd, 'supabase', 'config.toml'), 'utf8')
    const m = toml.match(/^\s*project_id\s*=\s*"([^"]+)"/m)
    return m ? m[1] : null
  } catch { return null }
}

export const PROVIDER = {
  id: 'supabase',
  title: 'Supabase',
  order: 44,
  cli: 'supabase',
  versionArgs: ['--version'],
  tokenEnv: 'SUPABASE_ACCESS_TOKEN',
  installs: [
    { label: 'npm', cmd: 'npm', args: ['install', '-g', 'supabase'] },
    { label: 'scoop', cmd: 'scoop', args: ['install', 'supabase'] },
  ],
  authCheck: { args: ['projects', 'list'] },
  account: null,
  login: {
    args: ['login'],
    urlRegex: /https:\/\/supabase\.com\/dashboard\/cli\/login[^\s"']*/,
  },
  logout: { args: ['logout'] },

  async detectWorkspace(run, cwd, info) {
    const ref = await projectRef(cwd)
    if (ref) {
      info.linked = true
      info.name = ref
      info.url = `https://supabase.com/dashboard/project/${ref}`
      info.details.push({ label: 'Ref', value: ref })
    }
    return info
  },

  async collect(run, cwd, { items, activity, actions }) {
    const ref = await projectRef(cwd)
    if (ref) {
      const mig = await run('supabase', ['migration', 'list', '--linked'], { cwd, timeout: 40000 })
      if (mig.code === 0) {
        const rows = mig.out.split('\n').filter((l) => l.includes('|') && !l.includes('LOCAL') && !l.includes('---'))
        const pending = rows.filter((l) => {
          const cols = l.split('|').map((c) => c.trim())
          return cols.length >= 2 && cols[0] && !cols[1]
        }).length
        items.push({ label: 'Migrations', value: pending ? `${pending} pendente(s)` : 'em dia', tone: pending ? 'warn' : undefined })
      } else {
        items.push({ label: 'Migrations', value: 'não foi possível listar', tone: 'muted' })
      }
    }
    const projects = await run('supabase', ['projects', 'list'], { timeout: 40000 })
    if (projects.code === 0) {
      const n = projects.out.split('\n').filter((l) => l.includes('|')).length
      items.push({ label: 'Projetos', value: String(n) })
    }
    actions.push({ id: 'db_push', label: 'Aplicar migrations', primary: true, confirm: 'Aplicar as migrations locais no projeto remoto?' })
    actions.push({ id: 'open', label: 'Abrir SQL Editor' })
  },

  actions: {
    open: async (_run, cwd) => {
      const ref = await projectRef(cwd)
      return { ok: true, open: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : 'https://supabase.com/dashboard' }
    },
    db_push: async (run, cwd) => {
      const r = await run('supabase', ['db', 'push', '--linked', '--include-all'], { cwd, timeout: 300000 })
      return { ok: r.code === 0, output: r.out.slice(-1500) }
    },
  },
}
