#!/usr/bin/env node
// Stages a portable, pip-ready CPython for Windows into build/python-runtime/,
// the source directory package.json's win.extraResources copies into the
// packaged app's resources — the interpreter dsh-openviking's
// pythonCandidates config (see build/dsh-desktop.patch.yml) points at via
// $DSH_OPENVIKING_PYTHON (src/main/index.ts's bundledPythonPath(), threaded
// through src/main/runtime/harness-runtime.ts).
//
// Source: astral-sh/python-build-standalone's "install_only_stripped" build —
// unlike the official python.org embeddable zip, this ships ensurepip and a
// working site-packages/pip already, so dsh-openviking's own
// `<python> -m venv <dir>` bootstraps a usable venv without extra setup.
// Pinned by release tag + published SHA256 (verified against
// https://github.com/astral-sh/python-build-standalone/releases/download/<tag>/SHA256SUMS
// at the time this was written); bump both together, never the URL alone.
//
// Windows-only build, but this script itself has no host-platform
// dependency — it downloads the same Windows archive regardless of which OS
// runs it, so it works unmodified on the windows-2022 CI runner and on a
// developer's own machine.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const RELEASE_TAG = '20260901'
const ASSET = 'cpython-3.12.14+20260901-x86_64-pc-windows-msvc-install_only_stripped.tar.gz'
const ASSET_SHA256 = '7c45c9622400d578709a9b2cddbe8124cc21d382409d9f13406d706d28e31b14'
const DOWNLOAD_URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${RELEASE_TAG}/${ASSET}`

const OUT_DIR = join(root, 'build', 'python-runtime', 'win32-x64')
// Written after a verified extraction; its content pins the exact archive
// this staging matches, so a stale directory from an older pin is not
// silently reused as if it were current.
const MARKER_FILE = join(OUT_DIR, '.staged-from')

/** @returns whether OUT_DIR already holds this exact pinned archive. */
function alreadyStaged() {
  if (!existsSync(MARKER_FILE)) return false
  try {
    return readFileSync(MARKER_FILE, 'utf8').trim() === ASSET
  } catch {
    return false
  }
}

async function downloadArchive(destination) {
  const response = await fetch(DOWNLOAD_URL, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`install-python-runtime: download failed with HTTP ${response.status}: ${DOWNLOAD_URL}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const actual = createHash('sha256').update(buffer).digest('hex')
  if (actual !== ASSET_SHA256) {
    throw new Error(
      `install-python-runtime: checksum mismatch for ${ASSET}\n`
      + `  expected ${ASSET_SHA256}\n  got      ${actual}\n`
      + 'refusing to stage an archive that does not match the pinned release.'
    )
  }
  writeFileSync(destination, buffer)
}

async function main() {
  if (alreadyStaged()) {
    console.log(`install-python-runtime: ${OUT_DIR} already staged from ${ASSET}, skipping`)
    return
  }

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const archivePath = join(OUT_DIR, ASSET)
  console.log(`install-python-runtime: downloading ${DOWNLOAD_URL}`)
  await downloadArchive(archivePath)
  console.log('install-python-runtime: checksum verified, extracting')

  // The archive's own top-level entry is "python/", so OUT_DIR ends up as
  // build/python-runtime/win32-x64/python/python.exe — the exact path
  // bundledPythonPath() and win.extraResources both expect.
  execFileSync('tar', ['-xzf', archivePath, '-C', OUT_DIR])
  rmSync(archivePath)

  const pythonExe = join(OUT_DIR, 'python', 'python.exe')
  if (!existsSync(pythonExe)) {
    throw new Error(`install-python-runtime: extraction did not produce ${pythonExe}`)
  }
  writeFileSync(MARKER_FILE, ASSET)
  console.log(`install-python-runtime: staged ${pythonExe}`)
}

await main()
