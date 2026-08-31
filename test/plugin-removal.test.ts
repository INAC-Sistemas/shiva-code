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
  confirmPluginRemovalsBooted,
  enforcePendingPluginRemovals,
  listPendingPluginRemovals,
  removePluginSafely,
  shouldDeferProfileMaintenance
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

  it('backs up, quarantines, and reconciles one exact legacy plugin', async () => {
    const { dshHome, profileDirectory } = await profile()
    const uninstallGeneration = vi.fn(async () => false)
    const staleDependency = join(profileDirectory, 'node_modules', '@deepseek-ai', 'stale-core')
    await mkdir(staleDependency, { recursive: true })
    const reconcileLegacyProfile = vi.fn(async () => {
      const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
      expect(manifest.dependencies).not.toHaveProperty('@example/plugin-a')
      expect(manifest.dsh.profile.bundles).not.toContain('@example/plugin-a')
      expect(existsSync(join(profileDirectory, 'pnpm-lock.yaml'))).toBe(false)
      await rm(staleDependency, { recursive: true, force: true })
      return { ok: true }
    })

    const result = await removePluginSafely({
      dshHome,
      pluginName: '@example/plugin-a',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration,
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:00:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(uninstallGeneration).not.toHaveBeenCalled()
    expect(reconcileLegacyProfile).toHaveBeenCalledOnce()
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).toEqual({ '@example/plugin-b': '1.0.0' })
    expect(manifest.dsh.profile.bundles).toEqual(['@example/plugin-b'])
    expect(existsSync(join(profileDirectory, 'node_modules', '@example', 'plugin-a'))).toBe(false)
    expect(existsSync(join(profileDirectory, 'pnpm-lock.yaml'))).toBe(false)
    expect(existsSync(staleDependency)).toBe(false)
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
    expect(existsSync(result.backupDirectory as string)).toBe(true)
    await confirmPluginRemovalsBooted(dshHome)
    expect(existsSync(result.backupDirectory as string)).toBe(false)
  })

  it('keeps a detached legacy plugin disabled when profile reconciliation fails', async () => {
    const { dshHome, profileDirectory } = await profile('plugin-one')
    const reconcileLegacyProfile = vi.fn(async () => ({
      ok: false,
      detail: 'ERR_PNPM_FETCH_404'
    }))

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:02:00.000Z')
    })

    expect(result).toMatchObject({
      disabled: true,
      removed: false,
      pending: true,
      failures: ['profile rebuild failed: ERR_PNPM_FETCH_404']
    })
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).not.toHaveProperty('plugin-one')
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-one')
    expect(existsSync(join(profileDirectory, 'node_modules', 'plugin-one'))).toBe(false)
    expect(await listPendingPluginRemovals(dshHome)).toEqual(['plugin-one'])
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
    const reconcileLegacyProfile = vi.fn(async () => ({ ok: true }))

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'generation-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => {
        await disableGeneration(dshHome, 'generation-plugin')
        await projectGenerations(dshHome)
        return true
      },
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:15:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(await readDesired(dshHome)).toEqual([])
    expect(await listPendingPluginRemovals(dshHome)).toEqual([])
    expect(reconcileLegacyProfile).not.toHaveBeenCalled()
  })
})
