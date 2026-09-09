import { describe, expect, it } from 'vitest'
import {
  hostPlaneDiffers, knownPlugins, narrowCatalogPlugins, PLUGIN_ROWS,
} from '../src/wire.ts'

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

describe('narrowCatalogPlugins', () => {
  it('drops rows this build cannot compose', () => {
    // The catalog is the server's, and it may describe a plugin a client
    // release retired. Offering that row would let someone tick a box that
    // selects nothing.
    expect(narrowCatalogPlugins([
      { id: 'dsh-mds', label: 'MDS', hint: '', plane: 'agent' },
      { id: 'dsh-not-shipped', label: 'Ghost', hint: '', plane: 'agent' },
    ])).toEqual([{ id: 'dsh-mds', label: 'MDS', hint: '', plane: 'host' }])
  })

  it('takes the plane from this build, not from the answer', () => {
    // The plane decides whether the picker warns about a restart. A server that
    // could call a host-plane row `agent` would suppress that warning, and the
    // person would be left wondering why the plugin never appeared.
    const [row] = narrowCatalogPlugins([
      { id: 'dsh-prototype', label: 'Protótipo', hint: 'aba', plane: 'agent' },
    ])

    expect(row?.plane).toBe('host')
    expect(PLUGIN_ROWS['dsh-prototype']).toBe('host')
  })

  it('keeps the label and the hint the server sent', () => {
    // Display text is the server's to own: the panel and the picker describe
    // the same row, and a second copy in this bundle would drift from it.
    expect(narrowCatalogPlugins([
      { id: 'dsh-vps-status', label: 'Status da VPS', hint: 'lê disco', plane: 'host' },
    ])).toEqual([
      { id: 'dsh-vps-status', label: 'Status da VPS', hint: 'lê disco', plane: 'agent' },
    ])
  })
})
