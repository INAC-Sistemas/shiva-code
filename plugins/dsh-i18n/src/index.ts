/**
 * dsh-i18n host half: a mount point that registers nothing.
 *
 * The translation is entirely browser-side, but a profile mounts a plugin by
 * package name and the web shell serves `dsh.client` bundles only for ENABLED
 * loader entries. Without this half the `i18n` entry cannot exist, so the
 * client bundle would never reach the browser.
 *
 * The locale preference itself is Host-backed (`locale.preference` in
 * settings.yaml), but the shipped locale plugin already owns that section —
 * duplicating the registration here would collide with it.
 * @module dsh-i18n
 */
import type { HostContext } from './context-types.ts'

export type { ClientContext, HostContext, LocaleDefinition, LocaleService } from './context-types.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-i18n'

/**
 * Host plugin body: no routes, no services, no session events.
 * @param _ctx - the host cordis context, unused.
 */
export function apply(_ctx: HostContext): void {}
