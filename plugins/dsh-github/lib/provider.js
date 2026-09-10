// GitHub CLI (gh) provider config for the generic dsh CLI-provider skeleton.

export const PROVIDER = {
  id: 'github',
  title: 'GitHub',
  order: 43,
  cli: 'gh',
  versionArgs: ['--version'],
  tokenEnv: 'GH_TOKEN',
  installs: [
    { label: 'winget', cmd: 'winget', args: ['install', '--id', 'GitHub.cli', '-e', '--accept-source-agreements', '--accept-package-agreements'] },
    { label: 'scoop', cmd: 'scoop', args: ['install', 'gh'] },
  ],
  authCheck: { args: ['auth', 'status'] },
  account: { args: ['api', 'user', '--jq', '.login'] },
  login: {
    args: ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web'],
    codeRegex: /\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/,
  },
  logout: { args: ['auth', 'logout', '--hostname', 'github.com'] },

  async detectWorkspace(run, cwd, info) {
    const remote = await run('git', ['-C', cwd, 'remote', 'get-url', 'origin'])
    if (remote.code === 0 && remote.out.trim()) {
      const m = remote.out.trim().replace(/\.git$/, '').match(/github\.com[/:]([^/\s]+\/[^/\s]+)$/)
      info.linked = true
      info.name = m ? m[1] : remote.out.trim()
      info.url = m ? `https://github.com/${m[1]}` : null
    }
    const branch = await run('git', ['-C', cwd, 'branch', '--show-current'])
    if (branch.code === 0 && branch.out.trim()) info.details.push({ label: 'Branch', value: branch.out.trim() })
    const st = await run('git', ['-C', cwd, 'status', '--porcelain'])
    if (st.code === 0) {
      const n = st.out.split('\n').filter(Boolean).length
      info.details.push({ label: 'Alterações', value: n ? `${n} arquivo(s)` : 'limpo' })
    }
    return info
  },

  async collect(run, cwd, { items, activity, actions }) {
    const prs = await run('gh', ['pr', 'list', '--json', 'number,title,state,url,headRefName', '--limit', '5'], { cwd })
    if (prs.code === 0) {
      try {
        const arr = JSON.parse(prs.out)
        items.push({ label: 'Pull requests', value: `${arr.length} aberto(s)` })
        for (const p of arr) activity.push({ label: `#${p.number} ${p.title}`, detail: p.headRefName, url: p.url })
      } catch { /* saída inesperada */ }
    }
    const runs = await run('gh', ['run', 'list', '--json', 'databaseId,status,conclusion,displayTitle,url,headBranch', '--limit', '5'], { cwd })
    if (runs.code === 0) {
      try {
        for (const r of JSON.parse(runs.out)) {
          activity.push({ label: r.displayTitle || `run ${r.databaseId}`, detail: `${r.status}${r.conclusion ? '/' + r.conclusion : ''}`, url: r.url })
        }
      } catch { /* saída inesperada */ }
    }
    actions.push({ id: 'pr_create', label: 'Criar PR', primary: true })
    actions.push({ id: 'open', label: 'Abrir no GitHub' })
  },

  actions: {
    open: async (run, cwd) => {
      const remote = await run('git', ['-C', cwd, 'remote', 'get-url', 'origin'])
      const m = remote.out.trim().replace(/\.git$/, '').match(/github\.com[/:]([^/\s]+\/[^/\s]+)$/)
      return { ok: true, open: m ? `https://github.com/${m[1]}` : null }
    },
    pr_create: async (run, cwd) => {
      const r = await run('gh', ['pr', 'create', '--fill'], { cwd, timeout: 60000 })
      return { ok: r.code === 0, output: r.out.slice(-800) }
    },
  },
}
