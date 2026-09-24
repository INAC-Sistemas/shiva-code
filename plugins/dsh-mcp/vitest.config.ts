import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin } from '../../vitest.shared.ts'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

// The root vitest include does not reach plugins/*; this suite runs on its own
// and resolves workspace imports through the root paths map to source, like
// the package suites do. `loose` extends that mapping to the plugin's .js
// modules, which would otherwise load built lib/ copies of the same packages.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [tsconfigPaths({ projects: [`${repoRoot}tsconfig.base.json`], root: repoRoot, loose: true }), standardDecoratorPlugin()],
  test: {
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30_000,
  },
})
