import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  disableGeneration,
  ensureRegistryDirectories,
  readDesired,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'
import { projectGenerations } from '../packages/dsh-desktop-market-installer/generations/projection'
import {
  cleanupVerifiedRemovalBackup,
  confirmPluginRemovalsBooted,
  enforcePendingPluginRemovals,
  listPendingPluginRemovals,
  listVerifiedRemovalBackups,
  removePluginSafely,
  shouldDeferProfileMaintenance,
  snapshotPluginRemovalLedger
} from '../src/main/state/plugin-removal'

describe('durable plugin removal', () => {
  const homes: string[] = []

  async function profile(pluginName = '@example/plugin-a'): Promise<{
    dshHome: string
    profileDirectory: string
  }> {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-plugin-removal-'))
    homes.push(dshHome)
    const profileDirectory = join(dshHome, 'profiles', 'web')
    const packageDirectory = join(profileDirectory, 'node_modules', pluginName)
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({
        dependencies: { [pluginName]: '1.0.0', '@example/plugin-b': '1.0.0' },
        dsh: { profile: { bundles: [pluginName, '@example/plugin-b'] } }
      })
    )
    await writeFile(join(profileDirectory, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await writeFile(join(profileDirectory, 'cordis.patch.yml'), '[]\n')
    return { dshHome, profileDirectory }
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('backs up and quarantines one exact legacy plugin without invoking pnpm', async () => {
    const { dshHome, profileDirectory } = await profile()
    const uninstallGeneration = vi.fn(async () => false)

    const result = await removePluginSafely({
      dshHome,
      pluginName: '@example/plugin-a',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration,
      now: () => new Date('2026-08-29T12:00:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(uninstallGeneration).not.toHaveBeenCalled()
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).toEqual({ '@example/plugin-b': '1.0.0' })
    expect(manifest.dsh.profile.bundles).toEqual(['@example/plugin-b'])
    expect(existsSync(join(profileDirectory, 'node_modules', '@example', 'plugin-a'))).toBe(false)
    expect(existsSync(join(profileDirectory, 'pnpm-lock.yaml'))).toBe(false)
    expect(existsSync(join(result.backupDirectory as string, 'package.json'))).toBe(true)
    expect(existsSync(join(
      result.backupDirectory as string,
      'profile-packages',
      'node_modules',
      'example__plugin-a',
      'package.json'
    ))).toBe(true)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)
    await confirmPluginRemovalsBooted(dshHome)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(false)
    // The verified backup is never auto-deleted; the user must confirm.
    expect(existsSync(result.backupDirectory as string)).toBe(true)
    const pending = await snapshotPluginRemovalLedger(dshHome)
    expect(pending.pendingDeletion).toHaveLength(1)
    const firstPending = pending.pendingDeletion[0]
    expect(firstPending).toBeDefined()
    expect(firstPending?.pluginName).toBe('@example/plugin-a')
    expect(firstPending?.bootVerifiedAt).toBeDefined()
    // A second confirmPluginRemovalsBooted still leaves the backup in place.
    await confirmPluginRemovalsBooted(dshHome)
    expect(existsSync(result.backupDirectory as string)).toBe(true)
    // The user can opt in to cleanup; that is the only path that removes it.
    const cleanup = await cleanupVerifiedRemovalBackup(dshHome, '@example/plugin-a')
    expect(cleanup).toEqual({ ok: true })
    expect(existsSync(result.backupDirectory as string)).toBe(false)
    const verified = await listVerifiedRemovalBackups(dshHome)
    expect(verified).toEqual([])
  })

  it('keeps a failed cleanup disabled and preserves its package for a later retry', async () => {
    const { dshHome, profileDirectory } = await profile('plugin-one')

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: false, failures: ['service is still running'] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:05:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: false, pending: true })
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies['plugin-one']).toBe('1.0.0')
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-one')
    expect(existsSync(join(profileDirectory, 'node_modules', 'plugin-one'))).toBe(true)
    expect(existsSync(join(result.backupDirectory as string, 'package.json'))).toBe(true)
    expect(await listPendingPluginRemovals(dshHome)).toEqual(['plugin-one'])
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)
    await confirmPluginRemovalsBooted(dshHome)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)

    const retried = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:06:00.000Z')
    })
    expect(retried).toMatchObject({ disabled: true, removed: true, pending: false })
    const originalBackup = JSON.parse(
      await readFile(join(result.backupDirectory as string, 'package.json'), 'utf8')
    )
    expect(originalBackup.dsh.profile.bundles).toContain('plugin-one')
    expect(await listPendingPluginRemovals(dshHome)).toEqual([])
  })

  it('uses the durable tombstone to remove a failed generation pointer before launch', async () => {
    const { dshHome, profileDirectory } = await profile('generation-plugin')
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = 'generation-plugin+1.0.0+fixture'
    const generationDirectory = join(layout.generations, generationId)
    await mkdir(generationDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, {
      pluginName: 'generation-plugin',
      version: '1.0.0'
    })
    await writeDesired(dshHome, [generationId])

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'generation-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:10:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: false, pending: true })
    expect(await readDesired(dshHome)).toEqual([generationId])
    await enforcePendingPluginRemovals(dshHome)
    expect(await readDesired(dshHome)).toEqual([])
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).not.toContain('generation-plugin')
  })

  it('commits a generation removal only after its desired pointer and projection are detached', async () => {
    const { dshHome } = await profile('generation-plugin')
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = 'generation-plugin+1.0.0+complete'
    const generationDirectory = join(layout.generations, generationId)
    await mkdir(generationDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, {
      pluginName: 'generation-plugin',
      version: '1.0.0'
    })
    await writeDesired(dshHome, [generationId])

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'generation-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => {
        await disableGeneration(dshHome, 'generation-plugin')
        await projectGenerations(dshHome)
        return true
      },
      now: () => new Date('2026-08-29T12:15:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(await readDesired(dshHome)).toEqual([])
    expect(await listPendingPluginRemovals(dshHome)).toEqual([])
  })

  it('does not auto-delete any removal backup across repeated clean launches, even with several entries pending', async () => {
    // Reproduces the issue #250 chain: the launcher used to delete a
    // verified backup automatically on the *second* clean launch. With
    // several pending removals and many launches, the recovery surface
    // disappeared before the user could see it. The new behaviour keeps
    // every backup until the user explicitly asks for it to go.
    const { dshHome, profileDirectory } = await profile('plugin-a')
    // Add a second plugin to the same profile so we can verify one
    // removal's cleanup does not affect the other.
    const secondDir = join(profileDirectory, 'node_modules', 'plugin-b')
    await mkdir(secondDir, { recursive: true })
    await writeFile(
      join(secondDir, 'package.json'),
      JSON.stringify({ name: 'plugin-b', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(secondDir, 'cordis.patch.yml'), '[]\n')
    const sharedManifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    sharedManifest.dependencies['plugin-b'] = '1.0.0'
    sharedManifest.dsh.profile.bundles = [...sharedManifest.dsh.profile.bundles, 'plugin-b']
    await writeFile(join(profileDirectory, 'package.json'), JSON.stringify(sharedManifest, undefined, 2))

    const removedA = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-a',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:30:00.000Z')
    })
    const removedB = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-b',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:30:30.000Z')
    })

    expect(removedA).toMatchObject({ removed: true })
    expect(removedB).toMatchObject({ removed: true })
    expect(removedA.backupDirectory).toBeDefined()
    expect(removedB.backupDirectory).toBeDefined()

    // Five boot-verified launches. Every one of them must leave every
    // backup in place.
    for (let index = 0; index < 5; index += 1) {
      await confirmPluginRemovalsBooted(dshHome)
      expect(existsSync(removedA.backupDirectory as string)).toBe(true)
      expect(existsSync(removedB.backupDirectory as string)).toBe(true)
    }

    const pending = await snapshotPluginRemovalLedger(dshHome)
    const pluginNames = pending.pendingDeletion.map((entry) => entry.pluginName).sort()
    expect(pluginNames).toEqual(['plugin-a', 'plugin-b'])

    // Cleanup is per-plugin and per-call: cleaning one entry must not
    // touch the other.
    const cleanupA = await cleanupVerifiedRemovalBackup(dshHome, 'plugin-a')
    expect(cleanupA).toEqual({ ok: true })
    expect(existsSync(removedA.backupDirectory as string)).toBe(false)
    expect(existsSync(removedB.backupDirectory as string)).toBe(true)

    // A second cleanup call for the same plugin reports success and is
    // a no-op.
    const cleanupAgain = await cleanupVerifiedRemovalBackup(dshHome, 'plugin-a')
    expect(cleanupAgain).toEqual({ ok: true })
    expect(existsSync(removedB.backupDirectory as string)).toBe(true)

    // Refusing to clean up a plugin that has not been boot-verified is
    // rejected with a reason, not silently destructive.
    const notVerified = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-c',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:31:00.000Z')
    })
    expect(notVerified).toMatchObject({ removed: true })
    const earlyCleanup = await cleanupVerifiedRemovalBackup(dshHome, 'plugin-c')
    expect(earlyCleanup.ok).toBe(false)
    expect(earlyCleanup.reason).toMatch(/not been boot-verified/i)
  })
})
