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

/** `GET` route answering what a new profile can be built from. */
export const CATALOG_ROUTE = '/profiles/api/catalog'

/** `POST` route that authors one profile. */
export const CREATE_ROUTE = '/profiles/api/create'

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

/** A plugin the author can put in a profile, as the server describes it. */
export interface PluginOption {
  id: string
  label: string
  hint: string
  plane: PluginPlane
}

/** A published library skill the author can put in a profile. */
export interface SkillOption {
  id: string
  name: string
  description: string
}

/**
 * What a new profile can be built from.
 *
 * The plugin rows carry the server's label and hint so the picker and the panel
 * say the same thing about the same row, but the server does not decide which
 * rows exist here: {@link narrowCatalogPlugins} keeps only what
 * {@link PLUGIN_ROWS} can actually compose, and takes the plane from that table
 * rather than from the answer. A server that could add a row would be choosing
 * what loads on the user's machine.
 */
export interface ProfileCatalog {
  plugins: PluginOption[]
  skills: SkillOption[]
}

/** A profile as the picker proposes it. */
export interface ProfileDraft {
  name: string
  description: string | null
  plugins: string[]
  skillIds: string[]
}

/** The answer to authoring a profile. */
export type CreateResult =
  | { ok: true, profile: ProfileSummary }
  | { ok: false, message: string }

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
 * Narrow a server-sent catalog to the plugin rows this build can compose.
 *
 * The same rule as {@link knownPlugins}, applied to the authoring side: an id
 * absent from {@link PLUGIN_ROWS} is dropped, and the plane comes from that
 * table, never from the answer — the server describes a row's text, it does not
 * get to say what loading one costs.
 * @param rows - plugin rows as the server sent them.
 * @returns the composable rows, in the order the server listed them.
 */
export function narrowCatalogPlugins(rows: readonly PluginOption[]): PluginOption[] {
  return rows
    .filter(row => row.id in PLUGIN_ROWS)
    .map(row => ({ ...row, plane: PLUGIN_ROWS[row.id] as PluginPlane }))
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
