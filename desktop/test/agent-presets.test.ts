import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESKTOP_PROFILE = join(__dirname, '..', 'build', 'agent-presets', 'profile', 'agent.cordis.yml')
const INSTALLED_STANDARD = join(
  __dirname, '..', 'node_modules', '@deepseek-ai', 'dsh-agent-presets', 'presets', 'standard', 'agent.cordis.yml'
)
const IDENTITY = '# ── identity'
const PROFILE_ROWS = '# ── profile-scoped rows'

describe('the desktop profile agent preset', () => {
  it('is the installed standard preset verbatim, so a harness upgrade cannot leave it stale', async () => {
    const profile = await readFile(DESKTOP_PROFILE, 'utf8')
    const standard = await readFile(INSTALLED_STANDARD, 'utf8')
    const copied = profile.slice(profile.indexOf(IDENTITY), profile.indexOf(PROFILE_ROWS)).trimEnd()
    expect(copied).toBe(standard.slice(standard.indexOf(IDENTITY)).trimEnd())
  })

  it('adds the VPS skill library and vps_status, each gated on the selected profile', async () => {
    const rows = (await readFile(DESKTOP_PROFILE, 'utf8')).split(PROFILE_ROWS)[1] ?? ''
    for (const plugin of ['dsh-skill-library', 'dsh-vps-status']) {
      expect(rows).toContain(`name: ${plugin}`)
      expect(rows).toContain(`split(',').includes('${plugin}')`)
    }
  })
})

describe('the desktop team agent presets', () => {
  const CLI_PRESETS = join(__dirname, '..', '..', 'apps', 'cli', 'config', 'agent-presets')
  const DESKTOP_PRESETS = join(__dirname, '..', 'build', 'agent-presets')

  it.each(['team', 'team-backend', 'team-frontend', 'team-tester'])(
    'keeps %s equal to the CLI copy except the packaged persona key and the guard roles',
    async (preset) => {
      const cli = await readFile(join(CLI_PRESETS, preset, 'agent.cordis.yml'), 'utf8')
      const desktop = await readFile(join(DESKTOP_PRESETS, preset, 'agent.cordis.yml'), 'utf8')
      const normalized = desktop
        .replace(/^# The desktop's `team` agent preset[\s\S]*?#\n(?=# The `team` agent preset:)/, '')
        .replace('    text: >-', '    prefix: >-')
        .replace(/^ {8}guardRole: \w+\n/gm, '')
      expect(normalized).toBe(cli)
      expect(await readFile(join(DESKTOP_PRESETS, preset, 'preset.yml'), 'utf8'))
        .toBe(await readFile(join(CLI_PRESETS, preset, 'preset.yml'), 'utf8'))
    },
  )

  it('is the roster default the desktop patch composes', async () => {
    const patch = await readFile(join(__dirname, '..', 'build', 'dsh-desktop.patch.yml'), 'utf8')
    expect(patch).toMatch(/- id: agent-presets\n {2}config:\n {4}default: team\n {4}roots: .*DSH_DESKTOP_PRESET_ROOT/)
  })

  it.each([
    ['delegate_backend', 'backend'],
    ['delegate_frontend', 'frontend'],
    ['delegate_tester', 'qa'],
  ])('binds %s to the %s guard role', async (toolName, role) => {
    const team = await readFile(join(DESKTOP_PRESETS, 'team', 'agent.cordis.yml'), 'utf8')
    const row = team.slice(team.indexOf(`toolName: ${toolName}`)).split('\n    - id:')[0]
    expect(row).toContain(`guardRole: ${role}\n`)
  })
})
