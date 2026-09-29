/**
 * The verify-cordis-config metadata contract: `disabled` is the one entry
 * metadata field whose `!!js` expression the Loader interpolates; every other
 * metadata field must stay static, and a disabled expression must parse.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  bundleManifestPaths,
  bundlePluginDependencyErrors,
  metadataExpressionErrors,
  packageTestFixtureDependencyErrors,
  packageTestPluginDependencyErrors,
  missingDelegationPresets,
  undeclaredDesktopRows,
} from './verify-cordis-config.ts'

describe('verify-cordis-config metadata expressions', () => {
  it('accepts a disabled !!js expression', () => {
    const problems = metadataExpressionErrors(
      { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: { __jsExpr: "process.platform === 'win32'" } },
      '[0]',
    )
    expect(problems).toEqual([])
  })

  it('rejects an expression in a static metadata field', () => {
    const problems = metadataExpressionErrors({ id: { __jsExpr: 'process.platform' }, name: 'pkg' }, '[0]')
    expect(problems).toContain('[0].id: !!js is not interpolated here')
  })

  it('rejects an expression nested below disabled (only the field itself interpolates)', () => {
    const problems = metadataExpressionErrors(
      { id: 'tool-bash', name: 'pkg', disabled: { when: { __jsExpr: 'process.platform' } } },
      '[0]',
    )
    expect(problems).toContain('[0].disabled.when: !!js is not interpolated here')
  })

  it('rejects a disabled expression that does not parse (the loader would fail the boot)', () => {
    const problems = metadataExpressionErrors(
      { id: 'tool-bash', name: 'pkg', disabled: { __jsExpr: 'process.platform ===' } },
      '[0]',
    )
    expect(problems.some(problem => problem.includes('[0].disabled: disabled expression does not parse'))).toBe(true)
  })
})

describe('workspace Bundle discovery and product dependency closures', () => {
  it('discovers a Bundle outside packages/bundle from its manifest declaration', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'dsh-bundle-discovery-'))
    try {
      const bundleDir = join(fixture, 'packages/subagent/example')
      const plainDir = join(fixture, 'packages/bundle/plain')
      mkdirSync(bundleDir, { recursive: true })
      mkdirSync(plainDir, { recursive: true })
      writeFileSync(join(bundleDir, 'package.json'), JSON.stringify({
        name: '@deepseek-ai/dsh-subagent-example',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }))
      writeFileSync(join(plainDir, 'package.json'), JSON.stringify({
        name: '@deepseek-ai/dsh-plain',
      }))

      expect(bundleManifestPaths(fixture)).toEqual([
        'packages/subagent/example/package.json',
      ])
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('allows a Bundle to mount itself but rejects an undeclared plugin package', () => {
    const manifestPath = 'packages/subagent/example/package.json'
    const file = 'packages/subagent/example/cordis.patch.yml'
    const manifest = {
      name: '@deepseek-ai/dsh-subagent-example',
      dependencies: {},
    }
    const self = { file, name: '@deepseek-ai/dsh-subagent-example' }
    expect(bundlePluginDependencyErrors(manifestPath, manifest, [self])).toEqual([])
    expect(bundlePluginDependencyErrors(manifestPath, manifest, [
      self,
      { file, name: '@deepseek-ai/dsh-missing-plugin' },
    ])).toEqual([
      `${file}: @deepseek-ai/dsh-missing-plugin must be declared in ${manifestPath} dependencies`,
    ])
  })
})

describe('package-owned Loader test dependency closures', () => {
  it('requires package test configs to declare each named plugin they load', () => {
    const manifestPath = 'packages/example/owner/package.json'
    const file = 'packages/example/owner/tests/fixtures/cordis.yml'
    const manifest = {
      name: '@deepseek-ai/dsh-owner',
      dependencies: {},
      devDependencies: {
        '@deepseek-ai/dsh-declared': 'workspace:^',
      },
    }
    expect(packageTestPluginDependencyErrors(manifestPath, manifest, [
      { file, name: '@deepseek-ai/dsh-owner' },
      { file, name: '@deepseek-ai/dsh-declared' },
      { file, name: '@deepseek-ai/dsh-missing' },
    ])).toEqual([
      `${file}: @deepseek-ai/dsh-missing must be declared in ${manifestPath} dependencies or devDependencies`,
    ])
  })

  it('requires executable package test fixtures to declare their bare imports', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'dsh-package-test-entrypoint-'))
    try {
      const packageDir = join(fixture, 'packages/example/owner')
      const driverDir = join(packageDir, 'tests/fixtures/loader')
      mkdirSync(driverDir, { recursive: true })
      writeFileSync(join(packageDir, 'package.json'), JSON.stringify({
        name: '@deepseek-ai/dsh-owner',
        devDependencies: {
          '@deepseek-ai/dsh-declared': 'workspace:^',
        },
      }))
      writeFileSync(join(driverDir, 'driver.ts'), [
        "import '@deepseek-ai/dsh-owner'",
        "import '@deepseek-ai/dsh-declared'",
        "import '@deepseek-ai/dsh-missing'",
      ].join('\n'))
      writeFileSync(join(driverDir, 'cordis.yml'), '[]\n')
      writeFileSync(join(driverDir, 'fixture.mjs'), "import '@deepseek-ai/dsh-declared'\n")
      const unrelatedDir = join(packageDir, 'tests/fixtures/unrelated')
      mkdirSync(unrelatedDir, { recursive: true })
      writeFileSync(join(unrelatedDir, 'driver.ts'), "import '@deepseek-ai/dsh-unrelated'\n")

      expect(packageTestFixtureDependencyErrors(fixture)).toEqual([
        'packages/example/owner/tests/fixtures/loader/driver.ts: '
        + '@deepseek-ai/dsh-missing must be declared in '
        + 'packages/example/owner/package.json dependencies or devDependencies',
      ])
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('fails loud when package-owned Loader fixtures disappear from the scan', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'dsh-empty-package-test-entrypoint-'))
    try {
      expect(packageTestFixtureDependencyErrors(fixture)).toEqual([
        'package test fixture dependency scan found no package-owned Loader configs',
      ])
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

describe('desktop composition plane declaration', () => {
  /** One `- insert:` operation, the shape the desktop patch adds rows with. */
  function insert(rows: unknown[]): unknown[] {
    return [{ insert: rows }]
  }

  /** The gate expression a profile-gated row carries. */
  function gate(name: string): { __jsExpr: string } {
    return {
      __jsExpr: `!(process.env.DSH_PROFILE_PLUGINS ?? '${name}').split(',').includes('${name}')`,
    }
  }

  it('rejects a plain inserted row', () => {
    // This is the leak the gate exists for: `dsh-skill-library` sat here as a
    // bare row, filed its skill provider into the GLOBAL layer, and reached
    // every agent in every profile with nothing anywhere saying so.
    expect(undeclaredDesktopRows(insert([{ id: 'skill-library', name: 'dsh-skill-library' }])))
      .toEqual([{ id: 'skill-library', name: 'dsh-skill-library' }])
  })

  it('accepts a row gated on the active profile', () => {
    expect(undeclaredDesktopRows(insert([
      { id: 'mds', name: 'dsh-mds', disabled: gate('dsh-mds') },
    ]))).toEqual([])
  })

  it('accepts a row declared always-on', () => {
    expect(undeclaredDesktopRows(insert([
      { id: 'dsh-better-sidebar', name: 'dsh-better-sidebar' },
    ]))).toEqual([])
  })

  it('rejects a gate that names another plugin', () => {
    // Copy-paste between two rows is the realistic way this breaks, and it
    // would silently tie one plugin's presence to another's.
    expect(undeclaredDesktopRows(insert([
      { id: 'mds', name: 'dsh-mds', disabled: gate('dsh-prototype') },
    ]))).toEqual([{ id: 'mds', name: 'dsh-mds' }])
  })

  it('rejects a static disabled that cannot read the profile', () => {
    expect(undeclaredDesktopRows(insert([
      { id: 'mds', name: 'dsh-mds', disabled: true },
    ]))).toEqual([{ id: 'mds', name: 'dsh-mds' }])
  })

  it('ignores operations that address an existing row instead of inserting one', () => {
    expect(undeclaredDesktopRows([{ id: 'ui-brand-official', disabled: true }])).toEqual([])
  })
})

describe('delegation preset referents', () => {
  it('rejects a delegation row whose agentPreset has no sibling preset', () => {
    const presetRoot = mkdtempSync(join(tmpdir(), 'verify-delegation-presets-'))
    try {
      mkdirSync(join(presetRoot, 'team-backend'))
      writeFileSync(join(presetRoot, 'team-backend', 'agent.cordis.yml'), '[]\n')
      const entries = [{
        id: 'delegation',
        name: 'cordis:group',
        config: [
          { id: 'backend', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn', agentPreset: 'team-backend' } },
          { id: 'tester', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn', agentPreset: 'team-tester' } },
        ],
      }]

      expect(missingDelegationPresets(entries, presetRoot)).toEqual([{ id: 'tester', agentPreset: 'team-tester' }])
    } finally {
      rmSync(presetRoot, { recursive: true, force: true })
    }
  })
})
