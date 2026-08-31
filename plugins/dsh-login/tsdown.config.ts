/**
 * tsdown build for dsh-login: the host-half ESM bundle (lib/index.js) and the
 * browser client bundle (lib/client.js, a CJS closure factory).
 *
 * The client artifact registers itself through
 * `window.__ModuleLoader__.load({ id, factory })` under the PACKAGE NAME —
 * the client-modules table keys profile-channel bundles on it, so the id below
 * must stay in sync with package.json `name`. Everything the factory needs is
 * inlined except the shared platform module-table entries; a purity gate
 * rejects Node builtins and `@deepseek-ai` value imports, since cross-plugin
 * collaboration goes through cordis services (type-only imports are erased and
 * never reach the gate).
 */
import { builtinModules } from 'node:module'
import type { UserConfig } from 'tsdown'

/** Node builtins must never survive into the browser module-loader factory. */
const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(id => `node:${id}`),
])

/** Module specifiers the web shell shares into the frozen module table. */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
]

/** Bundle id for the official profile channel; keep in sync with package.json `name`. */
const PLUGIN_ID = 'dsh-login'

const MODE = process.env.NODE_ENV ?? 'production'

type BuildPlugin = NonNullable<UserConfig['plugins']>

/** The client-bundle purity gate: no Node builtins, no platform value imports. */
function purityGatePlugin(): BuildPlugin {
  return {
    name: 'dsh-client-bundle-purity',
    resolveId(source: string) {
      if (NODE_BUILTINS.has(source)) {
        throw new Error(
          `client bundle purity: Node builtin "${source}" cannot run in the browser module table`,
        )
      }
      if (!source.startsWith('@deepseek-ai/')) return null
      throw new Error(
        `client bundle purity: "${source}" is a platform package — cross-plugin value imports are forbidden; `
        + 'collaborate through cordis services (type-only imports are erased and never reach this gate)',
      )
    },
  }
}

export default [
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...CLIENT_EXTERNALS],
    define: {
      'process.env.NODE_ENV': JSON.stringify(MODE),
      'import.meta.env.MODE': JSON.stringify(MODE),
      'import.meta.env': JSON.stringify({ MODE }),
    },
    inputOptions: {
      resolve: {
        conditionNames: ['browser', 'import', 'require', 'default'],
      },
    },
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    plugins: [purityGatePlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: `return module.exports; } });`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      codeSplitting: false,
    },
  },
] satisfies UserConfig[]
