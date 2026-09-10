// Vercel CLI provider config for the generic dsh CLI-provider skeleton.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function projectLink(cwd) {
  try {
    const text = await readFile(join(cwd, '.vercel', 'project.json'), 'utf8')
    return JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch { return null }
}

export const PROVIDER = {
  id: 'vercel',
  title: 'Vercel',
  order: 46,
  cli: 'vercel',
  versionArgs: ['--version'],
  tokenEnv: 'VERCEL_TOKEN',
  installs: [
    { label: 'npm', cmd: 'npm', args: ['install', '-g', 'vercel'] },
    { label: 'scoop', cmd: 'scoop', args: ['install', 'vercel'] },
  ],
  authCheck: { args: ['whoami'] },
  account: { args: ['whoami'] },
  login: {
    args: ['login'],
    urlRegex: /https:\/\/vercel\.com\/[^\s"']*/,
    codeRegex: /\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/,
  },
  logout: { args: ['logout'] },

  async detectWorkspace(run, cwd, info) {
    const link = await projectLink(cwd)
    if (link) {
      info.linked = true
      info.name = link.projectName || link.projectId || 'projeto vinculado'
      info.url = 'https://vercel.com/dashboard'
      if (link.orgId) info.details.push({ label: 'Org', value: String(link.orgId).slice(0, 12) })
      if (link.projectId) info.details.push({ label: 'Project', value: String(link.projectId).slice(0, 12) })
    }
    return info
  },

  async collect(run, cwd, { items, activity, actions }) {
    const ls = await run('vercel', ['ls'], { cwd, timeout: 40000 })
    if (ls.code === 0) {
      const lines = ls.out.split('\n').map((l) => l.trim()).filter((l) => /https:\/\/\S+/.test(l))
      items.push({ label: 'Deployments', value: String(lines.length) })
      for (const l of lines.slice(0, 6)) {
        const url = (l.match(/https:\/\/\S+/) || [])[0]
        const state = (l.match(/\b(READY|ERROR|BUILDING|QUEUED|CANCELED)\b/) || [])[1] || ''
        activity.push({ label: url.replace(/^https?:\/\//, ''), detail: state, url })
      }
    }
    actions.push({ id: 'deploy', label: 'Deploy preview', primary: true })
    actions.push({ id: 'deploy_prod', label: 'Deploy produção', danger: true, confirm: 'Fazer deploy em PRODUÇÃO na Vercel?' })
    actions.push({ id: 'open', label: 'Abrir dashboard' })
  },

  actions: {
    open: async () => ({ ok: true, open: 'https://vercel.com/dashboard' }),
    deploy: async (run, cwd) => {
      const r = await run('vercel', ['deploy', '--yes'], { cwd, timeout: 600000 })
      return { ok: r.code === 0, output: r.out.slice(-1200) }
    },
    deploy_prod: async (run, cwd) => {
      const r = await run('vercel', ['deploy', '--prod', '--yes'], { cwd, timeout: 600000 })
      return { ok: r.code === 0, output: r.out.slice(-1200) }
    },
  },
}
