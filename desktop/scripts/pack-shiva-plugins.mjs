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

/**
 * The build outputs a plugin publishes that its fresh pack did not contain.
 *
 * `npm pack` honours the package's `files` list and says nothing when an entry
 * is absent, so a plugin whose `lib/` was cleaned packs into a tarball with no
 * code in it — and the app loads a plugin that registers nothing. The tarball
 * being judged "stale" against that empty pack is the same accident read from
 * the other side, which is why this is reported apart from staleness: the
 * answer is `npm run build`, not another pack.
 *
 * Only literal paths are checked. A glob in `files` is a set, and an empty set
 * is a legitimate state for one.
 *
 * A directory entry counts as carried when anything under it was packed: `tar`
 * lists the files, not the directories holding them, so an exact match would
 * report every `src` and `lib` in the repository as missing.
 * @param source - the plugin directory.
 * @param packed - paths inside the freshly produced tarball, without `package/`.
 * @returns the declared files that the pack did not carry.
 */
function missingBuildOutputs(source, packed) {
  const declared = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).files
  if (!Array.isArray(declared)) return []

  const carried = new Set(packed)
  const covers = entry => carried.has(entry) || packed.some(path => path.startsWith(`${entry}/`))
  return declared.filter(entry => typeof entry === 'string' && !entry.includes('*') && !covers(entry))
}

/**
 * The `file:` dependencies whose recorded integrity no longer matches the file.
 *
 * This is the half the tarball comparison above cannot see. `npm pack` embeds
 * an mtime in the gzip stream, so packing unchanged sources still produces new
 * bytes; a pack run followed by an `npm install` that covered only some of the
 * plugins leaves the rest with fresh bytes on disk and a stale hash in the
 * lockfile. `npm install` reconciles that silently, so it surfaces first as
 * `npm ci` refusing to install — on a release runner, with EINTEGRITY.
 *
 * Every `file:` entry is checked, not only the packed plugins: the drift is a
 * property of the lockfile, and a vendored harness tarball would fail the same
 * way for the same reason.
 * @param root - the desktop package directory holding the lockfile.
 * @returns one diagnostic per entry whose bytes and recorded hash disagree.
 */
function lockIntegrityDrift(root) {
  const lockPath = join(root, 'package-lock.json')
  if (!existsSync(lockPath)) return []

  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  const drifted = []
  for (const [entry, value] of Object.entries(lock.packages ?? {})) {
    const resolved = value?.resolved
    if (typeof resolved !== 'string' || !resolved.startsWith('file:')) continue

    const tarball = join(root, resolved.slice('file:'.length))
    if (!existsSync(tarball)) {
      drifted.push(`${entry}: ${relative(root, tarball)} is missing`)
      continue
    }
    const actual = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`
    if (actual !== value.integrity) drifted.push(entry)
  }
  return drifted
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
const unbuilt = []

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

    // Judged before anything else: an unbuilt plugin packs into a tarball with
    // no code, which looks exactly like a stale one and would be "fixed" by
    // writing that empty tarball over the good one.
    const missing = missingBuildOutputs(
      join(repoRoot, 'plugins', name),
      execFileSync('tar', ['-tzf', produced], { encoding: 'utf8' })
        .split('\n')
        .filter(line => line.startsWith('package/'))
        .map(line => line.slice('package/'.length)),
    )
    if (missing.length > 0) {
      unbuilt.push(`${name} (${missing.join(', ')})`)
      continue
    }

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

// Reported in both modes: packing over a good tarball with an empty one is the
// worse outcome, and it is the one a plain run would otherwise reach.
if (unbuilt.length > 0) {
  console.error(`pack-shiva-plugins: not built, nothing packed for: ${unbuilt.join(', ')}`)
  console.error('run `npm run build` in each of those plugin directories first')
  process.exitCode = 1
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

  const drifted = lockIntegrityDrift(desktopRoot)
  if (drifted.length === 0) {
    console.log('pack-shiva-plugins: every file: dependency matches its recorded integrity.')
  } else {
    console.error(`pack-shiva-plugins: lockfile integrity is stale for: ${drifted.join(', ')}`)
    console.error('run `npm install` here so the lockfile records the tarballs that are on disk')
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
