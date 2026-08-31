import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The built client bundle. This suite reads the ARTIFACT, not the source: the
 * failure it guards against is invisible to `tsc` and to the bundler, and only
 * appears when the factory runs.
 */
const BUNDLE = fileURLToPath(new URL('../lib/client.js', import.meta.url))

/** Resolves the bundle's externals the way the shell's module table does. */
const shellRequire = createRequire(BUNDLE)

/** What `window.__ModuleLoader__.load` receives from the bundle's banner. */
interface Registration {
  id: string
  exports: Record<string, unknown>
}

/**
 * Execute the bundle exactly as the web shell's module loader does: define the
 * loader the banner calls, then run the factory with a require that answers
 * the shared module-table entries.
 * @returns what the bundle registered.
 * @throws whatever the factory throws while initializing its inlined modules.
 */
function loadBundle(): Registration {
  let registered: Registration | undefined
  const globals = globalThis as unknown as Record<string, unknown>
  globals['window'] = globalThis
  globals['__ModuleLoader__'] = {
    load({ id, factory }: { id: string; factory: (req: (s: string) => unknown) => Record<string, unknown> }) {
      registered = { id, exports: factory(specifier => shellRequire(specifier)) }
    },
  }
  shellRequire(BUNDLE)
  if (registered === undefined) throw new Error('the bundle registered nothing')
  return registered
}

// The artifact is a separate build step; a source-only checkout has none.
describe.skipIf(!existsSync(BUNDLE))('the built client bundle', () => {
  // Loaded once, as the shell loads it once: `require` caches the module, so a
  // second call returns the exports without re-running the banner.
  let loaded: { registration?: Registration; error?: unknown }
  beforeAll(() => {
    try {
      loaded = { registration: loadBundle() }
    } catch (error) {
      loaded = { error }
    }
  })

  it('runs its factory without throwing', () => {
    // Regression: Radix pulls use-sidecar, which imports tslib. Resolved
    // through tslib's `import.node` wrapper, the bundle destructures the
    // helpers off a `.default` the CommonJS interop never defines, and the
    // plugin dies at load with "Cannot destructure property '__extends'".
    // Everything compiles and bundles cleanly — only running it shows the bug.
    expect(loaded.error).toBeUndefined()
  })

  it('registers under the package name the module table keys on', () => {
    expect(loaded.registration?.id).toBe('dsh-user-menu')
  })

  it('exports the plugin protocol the loader mounts', () => {
    const exports = loaded.registration?.exports ?? {}
    expect(typeof exports['apply']).toBe('function')
    expect(exports['inject']).toEqual(['slots', 'loginSession'])
  })
})
