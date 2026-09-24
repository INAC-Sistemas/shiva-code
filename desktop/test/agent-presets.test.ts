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

  it('is the roster default the desktop patch composes', async () => {
    const patch = await readFile(join(__dirname, '..', 'build', 'dsh-desktop.patch.yml'), 'utf8')
    expect(patch).toMatch(/- id: agent-presets\n {2}config:\n {4}default: profile\n {4}roots: .*DSH_DESKTOP_PRESET_ROOT/)
  })
})
