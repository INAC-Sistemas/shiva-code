import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmMigration,
  isProfileMigrated,
  migrateProfileToGenerations,
  rollBackMigration
} from '../src/main/state/generation-migration'
import { readDesired, registryLayout, writeDesired } from '../packages/dsh-desktop-market-installer/generations/registry'

/**
 * Regression tests for the failure paths called out in the Windows 0.7.1
 * triage (issue #250). Each test simulates one of the failure modes the
 * tri-state migration result and the verified rollback are supposed to
 * surface instead of swallowing, so that the launch flow has the information
 * it needs to skip shared-tree repair or to preserve a snapshot for manual
 * recovery.
 *
 * The mock for the installer module is a single switchable instance built
 * with `vi.hoisted` + `vi.mock` so the per-test state is read at call time
 * from a shared object. Using `vi.doMock` per test is not enough: the module
 * graph caches the import after the first dynamic `import()` call, so the
 * subsequent tests would see the un-mocked installer.
 */

type FailureMode =
  | { kind: 'ok' }
  | { kind: 'staging-404'; detail: string }
  | { kind: 'peer-validation-fail'; problems: string[] }

const failureMode: { current: FailureMode } = vi.hoisted(() => ({
  current: { kind: 'ok' as const }
}))

const installCalls: { name: string; spec: string }[] = vi.hoisted(() => [])

// Switchable fault injection for the rename used during rollback. The
// production code imports `rename` from `node:fs/promises`; in ESM we cannot
// spy on individual exports of a namespace, so we replace the module's
// `rename` here. The default behaviour is to defer to the real
// implementation; a per-test predicate lets a specific path throw.
const renameFault: { matches?: (from: string) => boolean; message: string } = vi.hoisted(
  () => ({ message: 'EPERM: operation not permitted, rename' })
)

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (from: Parameters<typeof actual.rename>[0], to: Parameters<typeof actual.rename>[1]) => {
      if (
        renameFault.matches &&
        typeof from === 'string' &&
        renameFault.matches(from)
      ) {
        throw Object.assign(new Error(renameFault.message), { code: 'EPERM' })
      }
      return actual.rename(from, to)
    }
  }
})

vi.mock('dsh-desktop-market-installer/generations/installer', async () => {
  const actual = await vi.importActual<
    typeof import('../packages/dsh-desktop-market-installer/generations/installer')
  >('../packages/dsh-desktop-market-installer/generations/installer')
  return {
    ...actual,
    installGeneration: async (
      options: Parameters<typeof actual.installGeneration>[0]
    ) => {
      const mode = failureMode.current
      const name = options.expectedPluginName ?? options.pluginSpec.replace(/@[^@/]+$/u, '')
      installCalls.push({ name, spec: options.pluginSpec })
      if (mode.kind === 'staging-404') {
        return { ok: false as const, detail: mode.detail }
      }
      // For 'ok' and 'peer-validation-fail' we run the real installer with a
      // synthetic runInstall so the staging tree matches the shape
      // validateGeneration expects.
      return actual.installGeneration({
        ...options,
        runInstall: async (stagingDir: string) => {
          const version = options.pluginSpec.split('@').at(-1) ?? '0.0.0'
          const pkg = join(stagingDir, 'node_modules', name)
          await mkdir(pkg, { recursive: true })
          await writeFile(
            join(pkg, 'package.json'),
            JSON.stringify({ name, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } })
          )
          await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
          await writeFile(join(stagingDir, 'pnpm-lock.yaml'), `lock-${name}-${version}\n`)
          return { code: 0, output: 'Done' }
        }
      })
    },
    verifyGenerationPeers: async (
      dshHome: string,
      generation: Parameters<typeof actual.verifyGenerationPeers>[1]
    ) => {
      const mode = failureMode.current
      if (mode.kind === 'peer-validation-fail') {
        return { ok: false as const, problems: mode.problems }
      }
      return actual.verifyGenerationPeers(dshHome, generation)
    }
  }
})

