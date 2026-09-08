/**
 * The one piece of profile state this machine keeps: which profile it has
 * materialized, at `$DSH_HOME/profile/active.json`.
 *
 * This file is NOT the roster — the plugin manager owns that, and the client
 * never authors a profile. It exists because the desktop shell has to know the
 * plugin list BEFORE the harness starts, to decide which host-plane rows load,
 * and at that moment there is no plugin running to ask.
 *
 * Host-only: the client bundle never imports this module.
 * @module dsh-profiles/active
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ActiveProfile } from './wire.ts'
import { knownPlugins } from './wire.ts'

/** Path of the selection file, relative to the harness home. */
export const ACTIVE_PROFILE_FILE = join('profile', 'active.json')

/**
 * Read the materialized selection.
 *
 * Every failure reads as "no selection". The desktop shell reads the same file
 * with the same rule ({@link readActiveProfilePlugins} in `harness-runtime.ts`),
 * and both must agree: refusing to start over a truncated file would be worse
 * than starting with everything enabled, which is where the user was before
 * choosing anything.
 * @param dshHome - the harness home directory.
 * @returns the recorded selection, or null when none is readable.
 */
export async function readActiveProfile(dshHome: string): Promise<ActiveProfile | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(join(dshHome, ACTIVE_PROFILE_FILE), 'utf8'))
  } catch {
    // Absent (never chosen), unreadable, or not JSON. Nothing else reaches
    // this catch: the only writer is `writeActiveProfile` below.
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const row = parsed as Partial<Record<keyof ActiveProfile, unknown>>
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null
  return {
    id: row.id,
    name: row.name,
    plugins: knownPlugins(Array.isArray(row.plugins) ? row.plugins.filter((p): p is string => typeof p === 'string') : []),
    revision: typeof row.revision === 'number' ? row.revision : 0,
  }
}

/**
 * Record the materialized selection.
 *
 * Written to a sibling temporary file and renamed, because the desktop shell
 * reads this file at spawn: a partial write would look like a profile with no
 * plugins, which is a real and very different choice.
 * @param dshHome - the harness home directory.
 * @param active - the selection to record.
 */
export async function writeActiveProfile(
  dshHome: string,
  active: ActiveProfile,
): Promise<void> {
  const path = join(dshHome, ACTIVE_PROFILE_FILE)
  const staging = `${path}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(staging, `${JSON.stringify(active, null, 2)}\n`, 'utf8')
  await rename(staging, path)
}
