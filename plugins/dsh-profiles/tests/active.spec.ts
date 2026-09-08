import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVE_PROFILE_FILE, readActiveProfile, writeActiveProfile } from '../src/active.ts'

async function home(contents?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-profiles-'))
  if (contents !== undefined) {
    await mkdir(join(dir, 'profile'), { recursive: true })
    await writeFile(join(dir, ACTIVE_PROFILE_FILE), contents, 'utf8')
  }
  return dir
}

describe('the materialized selection', () => {
  it('round-trips a selection', async () => {
    const dir = await home()
    const active = { id: 'p1', name: 'Web', plugins: ['dsh-mds'], revision: 3 }

    await writeActiveProfile(dir, active)

    expect(await readActiveProfile(dir)).toEqual(active)
  })

  it('reports no selection when the file is absent', async () => {
    expect(await readActiveProfile(await home())).toBeNull()
  })

  it('reports no selection rather than throwing on an unreadable file', async () => {
    // The desktop shell reads the same file at spawn with the same rule.
    // Refusing to start over a truncated file would be worse than starting with
    // everything enabled, which is where the user was before choosing.
    for (const contents of ['{ not json', 'null', '"a string"', '{"id":1}']) {
      expect(await readActiveProfile(await home(contents)), contents).toBeNull()
    }
  })

  it('narrows a recorded plugin list this build no longer knows', async () => {
    const dir = await home(JSON.stringify({
      id: 'p1',
      name: 'Web',
      plugins: ['dsh-mds', 'dsh-retired-in-a-later-release'],
      revision: 1,
    }))

    expect((await readActiveProfile(dir))?.plugins).toEqual(['dsh-mds'])
  })

  it('leaves no partial file behind for the shell to read at spawn', async () => {
    // The write is staged and renamed: a partial write would look like a
    // profile with no plugins, which is a real and very different choice.
    const dir = await home()
    await writeActiveProfile(dir, { id: 'p1', name: 'Web', plugins: [], revision: 1 })

    const raw = await readFile(join(dir, ACTIVE_PROFILE_FILE), 'utf8')
    expect(JSON.parse(raw)).toMatchObject({ id: 'p1' })
  })
})
