import { describe, expect, it } from 'vitest'
import { hostPlaneDiffers, knownPlugins, PLUGIN_ROWS } from '../src/wire.ts'

describe('knownPlugins', () => {
  it('drops names this build cannot compose', () => {
    // The server is allowed to know about plugins a client release retired, and
    // a name that reached no row would otherwise be counted as a plugin the
    // user selected and silently never appear.
    expect(knownPlugins(['dsh-mds', 'dsh-not-shipped'])).toEqual(['dsh-mds'])
  })

  it('sorts and de-duplicates so the environment value is stable', () => {
    // The list becomes $DSH_PROFILE_PLUGINS, which is compared against the
    // previous selection to decide whether to ask for a restart. Unstable
    // ordering would make an unchanged profile look changed.
    expect(knownPlugins(['dsh-vps-status', 'dsh-mds', 'dsh-mds']))
      .toEqual(['dsh-mds', 'dsh-vps-status'])
  })
})

describe('hostPlaneDiffers', () => {
  it('ignores agent-plane changes', () => {
    // An agent-plane row enters and leaves with the preset the next session
    // mounts, so nothing about the running process has to change.
    expect(hostPlaneDiffers(['dsh-skill-library'], ['dsh-vps-status'])).toBe(false)
  })

  it('reports a host-plane row being added or removed', () => {
    expect(hostPlaneDiffers([], ['dsh-mds'])).toBe(true)
    expect(hostPlaneDiffers(['dsh-mds'], [])).toBe(true)
    expect(hostPlaneDiffers(['dsh-mds'], ['dsh-prototype'])).toBe(true)
  })

  it('reports no change when the host rows match', () => {
    expect(hostPlaneDiffers(['dsh-mds', 'dsh-skill-library'], ['dsh-mds'])).toBe(false)
  })

  it('treats the first selection as needing no restart', () => {
    // Before any selection the process already booted with everything enabled,
    // so the first choice can only be narrower — and interrupting someone who
    // has just signed in for the first time is the worst possible moment.
    expect(hostPlaneDiffers(undefined, [])).toBe(false)
  })

  it('classifies every known plugin', () => {
    for (const [id, plane] of Object.entries(PLUGIN_ROWS)) {
      expect(plane, id).toMatch(/^(agent|host)$/)
    }
  })
})
