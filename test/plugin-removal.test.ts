import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fsFaults = vi.hoisted(() => ({
  renameMatches: undefined as undefined | ((from: string, to: string) => boolean),
  rmMatches: undefined as undefined | ((path: string) => boolean),
  ledgerRenameCount: 0,
  failLedgerRenameAt: undefined as number | undefined
}))

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {
    ...actual,
    rename: async (from: string, to: string) => {
      if (to.endsWith('plugin-removals.json')) {
        fsFaults.ledgerRenameCount += 1
        if (fsFaults.ledgerRenameCount === fsFaults.failLedgerRenameAt) {
          throw Object.assign(new Error('fixture ledger rename EPERM'), { code: 'EPERM' })
        }
      }
      if (fsFaults.renameMatches?.(from, to)) {
        throw Object.assign(new Error('fixture rename EPERM'), { code: 'EPERM' })
      }
      return actual.rename(from, to)
    },
    rm: async (path: string, options?: Parameters<typeof actual.rm>[1]) => {
      if (fsFaults.rmMatches?.(path)) {
        throw Object.assign(new Error('fixture rm EBUSY'), { code: 'EBUSY' })
      }
      return actual.rm(path, options)
    }
  }
})
import {
  disableGeneration,
  ensureRegistryDirectories,
  readDesired,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'
import { projectGenerations } from '../packages/dsh-desktop-market-installer/generations/projection'
import { prepareGenerationsForLaunch } from '../src/main/state/generation-launch'
import type { PluginComponentRestoreOptions } from '../src/main/state/plugin-component-cleanup'
import {
  cleanupVerifiedRemovalBackup,
  confirmPluginRemovalsBooted,
  enforcePendingPluginRemovals,
  listPendingPluginRemovals,
  listVerifiedRemovalBackups,
  removePluginSafely,
  restorePluginRemovalBackup,
  shouldDeferProfileMaintenance,
  snapshotPluginRemovalLedger
} from '../src/main/state/plugin-removal'

describe('durable plugin removal', () => {
  const homes: string[] = []

  function launchAgentPlist(label: string, programArgument: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>/usr/bin/node</string><string>${programArgument}</string></array>
</dict></plist>
`
  }

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

  async function removedGeneration(pluginName: string, suffix: string): Promise<{
    dshHome: string
    profileDirectory: string
    generationId: string
    generationDirectory: string
    removalId: string
    backupDirectory: string
  }> {
    const { dshHome, profileDirectory } = await profile(pluginName)
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = `${pluginName.replaceAll('/', '+')}+1.0.0+${suffix}`
    const generationDirectory = join(layout.generations, generationId)
    const packageDirectory = join(generationDirectory, 'node_modules', pluginName)
    await mkdir(packageDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, { pluginName, version: '1.0.0' })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(packageDirectory, 'payload.js'), 'export const intact = true\n')
    await writeDesired(dshHome, [generationId])
    await projectGenerations(dshHome)
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => {
        await disableGeneration(dshHome, pluginName)
        await projectGenerations(dshHome)
        return true
      },
      now: () => new Date('2026-08-29T15:00:00.000Z')
    })
    expect(removed).toMatchObject({ removed: true })
    return {
      dshHome,
      profileDirectory,
      generationId,
      generationDirectory,
      removalId: removed.removalId as string,
      backupDirectory: removed.backupDirectory as string
    }
  }

  async function legacyRemovalWithComponent(pluginName: string, label: string): Promise<{
    dshHome: string
    profileDirectory: string
    backupDirectory: string
    legacyPath: string
    fileName: string
    removalId: string
  }> {
    const { dshHome, profileDirectory } = await profile(pluginName)
    await rm(join(profileDirectory, 'node_modules', pluginName), { recursive: true, force: true })
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T15-00-00-000Z',
      pluginName
    )
    const sourcePackage = join(backupDirectory, 'profile-packages', 'node_modules', pluginName)
    await mkdir(sourcePackage, { recursive: true })
    await writeFile(join(sourcePackage, 'package.json'), JSON.stringify({
      name: pluginName,
      version: '1.0.0',
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(sourcePackage, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(backupDirectory, 'package.json'), JSON.stringify({
      dependencies: { [pluginName]: '1.0.0' },
      dsh: { profile: { bundles: [pluginName] } }
    }))
    await writeFile(join(backupDirectory, 'cordis.patch.yml'), '[]\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        [pluginName]: {
          pluginName,
          status: 'removed',
          disabledAt: '2026-08-29T15:00:00.000Z',
          updatedAt: '2026-08-29T15:30:00.000Z',
          backupDirectory,
          failures: []
        }
      }
    }))
    const fileName = `${label}.plist`
    const legacyDirectory = join(
      dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T15-21-00-000Z'
    )
    const legacyPath = join(legacyDirectory, fileName)
    await mkdir(legacyDirectory, { recursive: true })
    await writeFile(legacyPath, launchAgentPlist(label, `/old/node_modules/${pluginName}/agent.mjs`))
    const removalId = (await snapshotPluginRemovalLedger(dshHome)).backups[0]!.removalId
    return { dshHome, profileDirectory, backupDirectory, legacyPath, fileName, removalId }
  }

  afterEach(async () => {
    fsFaults.renameMatches = undefined
    fsFaults.rmMatches = undefined
    fsFaults.ledgerRenameCount = 0
    fsFaults.failLedgerRenameAt = undefined
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
    const cleanup = await cleanupVerifiedRemovalBackup(dshHome, result.removalId as string)
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
    await mkdir(join(generationDirectory, 'node_modules', 'generation-plugin'), { recursive: true })
    await writeFile(
      join(generationDirectory, 'node_modules', 'generation-plugin', 'package.json'),
      JSON.stringify({ name: 'generation-plugin', version: '1.0.0' })
    )
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
    await mkdir(join(generationDirectory, 'node_modules', 'generation-plugin'), { recursive: true })
    await writeFile(
      join(generationDirectory, 'node_modules', 'generation-plugin', 'package.json'),
      JSON.stringify({ name: 'generation-plugin', version: '1.0.0' })
    )
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
    const backedUpPackage = join(
      result.backupDirectory as string,
      'generations',
      generationId,
      'node_modules',
      'generation-plugin',
      'package.json'
    )
    expect(existsSync(backedUpPackage)).toBe(true)
    for (let launch = 0; launch < 3; launch += 1) {
      await prepareGenerationsForLaunch(dshHome, () => undefined)
      expect(existsSync(backedUpPackage)).toBe(true)
    }
    expect(existsSync(generationDirectory)).toBe(false)

    const restored = await restorePluginRemovalBackup(dshHome, result.removalId as string)
    expect(restored).toEqual({ ok: true })
    expect(await readDesired(dshHome)).toContain(generationId)
    expect(existsSync(generationDirectory)).toBe(true)
    expect(existsSync(backedUpPackage)).toBe(true)
    const restoredManifest = JSON.parse(
      await readFile(join(dshHome, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(restoredManifest.dsh.profile.bundles).toContain('generation-plugin')
    expect(
      await cleanupVerifiedRemovalBackup(dshHome, result.removalId as string)
    ).toMatchObject({ ok: false })
  })

  it('treats an unreferenced generation left by migration rollback as inert legacy recovery material', async () => {
    const pluginName = 'rollback-legacy-plugin'
    const { dshHome, profileDirectory } = await profile(pluginName)
    const layout = await ensureRegistryDirectories(dshHome)
    const orphanId = 'rollback-legacy-plugin+1.0.0+orphan'
    const orphanDirectory = join(layout.generations, orphanId)
    const orphanPackage = join(orphanDirectory, 'node_modules', pluginName)
    await mkdir(orphanPackage, { recursive: true })
    await writeGenerationMeta(orphanDirectory, { pluginName, version: '1.0.0' })
    await writeFile(
      join(orphanPackage, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0' })
    )
    expect(await readDesired(dshHome)).toEqual([])

    const uninstallGeneration = vi.fn(async () => false)
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration,
      now: () => new Date('2026-08-29T12:20:00.000Z')
    })

    expect(removed).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(uninstallGeneration).not.toHaveBeenCalled()
    expect(existsSync(join(profileDirectory, 'node_modules', pluginName))).toBe(false)
    expect(existsSync(join(
      removed.backupDirectory as string,
      'profile-packages',
      'node_modules',
      pluginName,
      'package.json'
    ))).toBe(true)
    const backup = (await snapshotPluginRemovalLedger(dshHome)).backups[0]
    expect(backup).toMatchObject({ canRestore: true, generationIds: [orphanId] })

    expect(await restorePluginRemovalBackup(dshHome, removed.removalId as string))
      .toEqual({ ok: true })
    expect(existsSync(join(profileDirectory, 'node_modules', pluginName, 'package.json'))).toBe(true)
    expect(await readDesired(dshHome)).toEqual([])
    const restoredManifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(restoredManifest.dsh.profile.bundles).toContain(pluginName)
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
    const cleanupA = await cleanupVerifiedRemovalBackup(dshHome, removedA.removalId as string)
    expect(cleanupA).toEqual({ ok: true })
    expect(existsSync(removedA.backupDirectory as string)).toBe(false)
    expect(existsSync(removedB.backupDirectory as string)).toBe(true)

    // A second cleanup call for the same plugin reports success and is
    // a no-op.
    const cleanupAgain = await cleanupVerifiedRemovalBackup(dshHome, removedA.removalId as string)
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
    const earlyCleanup = await cleanupVerifiedRemovalBackup(dshHome, notVerified.removalId as string)
    expect(earlyCleanup.ok).toBe(false)
    expect(earlyCleanup.reason).toMatch(/not been boot-verified/i)
  })

  it('keeps separately addressable history when the same plugin is installed and removed again', async () => {
    const { dshHome, profileDirectory } = await profile('repeat-plugin')
    const remove = (at: string) => removePluginSafely({
      dshHome,
      pluginName: 'repeat-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date(at)
    })

    const first = await remove('2026-08-29T13:00:00.000Z')
    expect(first).toMatchObject({ removed: true })

    const packageDirectory = join(profileDirectory, 'node_modules', 'repeat-plugin')
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: 'repeat-plugin', version: '2.0.0' })
    )
    const manifestPath = join(profileDirectory, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.dependencies['repeat-plugin'] = '2.0.0'
    manifest.dsh.profile.bundles.push('repeat-plugin')
    await writeFile(manifestPath, JSON.stringify(manifest, undefined, 2))
    await writeFile(join(profileDirectory, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')

    const second = await remove('2026-08-29T14:00:00.000Z')
    expect(second).toMatchObject({ removed: true })
    expect(second.removalId).not.toBe(first.removalId)
    expect(second.backupDirectory).not.toBe(first.backupDirectory)

    await confirmPluginRemovalsBooted(dshHome)
    const history = (await snapshotPluginRemovalLedger(dshHome)).backups
      .filter((entry) => entry.pluginName === 'repeat-plugin')
    expect(history).toHaveLength(2)
    expect(new Set(history.map((entry) => entry.removalId)).size).toBe(2)
    expect(history.every((entry) => existsSync(entry.backupDirectory))).toBe(true)

    expect(await cleanupVerifiedRemovalBackup(dshHome, first.removalId as string)).toEqual({ ok: true })
    expect(existsSync(first.backupDirectory as string)).toBe(false)
    expect(existsSync(second.backupDirectory as string)).toBe(true)
  })

  it('preserves and surfaces protocol-1 backups created by version 0.7.1', async () => {
    const { dshHome } = await profile('legacy-ledger-plugin')
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T10-00-00-000Z',
      'legacy-ledger-plugin'
    )
    await mkdir(backupDirectory, { recursive: true })
    await writeFile(join(backupDirectory, 'package.json'), '{}\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(
      join(dshHome, 'recovery', 'plugin-removals.json'),
      JSON.stringify({
        protocol: 1,
        removals: {
          'legacy-ledger-plugin': {
            pluginName: 'legacy-ledger-plugin',
            status: 'removed',
            disabledAt: '2026-08-29T10:00:00.000Z',
            updatedAt: '2026-08-29T10:00:00.000Z',
            backupDirectory,
            failures: []
          }
        }
      })
    )

    const beforeBoot = await snapshotPluginRemovalLedger(dshHome)
    expect(beforeBoot.backups).toHaveLength(1)
    expect(beforeBoot.backups[0]?.removalId).toMatch(/^legacy-/u)
    expect(beforeBoot.backups[0]?.backupDirectory).toBe(backupDirectory)

    await confirmPluginRemovalsBooted(dshHome)
    const verified = await listVerifiedRemovalBackups(dshHome)
    expect(verified).toHaveLength(1)
    expect(existsSync(backupDirectory)).toBe(true)
  })

  it('rejects dot-segment generation ids from the recovery ledger', async () => {
    const { dshHome } = await profile('unsafe-generation-id')
    const removalId = '2026-08-29T10-00-00-000Z-00000000-0000-4000-8000-000000000020'
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      removalId,
      'unsafe-generation-id'
    )
    await mkdir(backupDirectory, { recursive: true })
    await writeFile(join(backupDirectory, 'package.json'), '{}\n')
    await writeFile(join(dshHome, 'sentinel.txt'), 'keep\n')
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 2,
      removals: {
        [removalId]: {
          removalId,
          pluginName: 'unsafe-generation-id',
          status: 'removed',
          disabledAt: '2026-08-29T10:00:00.000Z',
          updatedAt: '2026-08-29T10:00:00.000Z',
          backupDirectory,
          failures: [],
          generationBackups: [{ id: '..', version: '1.0.0', wasDesired: true }],
          componentBackups: []
        }
      }
    }))

    await expect(snapshotPluginRemovalLedger(dshHome)).rejects.toThrow(/malformed/u)
    expect(await readFile(join(dshHome, 'sentinel.txt'), 'utf8')).toBe('keep\n')
  })

  it('fully validates protocol-1 plugin names before resolving restore paths', async () => {
    const { dshHome } = await profile('legacy-path-owner')
    const recovery = join(dshHome, 'recovery')
    await mkdir(recovery, { recursive: true })
    await writeFile(join(dshHome, 'sentinel.txt'), 'keep\n')
    await writeFile(join(recovery, 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        malicious: {
          pluginName: '../../outside',
          status: 'removed',
          disabledAt: '2026-08-29T10:00:00.000Z',
          updatedAt: '2026-08-29T10:00:00.000Z',
          backupDirectory: join(recovery, 'plugin-removals', '2026-08-29T10-00-00-000Z', 'outside'),
          failures: []
        }
      }
    }))

    await expect(snapshotPluginRemovalLedger(dshHome)).rejects.toThrow(/malformed/u)
    expect(await readFile(join(dshHome, 'sentinel.txt'), 'utf8')).toBe('keep\n')
  })

  it('binds a protocol-1 backup path to its exact disabled timestamp', async () => {
    const { dshHome } = await profile('legacy-sibling-path')
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T11-00-00-000Z',
      'legacy-sibling-path'
    )
    await mkdir(backupDirectory, { recursive: true })
    await writeFile(join(backupDirectory, 'package.json'), '{}\n')
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        'legacy-sibling-path': {
          pluginName: 'legacy-sibling-path',
          status: 'removed',
          disabledAt: '2026-08-29T10:00:00.000Z',
          updatedAt: '2026-08-29T10:00:00.000Z',
          backupDirectory,
          failures: []
        }
      }
    }))

    await expect(snapshotPluginRemovalLedger(dshHome)).rejects.toThrow(/does not match/u)
  })

  it('rejects protocol-1 package names that flatten to the same backup directory', async () => {
    const { dshHome } = await profile('legacy-collision-owner')
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T10-00-00-000Z',
      'a__b'
    )
    await mkdir(backupDirectory, { recursive: true })
    await writeFile(join(backupDirectory, 'package.json'), '{}\n')
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        '@a/b': {
          pluginName: '@a/b', status: 'removed', disabledAt: '2026-08-29T10:00:00.000Z',
          updatedAt: '2026-08-29T10:00:00.000Z', backupDirectory, failures: []
        },
        a__b: {
          pluginName: 'a__b', status: 'removed', disabledAt: '2026-08-29T10:00:00.000Z',
          updatedAt: '2026-08-29T10:00:00.000Z', backupDirectory, failures: []
        }
      }
    }))

    await expect(snapshotPluginRemovalLedger(dshHome)).rejects.toThrow(/same backup directory/u)
  })

  it('fails closed on a corrupt ledger instead of replacing its backup index', async () => {
    const { dshHome, profileDirectory } = await profile('ledger-plugin')
    const recovery = join(dshHome, 'recovery')
    const ledger = join(recovery, 'plugin-removals.json')
    const preservedBackup = join(recovery, 'plugin-removals', 'preserved', 'ledger-plugin')
    await mkdir(preservedBackup, { recursive: true })
    await writeFile(join(preservedBackup, 'package.json'), '{}\n')
    await writeFile(ledger, '{not-json\n')

    await expect(snapshotPluginRemovalLedger(dshHome)).rejects.toThrow(/invalid JSON/u)
    const result = await removePluginSafely({
      dshHome,
      pluginName: 'ledger-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false
    })
    expect(result).toMatchObject({ disabled: false, removed: false, pending: true })
    expect(result.failures[0]).toMatch(/invalid JSON/u)
    expect(await readFile(ledger, 'utf8')).toBe('{not-json\n')
    expect(existsSync(preservedBackup)).toBe(true)
    expect(existsSync(join(profileDirectory, 'node_modules', 'ledger-plugin'))).toBe(true)
  })

  it('rejects a pending removal whose ledger points its backup outside recovery', async () => {
    const pluginName = 'pending-path-plugin'
    const { dshHome, profileDirectory } = await profile(pluginName)
    const removalId = '2026-08-29T10-00-00-000Z-00000000-0000-4000-8000-000000000010'
    const external = await mkdtemp(join(tmpdir(), 'dsh-pending-removal-external-'))
    homes.push(external)
    await writeFile(join(external, 'sentinel.txt'), 'keep\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(
      join(dshHome, 'recovery', 'plugin-removals.json'),
      JSON.stringify({
        protocol: 2,
        removals: {
          [removalId]: {
            removalId,
            pluginName,
            status: 'backup-pending',
            disabledAt: '2026-08-29T10:00:00.000Z',
            updatedAt: '2026-08-29T10:00:00.000Z',
            backupDirectory: external,
            failures: [],
            generationBackups: [],
            componentBackups: []
          }
        }
      })
    )

    const result = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false
    })
    expect(result).toMatchObject({ disabled: false, removed: false, pending: true })
    expect(result.failures[0]).toMatch(/outside the recovery root/u)
    expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('keep\n')
    expect(existsSync(join(external, 'package.json'))).toBe(false)
    expect(existsSync(join(profileDirectory, 'node_modules', pluginName))).toBe(true)
  })

  it('refuses a new removal before writing through a recovery-root junction', async () => {
    const pluginName = 'new-root-link-plugin'
    const { dshHome, profileDirectory } = await profile(pluginName)
    const external = await mkdtemp(join(tmpdir(), 'dsh-new-removal-root-external-'))
    homes.push(external)
    await writeFile(join(external, 'sentinel.txt'), 'keep\n')
    const recovery = join(dshHome, 'recovery')
    await mkdir(recovery, { recursive: true })
    await symlink(
      external,
      join(recovery, 'plugin-removals'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )

    const result = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false
    })
    expect(result).toMatchObject({ disabled: false, removed: false, pending: true })
    expect(result.failures[0]).toMatch(/symbolic link|junction/u)
    expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('keep\n')
    expect(existsSync(join(external, 'package.json'))).toBe(false)
    expect(existsSync(join(recovery, 'plugin-removals.json'))).toBe(false)
    expect(existsSync(join(profileDirectory, 'node_modules', pluginName))).toBe(true)
  })

  it('refuses a corrupt record that points cleanup at the recovery root', async () => {
    const { dshHome } = await profile('path-plugin')
    const removalId = '2026-08-29T10-00-00-000Z-00000000-0000-4000-8000-000000000001'
    const root = join(dshHome, 'recovery', 'plugin-removals')
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'sentinel.txt'), 'keep\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(
      join(dshHome, 'recovery', 'plugin-removals.json'),
      JSON.stringify({
        protocol: 2,
        removals: {
          [removalId]: {
            removalId,
            pluginName: 'path-plugin',
            status: 'removed',
            disabledAt: '2026-08-29T10:00:00.000Z',
            updatedAt: '2026-08-29T10:00:00.000Z',
            bootVerifiedAt: '2026-08-29T10:01:00.000Z',
            backupDirectory: root,
            failures: [],
            generationBackups: []
          }
        }
      })
    )

    const result = await cleanupVerifiedRemovalBackup(dshHome, removalId)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/outside|does not match/u)
    expect(await readFile(join(root, 'sentinel.txt'), 'utf8')).toBe('keep\n')
  })

  it('does not follow a symlink or junction while deleting a backup', async () => {
    const { dshHome } = await profile('link-plugin')
    const removalId = '2026-08-29T10-00-00-000Z-00000000-0000-4000-8000-000000000002'
    const external = await mkdtemp(join(tmpdir(), 'dsh-removal-external-'))
    homes.push(external)
    await writeFile(join(external, 'sentinel.txt'), 'keep\n')
    const backup = join(
      dshHome,
      'recovery',
      'plugin-removals',
      removalId,
      'link-plugin'
    )
    await mkdir(join(dshHome, 'recovery', 'plugin-removals', removalId), { recursive: true })
    await symlink(external, backup, process.platform === 'win32' ? 'junction' : 'dir')
    await writeFile(
      join(dshHome, 'recovery', 'plugin-removals.json'),
      JSON.stringify({
        protocol: 2,
        removals: {
          [removalId]: {
            removalId,
            pluginName: 'link-plugin',
            status: 'removed',
            disabledAt: '2026-08-29T10:00:00.000Z',
            updatedAt: '2026-08-29T10:00:00.000Z',
            bootVerifiedAt: '2026-08-29T10:01:00.000Z',
            backupDirectory: backup,
            failures: [],
            generationBackups: []
          }
        }
      })
    )

    const result = await cleanupVerifiedRemovalBackup(dshHome, removalId)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/symbolic link|junction/u)
    expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('keep\n')
  })

  it('rejects a recovery-root junction instead of deleting through it', async () => {
    const { dshHome } = await profile('root-link-plugin')
    const removalId = '2026-08-29T10-00-00-000Z-00000000-0000-4000-8000-000000000003'
    const external = await mkdtemp(join(tmpdir(), 'dsh-removal-root-external-'))
    homes.push(external)
    const backup = join(external, removalId, 'root-link-plugin')
    await mkdir(backup, { recursive: true })
    await writeFile(join(backup, 'package.json'), '{}\n')
    await writeFile(join(external, 'sentinel.txt'), 'keep\n')
    const recovery = join(dshHome, 'recovery')
    await mkdir(recovery, { recursive: true })
    await symlink(
      external,
      join(recovery, 'plugin-removals'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    await writeFile(
      join(recovery, 'plugin-removals.json'),
      JSON.stringify({
        protocol: 2,
        removals: {
          [removalId]: {
            removalId,
            pluginName: 'root-link-plugin',
            status: 'removed',
            disabledAt: '2026-08-29T10:00:00.000Z',
            updatedAt: '2026-08-29T10:00:00.000Z',
            bootVerifiedAt: '2026-08-29T10:01:00.000Z',
            backupDirectory: join(recovery, 'plugin-removals', removalId, 'root-link-plugin'),
            failures: [],
            generationBackups: []
          }
        }
      })
    )

    const result = await cleanupVerifiedRemovalBackup(dshHome, removalId)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/symbolic link|junction/u)
    expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('keep\n')
  })

  it('keeps a checksummed backup when its contents are later modified', async () => {
    const removed = await removedGeneration('tamper-plugin', 'tamper')
    await writeFile(
      join(
        removed.backupDirectory,
        'generations',
        removed.generationId,
        'node_modules',
        'tamper-plugin',
        'payload.js'
      ),
      'export const intact = false\n'
    )

    const backup = (await snapshotPluginRemovalLedger(removed.dshHome)).backups[0]
    expect(backup).toMatchObject({ integrity: 'incomplete', canRestore: false })
    expect(backup?.integrityDetail).toMatch(/checksum/u)
    expect(await restorePluginRemovalBackup(removed.dshHome, removed.removalId))
      .toMatchObject({ ok: false })
    expect(existsSync(removed.backupDirectory)).toBe(true)
  })

  it('invalidates automatic restore when an owned-component backup is modified', async () => {
    const pluginName = 'component-tamper-plugin'
    const { dshHome } = await profile(pluginName)
    const fileName = 'com.example.component-tamper.plist'
    const originalPath = join(dshHome, 'fixture-home', 'Library', 'LaunchAgents', fileName)
    const backupRelativePath = `owned-components/launch-agents/${fileName}`
    const component = {
      kind: 'launch-agent' as const,
      label: 'com.example.component-tamper',
      originalPath,
      backupRelativePath
    }
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async ({ removalId, backupDirectory }) => {
        const componentDirectory = join(backupDirectory, 'owned-components', 'launch-agents')
        await mkdir(componentDirectory, { recursive: true })
        await writeFile(join(componentDirectory, fileName), '<plist>intact</plist>\n')
        await writeFile(
          join(backupDirectory, 'owned-components.json'),
          JSON.stringify({ protocol: 1, removalId, pluginName, components: [component] })
        )
        return { ok: true, failures: [], componentBackups: [component] }
      },
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T15:20:00.000Z')
    })
    expect(removed).toMatchObject({ removed: true })

    await writeFile(
      join(removed.backupDirectory as string, ...backupRelativePath.split('/')),
      '<plist>modified</plist>\n'
    )
    const backup = (await snapshotPluginRemovalLedger(dshHome)).backups[0]
    expect(backup).toMatchObject({ integrity: 'incomplete', canRestore: false })
    expect(backup?.integrityDetail).toMatch(/checksum/u)
  })

  it.runIf(process.platform === 'darwin')('claims one uniquely owned legacy LaunchAgent without consuming its old backup', async () => {
    const pluginName = 'legacy-component-plugin'
    const { dshHome, profileDirectory } = await profile(pluginName)
    await rm(join(profileDirectory, 'node_modules', pluginName), { recursive: true, force: true })
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T15-00-00-000Z',
      pluginName
    )
    const sourcePackage = join(
      backupDirectory,
      'profile-packages',
      'node_modules',
      pluginName
    )
    await mkdir(sourcePackage, { recursive: true })
    await writeFile(join(sourcePackage, 'package.json'), JSON.stringify({
      name: pluginName,
      version: '1.0.0',
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(sourcePackage, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(backupDirectory, 'package.json'), JSON.stringify({
      dependencies: { [pluginName]: '1.0.0' },
      dsh: { profile: { bundles: [pluginName] } }
    }))
    await writeFile(join(backupDirectory, 'cordis.patch.yml'), '[]\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        [pluginName]: {
          pluginName,
          status: 'removed',
          disabledAt: '2026-08-29T15:00:00.000Z',
          updatedAt: '2026-08-29T15:30:00.000Z',
          backupDirectory,
          failures: []
        }
      }
    }))
    const legacyDirectory = join(
      dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T15-21-00-000Z'
    )
    const fileName = 'com.example.legacy-component.plist'
    const legacyPath = join(legacyDirectory, fileName)
    await mkdir(legacyDirectory, { recursive: true })
    await writeFile(
      legacyPath,
      launchAgentPlist(
        'com.example.legacy-component',
        `/old/node_modules/${pluginName}/agent.mjs`
      )
    )
    const restoreOwnedComponents = vi.fn(async (_options: PluginComponentRestoreOptions) => undefined)
    const snapshot = await snapshotPluginRemovalLedger(dshHome)
    const removalId = snapshot.backups[0]!.removalId

    expect(snapshot.backups[0]).toMatchObject({ canRestore: true, integrity: 'legacy-unverified' })
    expect(await restorePluginRemovalBackup(
      dshHome,
      removalId,
      () => undefined,
      { restoreOwnedComponents }
    )).toEqual({ ok: true })

    const claimedPath = join(
      backupDirectory,
      'owned-components',
      'launch-agents',
      fileName
    )
    expect(existsSync(legacyPath)).toBe(true)
    expect(await readFile(claimedPath, 'utf8')).toBe(await readFile(legacyPath, 'utf8'))
    expect(restoreOwnedComponents.mock.calls[0]?.[0].expectedComponents).toHaveLength(1)
    expect(JSON.parse(await readFile(
      join(backupDirectory, 'owned-components.json'),
      'utf8'
    )).components).toHaveLength(1)
  })

  it.runIf(process.platform === 'darwin')('replays a legacy component claim after copy and manifest outlive its ledger update', async () => {
    const fixture = await legacyRemovalWithComponent(
      'legacy-component-crash-plugin',
      'com.example.legacy-component-crash'
    )
    const restoreOwnedComponents = vi.fn(
      async (_options: PluginComponentRestoreOptions) => undefined
    )
    fsFaults.ledgerRenameCount = 0
    fsFaults.failLedgerRenameAt = 2

    const interrupted = await restorePluginRemovalBackup(
      fixture.dshHome,
      fixture.removalId,
      () => undefined,
      { restoreOwnedComponents }
    )
    expect(interrupted).toMatchObject({ ok: false })
    expect(interrupted.reason).toMatch(/ledger rename EPERM/u)
    expect(existsSync(fixture.legacyPath)).toBe(true)
    expect(existsSync(join(fixture.backupDirectory, 'owned-components.json'))).toBe(true)
    expect(existsSync(join(
      fixture.backupDirectory,
      'owned-components',
      'launch-agents',
      fixture.fileName
    ))).toBe(true)

    fsFaults.failLedgerRenameAt = undefined
    fsFaults.ledgerRenameCount = 0
    expect((await snapshotPluginRemovalLedger(fixture.dshHome)).backups[0])
      .toMatchObject({ canRestore: true, restoreStartedAt: expect.any(String) })
    expect(await restorePluginRemovalBackup(
      fixture.dshHome,
      fixture.removalId,
      () => undefined,
      { restoreOwnedComponents }
    )).toEqual({ ok: true })
    expect(restoreOwnedComponents).toHaveBeenCalledTimes(1)
    expect(existsSync(fixture.legacyPath)).toBe(true)
  })

  it.runIf(process.platform === 'darwin')('refuses a same-owner legacy component from before the removal transaction', async () => {
    const pluginName = 'legacy-component-window-plugin'
    const fixture = await legacyRemovalWithComponent(
      pluginName,
      'com.example.legacy-component-window'
    )
    const oldDirectory = join(
      fixture.dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T14-59-59-999Z'
    )
    await mkdir(oldDirectory, { recursive: true })
    await writeFile(
      join(oldDirectory, 'com.example.legacy-component-old.plist'),
      launchAgentPlist(
        'com.example.legacy-component-old',
        `/old/node_modules/${pluginName}/agent.mjs`
      )
    )

    const backup = (await snapshotPluginRemovalLedger(fixture.dshHome)).backups[0]
    expect(backup).toMatchObject({ canRestore: false, integrity: 'incomplete' })
    expect(backup?.integrityDetail).toMatch(/outside this removal transaction window/u)
    expect(await restorePluginRemovalBackup(fixture.dshHome, fixture.removalId))
      .toMatchObject({ ok: false })
  })

  it.runIf(process.platform === 'darwin')('does not let a protocol-2 removal adopt stale global component material', async () => {
    const removed = await removedGeneration('tracked-component-plugin', 'tracked-component')
    const legacyDirectory = join(
      removed.dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T15-21-00-000Z'
    )
    await mkdir(legacyDirectory, { recursive: true })
    await writeFile(
      join(legacyDirectory, 'com.example.tracked-component.plist'),
      launchAgentPlist(
        'com.example.tracked-component',
        `/old/node_modules/tracked-component-plugin/agent.mjs`
      )
    )
    const restoreOwnedComponents = vi.fn(
      async (_options: PluginComponentRestoreOptions) => undefined
    )

    expect(await restorePluginRemovalBackup(
      removed.dshHome,
      removed.removalId,
      () => undefined,
      { restoreOwnedComponents }
    )).toEqual({ ok: true })
    expect(restoreOwnedComponents.mock.calls[0]?.[0].expectedComponents).toEqual([])
    expect(existsSync(join(removed.backupDirectory, 'owned-components.json'))).toBe(false)
  })

  it('journals a failed restore before Profile mutation and blocks normal maintenance until retry', async () => {
    const removed = await removedGeneration('resume-plugin', 'resume')
    await rm(removed.generationDirectory, { recursive: true, force: true })
    await writeFile(join(removed.profileDirectory, 'package.json'), '{broken-json\n')

    const first = await restorePluginRemovalBackup(removed.dshHome, removed.removalId)
    expect(first).toMatchObject({ ok: false })
    await expect(shouldDeferProfileMaintenance(removed.dshHome)).rejects.toThrow(/restore .* incomplete/u)
    await confirmPluginRemovalsBooted(removed.dshHome)
    expect(
      (await snapshotPluginRemovalLedger(removed.dshHome)).backups[0]?.bootVerifiedAt
    ).toBeUndefined()
    expect(await cleanupVerifiedRemovalBackup(removed.dshHome, removed.removalId))
      .toMatchObject({ ok: false })

    await writeFile(
      join(removed.profileDirectory, 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    expect(await restorePluginRemovalBackup(removed.dshHome, removed.removalId)).toEqual({ ok: true })
    expect(await readDesired(removed.dshHome)).toContain(removed.generationId)
  })

  it('keeps the restore journal when owned-component recovery fails and retries the same backup', async () => {
    const pluginName = 'component-retry-plugin'
    const { dshHome } = await profile(pluginName)
    const fileName = 'com.example.component-retry.plist'
    const originalPath = join(dshHome, 'fixture-home', 'Library', 'LaunchAgents', fileName)
    const backupRelativePath = `owned-components/launch-agents/${fileName}`
    const component = {
      kind: 'launch-agent' as const,
      label: 'com.example.component-retry',
      originalPath,
      backupRelativePath
    }
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async ({ removalId, backupDirectory }) => {
        const componentDirectory = join(backupDirectory, 'owned-components', 'launch-agents')
        await mkdir(componentDirectory, { recursive: true })
        await writeFile(join(componentDirectory, fileName), '<plist>retry</plist>\n')
        await writeFile(
          join(backupDirectory, 'owned-components.json'),
          JSON.stringify({ protocol: 1, removalId, pluginName, components: [component] })
        )
        return { ok: true, failures: [], componentBackups: [component] }
      },
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T15:25:00.000Z')
    })
    expect(removed).toMatchObject({ removed: true })
    const restoreOwnedComponents = vi.fn()
      .mockRejectedValueOnce(new Error('fixture launchctl bootstrap failed'))
      .mockResolvedValueOnce(undefined)

    const first = await restorePluginRemovalBackup(
      dshHome,
      removed.removalId as string,
      () => undefined,
      { restoreOwnedComponents }
    )
    expect(first).toMatchObject({ ok: false })
    expect(first.reason).toMatch(/launchctl bootstrap failed/u)
    await expect(shouldDeferProfileMaintenance(dshHome)).rejects.toThrow(/restore .* incomplete/u)
    const pending = (await snapshotPluginRemovalLedger(dshHome)).backups[0]
    expect(pending).toMatchObject({ restoreStartedAt: expect.any(String) })
    expect(pending?.restoreFailure).toMatch(/launchctl bootstrap failed/u)

    expect(await restorePluginRemovalBackup(
      dshHome,
      removed.removalId as string,
      () => undefined,
      { restoreOwnedComponents }
    )).toEqual({ ok: true })
    expect(restoreOwnedComponents).toHaveBeenCalledTimes(2)
    expect(restoreOwnedComponents.mock.calls[1]?.[0]).toMatchObject({
      removalId: removed.removalId,
      pluginName,
      expectedComponents: [component]
    })
    expect(existsSync(removed.backupDirectory as string)).toBe(true)
  })

  it('does not duplicate patch inserts when the final restore ledger commit fails and is retried', async () => {
    const pluginName = 'patch-retry-plugin'
    const { dshHome, profileDirectory } = await profile(pluginName)
    const patchPath = join(profileDirectory, 'cordis.patch.yml')
    await writeFile(
      patchPath,
      `- insert:\n    - name: ${pluginName}\n      config:\n        enabled: true\n`
    )
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T15:30:00.000Z')
    })
    expect(removed).toMatchObject({ removed: true })
    expect((await readFile(patchPath, 'utf8')).match(new RegExp(`name: ${pluginName}`, 'gu')) ?? [])
      .toHaveLength(0)

    fsFaults.ledgerRenameCount = 0
    fsFaults.failLedgerRenameAt = 2
    const firstRestore = await restorePluginRemovalBackup(dshHome, removed.removalId as string)
    expect(firstRestore).toMatchObject({ ok: false })
    expect(firstRestore.reason).toMatch(/ledger rename EPERM/u)
    await expect(shouldDeferProfileMaintenance(dshHome)).rejects.toThrow(/restore .* incomplete/u)

    fsFaults.failLedgerRenameAt = undefined
    fsFaults.ledgerRenameCount = 0
    expect(await restorePluginRemovalBackup(dshHome, removed.removalId as string))
      .toEqual({ ok: true })
    expect((await readFile(patchPath, 'utf8')).match(new RegExp(`name: ${pluginName}`, 'gu')) ?? [])
      .toHaveLength(1)
  })

  it('does not restore an old copy while a newer removal transaction is pending', async () => {
    const { dshHome, profileDirectory } = await profile('repeat-pending')
    const remove = (cleanupOk: boolean, at: string) => removePluginSafely({
      dshHome,
      pluginName: 'repeat-pending',
      cleanupOwnedComponents: async () => ({
        ok: cleanupOk,
        failures: cleanupOk ? [] : ['component still running']
      }),
      uninstallGeneration: async () => false,
      now: () => new Date(at)
    })
    const first = await remove(true, '2026-08-29T16:00:00.000Z')
    const packageDirectory = join(profileDirectory, 'node_modules', 'repeat-pending')
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: 'repeat-pending', version: '2.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    const manifestPath = join(profileDirectory, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.dependencies['repeat-pending'] = '2.0.0'
    manifest.dsh.profile.bundles.push('repeat-pending')
    await writeFile(manifestPath, JSON.stringify(manifest))
    const second = await remove(false, '2026-08-29T16:01:00.000Z')
    expect(second.pending).toBe(true)

    const restored = await restorePluginRemovalBackup(dshHome, first.removalId as string)
    expect(restored.ok).toBe(false)
    expect(restored.reason).toMatch(/another removal transaction/u)
  })

  it('imports a protocol-1 package backup as a generation after migration', async () => {
    const { dshHome, profileDirectory } = await profile('legacy-import')
    await rm(join(profileDirectory, 'node_modules', 'legacy-import'), { recursive: true, force: true })
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    await writeFile(join(profileDirectory, '.generations-migrated'), 'done\n')
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T11-00-00-000Z',
      'legacy-import'
    )
    const sourcePackage = join(
      backupDirectory,
      'profile-packages',
      'node_modules',
      'legacy-import'
    )
    await mkdir(sourcePackage, { recursive: true })
    await writeFile(
      join(sourcePackage, 'package.json'),
      JSON.stringify({ name: 'legacy-import', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(sourcePackage, 'cordis.patch.yml'), '[]\n')
    await writeFile(
      join(backupDirectory, 'package.json'),
      JSON.stringify({ dependencies: { 'legacy-import': '1.0.0' }, dsh: { profile: { bundles: ['legacy-import'] } } })
    )
    await writeFile(join(backupDirectory, 'cordis.patch.yml'), '[]\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(
      join(dshHome, 'recovery', 'plugin-removals.json'),
      JSON.stringify({
        protocol: 1,
        removals: {
          'legacy-import': {
            pluginName: 'legacy-import',
            status: 'removed',
            disabledAt: '2026-08-29T11:00:00.000Z',
            updatedAt: '2026-08-29T11:00:00.000Z',
            backupDirectory,
            failures: []
          }
        }
      })
    )
    const snapshot = await snapshotPluginRemovalLedger(dshHome)
    expect(snapshot.backups[0]).toMatchObject({ integrity: 'legacy-unverified', canRestore: true })

    expect(await restorePluginRemovalBackup(dshHome, snapshot.backups[0]!.removalId))
      .toEqual({ ok: true })
    expect(await readDesired(dshHome)).toHaveLength(1)
    expect(
      JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8')).dsh.profile.bundles
    ).toContain('legacy-import')
    expect(existsSync(backupDirectory)).toBe(true)
  })

  it('resumes explicit backup cleanup after rename, rm, and final ledger faults', async () => {
    for (const fault of ['rename', 'rm', 'ledger'] as const) {
      const { dshHome } = await profile(`cleanup-${fault}`)
      const removed = await removePluginSafely({
        dshHome,
        pluginName: `cleanup-${fault}`,
        cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
        uninstallGeneration: async () => false,
        now: () => new Date(`2026-08-29T17:0${fault === 'rename' ? 0 : fault === 'rm' ? 1 : 2}:00.000Z`)
      })
      await confirmPluginRemovalsBooted(dshHome)
      fsFaults.ledgerRenameCount = 0
      if (fault === 'rename') {
        fsFaults.renameMatches = (from, to) =>
          from === removed.backupDirectory && to.includes(`${join('plugin-removals', '.trash')}`)
      } else if (fault === 'rm') {
        fsFaults.rmMatches = (path) => path.includes(`${join('plugin-removals', '.trash')}`)
      } else {
        fsFaults.failLedgerRenameAt = 2
      }

      if (fault === 'ledger') {
        await expect(cleanupVerifiedRemovalBackup(dshHome, removed.removalId as string)).rejects.toThrow()
      } else {
        expect(await cleanupVerifiedRemovalBackup(dshHome, removed.removalId as string))
          .toMatchObject({ ok: false })
      }
      fsFaults.renameMatches = undefined
      fsFaults.rmMatches = undefined
      fsFaults.failLedgerRenameAt = undefined
      fsFaults.ledgerRenameCount = 0
      expect(await cleanupVerifiedRemovalBackup(dshHome, removed.removalId as string))
        .toEqual({ ok: true })
      expect(existsSync(removed.backupDirectory as string)).toBe(false)
    }
  })
})
