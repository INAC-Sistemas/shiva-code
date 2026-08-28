/**
 * dsh-clock host half: a mount point that registers nothing.
 *
 * The clock is entirely browser-side, but a profile mounts a plugin by package
 * name and the web shell serves `dsh.client` bundles only for ENABLED loader
 * entries. Without this half the `clock` entry cannot exist, so the client
 * bundle would never reach the browser.
 * @module dsh-clock
 */
import type { HostContext } from './context-types.ts'

export type { ClientContext, HostContext, SlotComponent, SlotListRegisterOptions, SlotRegistry } from './context-types.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-clock'

/**
 * Host plugin body: no routes, no services, no session events.
 * @param _ctx - the host cordis context, unused.
 */
export function apply(_ctx: HostContext): void {}