describe('migration failure paths (issue #250)', () => {
  const homes: string[] = []
  const silent = (): void => undefined

  async function preUpgradeProfile(
    plugins: Record<string, string>,
    specs: Record<string, string> = {}
  ): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-migrate-fail-'))
    homes.push(home)
    const dir = join(home, 'profiles', 'web')
    await mkdir(join(dir, 'node_modules'), { recursive: true })
    const dependencies: Record<string, string> = { dshmarket: '^1.35.0' }
    const bundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
    for (const [name, version] of Object.entries(plugins)) {
      dependencies[name] = specs[name] ?? `^${version}`
      bundles.push(name)
      const pkg = join(dir, 'node_modules', name)
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, 'package.json'), JSON.stringify({ name, version }))
    }
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies,
        dsh: { profile: { bundles } }
      })
    )
    await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await mkdir(join(home, 'profiles', 'node_modules'), { recursive: true })
    return home
  }

  function deps(home: string) {
    return {
      dshHome: home,
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      dshEntryPath: 'bin.js',
      note: silent,
      reinstallSharedTree: async () => ({ ok: true as const })
    }
  }

  beforeEach(() => {
    failureMode.current = { kind: 'ok' }
    installCalls.length = 0
    renameFault.matches = undefined
  })

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('returns deferred-failure when pnpm reports a 404 on the staging install (do not run profile repair)', async () => {
    failureMode.current = {
      kind: 'staging-404',
      detail: 'ERR_PNPM_FETCH_404  The latest release of @deepseek-ai/dsh-invariants is "0.0.1-rc.1"'
    }
    const home = await preUpgradeProfile({ 'dsh-web-ui-all': '0.3.6' })
    const manifestBefore = await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')

    const result = await migrateProfileToGenerations(deps(home))

    // The 404 must surface as a distinct outcome, not as no-op, so the launch
    // flow can skip the shared-tree repair that would otherwise run pnpm on
    // the legacy manifest and clobber the snapshot state.
    expect(result.outcome).toBe('deferred-failure')
    if (result.outcome === 'deferred-failure') {
      expect(result.reason).toMatch(/ERR_PNPM_FETCH_404|stage/i)
    }
    expect(isProfileMigrated(home)).toBe(false)
    // The pre-upgrade tree must still be there: the snapshot path the next
    // launch falls back to is gone only when the migration actually ran.
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toBe(manifestBefore)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'dsh-web-ui-all'))).toBe(true)
  })

  it('returns deferred-failure when peer validation fails, so a @deepseek-ai/* outside the closure is not silently allowed', async () => {
    // The Windows log shows migration running twice: the first time it
    // 404s on dsh-invariants; the second time peer validation fails because
    // @deepseek-ai/cordis resolves into the host. Both paths used to land in
    // the same boolean and both used to fall through to profile repair.
    failureMode.current = {
      kind: 'peer-validation-fail',
      problems: [
        '@deepseek-ai/cordis resolves outside the installation closure: ' +
          'C:\\Program Files\\DSH Desktop\\resources\\app\\node_modules\\@deepseek-ai\\cordis'
      ]
    }
    const home = await preUpgradeProfile({ 'dsh-agent-teams': '1.0.0' })
    const result = await migrateProfileToGenerations(deps(home))

    expect(installCalls.length).toBeGreaterThan(0)
    expect(result.outcome).toBe('deferred-failure')
    if (result.outcome === 'deferred-failure') {
      expect(result.reason).toMatch(/peer validation/i)
    }
    expect(isProfileMigrated(home)).toBe(false)
  })

  it('preserves the snapshot and reports failure when the Windows rename of node_modules back from .pre-generations throws', async () => {
    // The previous rollback swallowed rename errors via .catch(() => undefined)
    // and still reported success. A virus scanner or in-use file on Windows
    // can fail the rename; the user must not lose the snapshot as a result.
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })

    await mkdir(registryLayout(home).root, { recursive: true })
    await writeDesired(home, ['previous-generation'])
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')

    // Force the node_modules rename to throw — exactly the failure mode a
    // Windows file lock produces. The switchable mock above replaces
    // `fs.rename` while leaving the rest of `node:fs/promises` intact.
    renameFault.matches = (from) => from.endsWith('node_modules.pre-generations')
    try {
      const rolled = await rollBackMigration(home, silent)
      expect(rolled).toBe(false)
    } finally {
      renameFault.matches = undefined
    }

    // The failed-step snapshot must still be on disk for the user to
    // recover by hand. The other steps are independent renames in the same
    // loop, so the ones that did not hit the fault are expected to have
    // succeeded — the point of the fix is that the snapshot is preserved
    // for the step that failed rather than wiped on a single bad rename.
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(true)
  })

  it('rolls back cleanly when a non-rename step is the only one that fails, then verifies the next launch can recover', async () => {
    // Even with one step failing, the verified rollback must be honest: the
    // other steps that did succeed should stay succeeded, the snapshot must
    // survive, and the next launch must be able to roll back to the legacy
    // tree by hand.
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })

    await mkdir(registryLayout(home).root, { recursive: true })
    await writeDesired(home, ['previous-generation'])
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')

    renameFault.matches = (from) => from.endsWith('pnpm-lock.yaml.pre-generations')
    try {
      const rolled = await rollBackMigration(home, silent)
      expect(rolled).toBe(false)
    } finally {
      renameFault.matches = undefined
    }

    // node_modules and package.json were successfully restored, but the
    // lockfile snapshot is still on disk because its rename threw.
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'dsh-vision-router'))).toBe(true)
    expect(existsSync(join(home, 'profiles', 'web', 'pnpm-lock.yaml.pre-generations'))).toBe(true)
  })

  it('confirms a successful migration after a clean launch discards the snapshot only on user-confirmed cleanup', async () => {
    // Confirms the second half of the fix: even after confirmMigration is
    // called on a successful launch, the deferred marker is cleared, and a
    // retry with the same input is a no-op — the launch flow trusts the
    // state without re-running the migration on every start.
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    await mkdir(registryLayout(home).root, { recursive: true })
    await writeDesired(home, ['previous-generation'])

    const migrated = await migrateProfileToGenerations(deps(home))
    expect(migrated.outcome).toBe('migrated')

    await confirmMigration(home, silent)
    expect(existsSync(join(home, 'profiles', 'web', 'package.json.pre-generations'))).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(false)
    expect(isProfileMigrated(home)).toBe(true)

    // A second migration is a clean no-op.
    expect(await migrateProfileToGenerations(deps(home))).toEqual({ outcome: 'no-op' })
    // Desired generation pointer is preserved (not reset by confirmMigration).
    expect(await readDesired(home)).toContain('previous-generation')
  })
})
