// Mirror the build-process skills into the plugin-manager (VPS) copy.
//
// Source of truth: plugins/dsh-skill-manager/skills — the copy the desktop
// ships and the skill loader reads. Destination: plugin-manager/prisma/skills,
// the VPS library copy that `prisma/seed.ts` recreates on every deploy. Run
// after adding or editing any product skill so the two cannot drift:
//
//   node scripts/sync-skills.mjs
//   node scripts/sync-skills.mjs --check

import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'plugins', 'dsh-skill-manager', 'skills')
const DEST = join(root, 'plugin-manager', 'prisma', 'skills')
const checkOnly = process.argv.includes('--check')

/** Recursively copy src over dest, then delete dest entries absent from src. */
async function mirror(src, dest) {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  const keep = new Set()
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    keep.add(ent.name)
    const from = join(src, ent.name)
    const to = join(dest, ent.name)
    if (ent.isDirectory()) await mirror(from, to)
    else await cp(from, to)
  }
  for (const ent of await readdir(dest, { withFileTypes: true })) {
    if (!keep.has(ent.name)) await rm(join(dest, ent.name), { recursive: true, force: true })
  }
}

/**
 * Fail when dest is not an exact mirror of src.
 * @returns a list of drift descriptions; empty means the trees match.
 */
async function diffTrees(src, dest, relative = '') {
  const drifts = []
  let srcEntries
  let destEntries

  try {
    srcEntries = await readdir(src, { withFileTypes: true })
  } catch {
    drifts.push(`${relative || '.'}: source tree missing`)
    return drifts
  }

  try {
    destEntries = await readdir(dest, { withFileTypes: true })
  } catch {
    drifts.push(`${relative || '.'}: seed tree missing`)
    return drifts
  }

  const srcNames = new Set(srcEntries.filter((ent) => !ent.name.startsWith('.')).map((ent) => ent.name))
  const destNames = new Set(destEntries.filter((ent) => !ent.name.startsWith('.')).map((ent) => ent.name))

  for (const name of srcNames) {
    if (!destNames.has(name)) {
      drifts.push(`${join(relative, name)}: present in source, absent from plugin-manager seed`)
    }
  }

  for (const name of destNames) {
    if (!srcNames.has(name)) {
      drifts.push(`${join(relative, name)}: present in plugin-manager seed, absent from source`)
    }
  }

  for (const ent of srcEntries) {
    if (ent.name.startsWith('.') || !destNames.has(ent.name)) continue
    const from = join(src, ent.name)
    const to = join(dest, ent.name)
    const child = join(relative, ent.name)
    if (ent.isDirectory()) {
      drifts.push(...await diffTrees(from, to, child))
      continue
    }
    const [srcBytes, destBytes] = await Promise.all([readFile(from), readFile(to)])
    if (!srcBytes.equals(destBytes)) {
      drifts.push(`${child}: content differs`)
    }
  }

  return drifts
}

if (checkOnly) {
  const drifts = await diffTrees(SRC, DEST)
  if (drifts.length > 0) {
    console.error(`skill seed drifted (${drifts.length}):`)
    for (const drift of drifts) console.error(`  ${drift}`)
    process.exit(1)
  }
  console.log(`ok ${SRC} -> ${DEST}`)
} else {
  await mirror(SRC, DEST)
  console.log(`synced ${SRC} -> ${DEST}`)
}
