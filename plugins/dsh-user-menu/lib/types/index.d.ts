/**
 * dsh-user-menu host half: a mount point that registers nothing.
 *
 * The badge is entirely browser-side, and the sign-out call goes through
 * dsh-login's own route, which already owns the login service relationship.
 * This half exists because a profile mounts a plugin by package name and the
 * web shell serves `dsh.client` bundles only for ENABLED loader entries —
 * without it the `user-menu` entry cannot exist, so the client bundle would
 * never reach the browser.
 * @module dsh-user-menu
 */
import type { HostContext } from './context-types.ts';
export type { ClientContext, HostContext, LoginSessionFace, SessionSnapshot, SlotComponent, SlotListRegisterOptions, SlotRegistry, } from './context-types.ts';
/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export declare const name = "dsh-user-menu";
/**
 * Host plugin body: no routes, no services, no session events.
 * @param _ctx - the host cordis context, unused.
 */
export declare function apply(_ctx: HostContext): void;
