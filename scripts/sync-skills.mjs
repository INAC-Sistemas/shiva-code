// Mirror the build-process skills into the plugin-manager (VPS) copy.
//
// Source of truth: plugins/dsh-skill-manager/skills — the copy the desktop
// ships and the skill loader reads. Destination: plugin-manager/prisma/skills,
// the VPS library copy. Run after editing any skill so the two cannot drift:
//
//   node scripts/sync-skills.mjs

import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'plugins', 'dsh-skill-manager', 'skills')
const DEST = join(root, 'plugin-manager', 'prisma', 'skills')

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

await mirror(SRC, DEST)
console.log(`synced ${SRC} -> ${DEST}`)
