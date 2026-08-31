/**
 * tsdown build for dsh-skill-library: one host-half ESM bundle (lib/index.js).
 *
 * There is no client bundle — the package declares no `dsh.client`, so the web
 * shell never scans it and no browser artifact exists to build.
 */
import type { UserConfig } from 'tsdown'

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
] satisfies UserConfig[]
