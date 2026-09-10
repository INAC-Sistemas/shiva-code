// Railway CLI provider config for the generic dsh CLI-provider skeleton.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function linkInfo(cwd) {
  try {
    const text = await readFile(join(cwd, '.railway', 'config.json'), 'utf8')
    return JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch { return null }
}

export const PROVIDER = {
  id: 'railway',
  title: 'Railway',
  order: 45,
  cli: 'railway',
  versionArgs: ['--version'],
  tokenEnv: 'RAILWAY_TOKEN',
  installs: [
    { label: 'npm', cmd: 'npm', args: ['install', '-g', '@railway/cli'] },
    { label: 'scoop', cmd: 'scoop', args: ['install', 'railway'] },
  ],
  authCheck: { args: ['whoami'] },
  account: { args: ['whoami'] },
  login: {
    args: ['login', '--browserless'],
    urlRegex: /https:\/\/railway\.com\/[^\s"']*/,
    codeRegex: /\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/,
  },
  logout: { args: ['logout'] },

  async detectWorkspace(run, cwd, info) {
    const linked = await linkInfo(cwd)
    const st = await run('railway', ['status', '--json'], { cwd, timeout: 30000 })
    let parsed = null
    if (st.code === 0) { try { parsed = JSON.parse(st.out) } catch { /* texto */ } }
    if (linked || (st.code === 0 && st.out.trim())) {
      info.linked = true
      const name = parsed?.name ?? linked?.name ?? parsed?.project?.name ?? parsed?.service?.name ?? 'projeto vinculado'
      info.name = typeof name === 'string' ? name : 'projeto vinculado'
      info.url = 'https://railway.com/dashboard'
      if (parsed?.environment?.name) info.details.push({ label: 'Ambiente', value: String(parsed.environment.name) })
      if (parsed?.service?.name) info.details.push({ label: 'Serviço', value: String(parsed.service.name) })
    }
    return info
  },

  async collect(run, cwd, { items, activity, actions }) {
    const st = await run('railway', ['status', '--json'], { cwd, timeout: 30000 })
    if (st.code === 0) {
      try {
        const p = JSON.parse(st.out)
        if (p?.name) items.push({ label: 'Projeto', value: String(p.name) })
      } catch { /* texto */ }
    }
    const deploys = await run('railway', ['deployment', 'list', '--json'], { cwd, timeout: 40000 })
    if (deploys.code === 0) {
      try {
        const arr = JSON.parse(deploys.out)
        const list = Array.isArray(arr) ? arr : (arr.deployments ?? [])
        const latest = list[0]
        if (latest) {
          const state = latest.status ?? latest.state ?? 'desconhecido'
          items.push({ label: 'Último deploy', value: String(state), tone: /SUCCESS|READY/i.test(state) ? undefined : /FAIL|CRASH/i.test(state) ? 'err' : 'warn' })
        }
        for (const d of list.slice(0, 6)) activity.push({ label: String(d.id ?? d.deploymentId ?? 'deploy').slice(0, 12), detail: String(d.status ?? d.state ?? ''), url: 'https://railway.com/dashboard' })
      } catch { /* saída inesperada */ }
    }
    const vars = await run('railway', ['variable', 'list', '--json'], { cwd, timeout: 40000 })
    if (vars.code === 0) {
      try {
        const obj = JSON.parse(vars.out)
        const names = Array.isArray(obj) ? obj.map((v) => v.name).filter(Boolean) : Object.keys(obj ?? {})
        if (names.length) items.push({ label: 'Variáveis', value: `${names.length} (nomes apenas)` })
      } catch { /* saída inesperada */ }
    }
    actions.push({ id: 'up', label: 'Deploy', primary: true })
    actions.push({ id: 'redeploy', label: 'Redeploy' })
    actions.push({ id: 'open', label: 'Abrir dashboard' })
  },

  actions: {
    open: async () => ({ ok: true, open: 'https://railway.com/dashboard' }),
    up: async (run, cwd) => {
      const r = await run('railway', ['up', '--json'], { cwd, timeout: 600000 })
      return { ok: r.code === 0, output: r.out.slice(-1500) }
    },
    redeploy: async (run, cwd) => {
      const r = await run('railway', ['redeploy', '--yes'], { cwd, timeout: 300000 })
      return { ok: r.code === 0, output: r.out.slice(-800) }
    },
  },
}
