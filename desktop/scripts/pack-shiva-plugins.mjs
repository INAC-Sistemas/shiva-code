#!/usr/bin/env node
/**
 * Pack the in-tree `plugins/*` this app composes into `npm-shiva-plugins/`, and
 * point `package.json` at what came out.
 *
 * These tarballs used to be made by hand, and nothing said so. That is a silent
 * staleness trap: a `file:` dependency whose filename did not change keeps
 * resolving to the old contents, so editing a plugin in this repo has no effect
 * on the packaged app and no error anywhere says why. It cost a full round of
 * "the profile picker does not reach the plugin manager" before anyone looked
 * inside the tarball.
 *
 * Run it after changing any plugin under `plugins/`, then `npm install` here so
 * the lockfile records the new integrity.
 *
 * Usage: node scripts/pack-shiva-plugins.mjs [--check]
 *   --check  report what would change and exit non-zero, packing nothing.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(desktopRoot, '..')
const manifestPath = join(desktopRoot, 'package.json')

/**
 * Plugins the desktop takes from somewhere other than this repository.
 *
 * `dsh-flowglass` ships the published 0.4.4 because this checkout's copy has an
 * `inject` list missing `sessions` and crashes boot; `dsh-openviking` ships a
 * published 0.1.1 newer than the checkout. Packing either from `plugins/`
 * would quietly downgrade the app, so they stay pinned and their local edits do
 * not reach the packaged build.
 */
const PUBLISHED_ELSEWHERE = new Set(['dsh-flowglass', 'dsh-openviking'])

/**
 * Plugins whose pack output cannot be compared against the stored tarball.
 *
 * `dsh-sidebar-qa` declares `"prepare": "tsdown"`, so `npm pack` rebuilds it,
 * and that build emits its CSS-module class map in a different order every run.
 * Its content digest therefore never repeats and `--check` would report it as
 * stale forever. Packing it is still correct — only judging it is not.
 */
const REBUILDS_NON_DETERMINISTICALLY = new Set(['dsh-sidebar-qa'])

/** Where the packed tarballs live, relative to the desktop package. */
function packDirectory(manifest) {
  const reference = Object.values(manifest.dependencies ?? {})
    .find(value => typeof value === 'string' && value.includes('npm-shiva-plugins/'))
  if (reference === undefined) {
    throw new Error('package.json has no npm-shiva-plugins dependency to locate the pack directory')
  }
  return reference.replace(/^file:/, '').replace(/\/[^/]+$/, '')
}

/**
 * A digest of what a tarball actually carries: every entry path and its bytes,
 * in sorted order.
 *
 * Compared instead of the tarball bytes because gzip embeds mtimes, so two
 * packs of an unchanged package never match byte for byte and rarely even match
 * in length. A `--check` that reported those as drift would cry wolf on every
 * run, which is worse than no check at all.
 * @param tarball - path to a `.tgz`.
 * @returns a hex digest of the contents.
 */
function contentDigest(tarball) {
  const staging = mkdtempSync(join(tmpdir(), 'shiva-digest-'))
  try {
    execFileSync('tar', ['-xzf', tarball, '-C', staging])
    const hash = createHash('sha256')
    const walk = (directory) => {
      for (const entry of readdirSync(directory).sort()) {
        const path = join(directory, entry)
        if (statSync(path).isDirectory()) {
          walk(path)
          continue
        }
        hash.update(relative(staging, path))
        hash.update(readFileSync(path))
      }
    }
    walk(staging)
    return hash.digest('hex')
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const relativeDirectory = packDirectory(manifest)
const absoluteDirectory = join(desktopRoot, relativeDirectory)
const check = process.argv.includes('--check')

/** The plugin names this app depends on that also exist in `plugins/`. */
const candidates = Object.entries(manifest.dependencies ?? {})
  .filter(([, value]) => typeof value === 'string' && value.includes('npm-shiva-plugins/'))
  .map(([name]) => name)
  .filter(name => existsSync(join(repoRoot, 'plugins', name, 'package.json')))
  .filter(name => !PUBLISHED_ELSEWHERE.has(name))
  .sort()

const changed = []
const unjudged = []

for (const name of candidates) {
  const source = join(repoRoot, 'plugins', name, 'package.json')
  const version = JSON.parse(readFileSync(source, 'utf8')).version
  const filename = `${name}-${version}.tgz`
  const reference = `file:${relativeDirectory}/${filename}`
  const staging = mkdtempSync(join(tmpdir(), 'shiva-pack-'))

  try {
    // `npm pack` honours the package's own `files` list, so a plugin that
    // builds (dsh-login, dsh-profiles, dsh-skill-library) must have run its
    // build first — its `lib/` is gitignored and cannot be assumed present.
    const packed = execFileSync('npm', ['pack', '--silent', '--pack-destination', staging], {
      cwd: join(repoRoot, 'plugins', name),
      encoding: 'utf8',
    }).trim().split('\n').pop()
    const produced = join(staging, packed)

    const existing = join(absoluteDirectory, filename)

    if (check) {
      if (manifest.dependencies[name] !== reference) {
        changed.push(name)
      } else if (REBUILDS_NON_DETERMINISTICALLY.has(name)) {
        unjudged.push(name)
      } else if (!existsSync(existing) || contentDigest(existing) !== contentDigest(produced)) {
        changed.push(name)
      }
      continue
    }

    // Drop the superseded file before writing, so a version bump does not leave
    // the old tarball behind for someone to point at again.
    for (const entry of readdirSync(absoluteDirectory)) {
      if (entry.startsWith(`${name}-`) && entry.endsWith('.tgz') && entry !== filename) {
        rmSync(join(absoluteDirectory, entry))
      }
    }
    mkdirSync(absoluteDirectory, { recursive: true })
    writeFileSync(existing, readFileSync(produced))
    if (manifest.dependencies[name] !== reference) {
      manifest.dependencies[name] = reference
      changed.push(name)
    }
    console.log(`packed ${filename}`)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

if (check) {
  for (const name of unjudged) {
    console.log(`pack-shiva-plugins: ${name} rebuilds non-deterministically; pack it to be sure.`)
  }
  if (changed.length === 0) {
    console.log('pack-shiva-plugins: every judgeable packed plugin matches plugins/.')
  } else {
    console.error(`pack-shiva-plugins: stale tarball(s): ${changed.join(', ')}`)
    console.error('run `node scripts/pack-shiva-plugins.mjs` and then `npm install`')
    process.exitCode = 1
  }
} else {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    changed.length === 0
      ? 'pack-shiva-plugins: dependencies unchanged; run `npm install` to refresh integrity.'
      : `pack-shiva-plugins: repointed ${changed.join(', ')}; run \`npm install\`.`,
  )
}
