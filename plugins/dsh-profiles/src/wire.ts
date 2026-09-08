/**
 * The wire vocabulary shared by the two halves of dsh-profiles: route paths,
 * the profile roster the picker renders, and the composition table that decides
 * what selecting one costs.
 *
 * This module is deliberately dependency-free — no Node imports, no React, no
 * `@deepseek-ai` values — because the client bundle imports it and the build's
 * purity gate rejects anything else.
 * @module dsh-profiles/wire
 */

/** `GET` route answering the roster plus the local selection. */
export const STATE_ROUTE = '/profiles/api/state'

/** `POST` route that makes one profile the active one. */
export const SELECT_ROUTE = '/profiles/api/select'

/**
 * Which composition plane a plugin's row lives on.
 *
 * `agent` rows sit in the `profile` agent preset: they contribute to the
 * per-scope `tools` and `skills` registries, so a session picks them up by
 * joining the preset and nothing else has to happen.
 *
 * `host` rows sit in the process composition: they serve HTTP routes and
 * publish services, so the only way to turn one off is to not load it, which
 * is decided at boot. Changing one therefore costs a restart.
 */
export type PluginPlane = 'agent' | 'host'

/**
 * The plugin ids this build can compose, and what each costs to change.
 *
 * The server sends NAMES; this table is what resolves them, and it lives in the
 * client's own source on purpose. `cordis.yml` evaluates `!!js` under `config`
 * and `disabled`, so a server that could supply composition text would be
 * supplying code to run on the user's machine. A server that can only supply
 * names cannot reach the evaluator, and a name this table does not know is
 * simply dropped.
 *
 * Keep it in step with `desktop/build/dsh-desktop.patch.yml` and
 * `apps/cli/config/agent-presets/profile/agent.cordis.yml`; `verify-cordis-config`
 * fails the build when they disagree.
 */
export const PLUGIN_ROWS: Readonly<Record<string, PluginPlane>> = {
  'dsh-skill-library': 'agent',
  'dsh-vps-status': 'agent',
  'dsh-mds': 'host',
  'dsh-prototype': 'host',
  'dsh-docs-panel': 'host',
  'dsh-skill-manager': 'host',
  'dsh-openviking': 'host',
  'dsh-flowglass': 'host',
  'dsh-sidebar-qa': 'host',
}

/** One row of the picker. */
export interface ProfileSummary {
  id: string
  name: string
  description: string | null
  pluginCount: number
  skillCount: number
  revision: number
}

/** The selection this machine has materialized, as recorded on disk. */
export interface ActiveProfile {
  id: string
  name: string
  /** Plugin names, already narrowed to what {@link PLUGIN_ROWS} knows. */
  plugins: string[]
  revision: number
}

/**
 * What the picker needs to draw itself.
 *
 * `signedIn: false` is not an error: the login gate covers the picker, and the
 * picker resolves an unknown state as "covered", so this is simply the state it
 * waits in.
 */
export type ProfileState =
  | { signedIn: false }
  | {
    signedIn: true
    profiles: ProfileSummary[]
    /** The profile the server considers active, or null. */
    serverActiveId: string | null
    /** What this machine last materialized, or null before any selection. */
    active: ActiveProfile | null
  }

/** The answer to a selection. */
export type SelectResult =
  | {
    ok: true
    active: ActiveProfile
    /**
     * Whether the app must restart for the choice to take full effect: true
     * when the two profiles differ on any `host`-plane plugin.
     */
    restartRequired: boolean
  }
  | { ok: false, message: string }

/**
 * Narrow a server-sent plugin list to the rows this build can actually compose.
 * @param plugins - names as the server sent them.
 * @returns the known names, sorted, with duplicates removed.
 */
export function knownPlugins(plugins: readonly string[]): string[] {
  return [...new Set(plugins.filter(name => name in PLUGIN_ROWS))].sort()
}

/**
 * Whether moving between two plugin sets changes the process composition.
 *
 * Only `host`-plane rows count: an `agent`-plane row enters and leaves with the
 * preset the next session mounts, so it needs nothing from the shell. Callers
 * use this to decide whether to ask for a restart, so a false positive costs
 * the user an interruption they did not need.
 * @param before - the plugin names in force now; `undefined` before any selection.
 * @param after - the plugin names being selected.
 * @returns true when at least one host-plane row differs.
 */
export function hostPlaneDiffers(
  before: readonly string[] | undefined,
  after: readonly string[],
): boolean {
  if (before === undefined) return false
  const hostRows = (names: readonly string[]) =>
    new Set(names.filter(name => PLUGIN_ROWS[name] === 'host'))
  const a = hostRows(before)
  const b = hostRows(after)
  if (a.size !== b.size) return true
  for (const name of a) if (!b.has(name)) return true
  return false
}
