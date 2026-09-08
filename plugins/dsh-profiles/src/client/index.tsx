/**
 * Client half of dsh-profiles: one entry in the frame-wide overlay layer that
 * covers the app until this machine has materialized a profile.
 *
 * `shell.overlay` is the sanctioned seat for a frame-wide surface — a list, so
 * the entry is added beside the shipped ones instead of replacing anything.
 * The order sits just below dsh-login's, so when neither is satisfied the login
 * screen is the one on top: choosing a profile requires being signed in.
 *
 * There is no `window.__profileTabEnabled` here, and nothing replaces it. The
 * old build published that helper and let seven plugins gate their own sidebar
 * tabs on it — which hid tabs while their plugins stayed loaded, tools
 * registered and routes serving, and which raced its own bootstrap fetch and
 * failed open. A profile now decides what LOADS, in the composition, so a
 * plugin outside it has no tab to hide.
 * @module dsh-profiles/client
 */
import { ProfileGate } from './ProfileGate.tsx'
import type { ClientContext } from './context-types.ts'

export { ProfileGate, planFrom } from './ProfileGate.tsx'
export type { ProfileGateProps } from './ProfileGate.tsx'
export { fetchState, selectProfile } from './api.ts'
export type { ClientContext, LoginSessionFace, SlotComponent, SlotRegistry } from './context-types.ts'

/** The seat this plugin contributes into. */
export const OVERLAY_SLOT = 'shell.overlay'

/** This entry's cell key in that list slot. */
export const ENTRY_ID = 'dsh-profiles'

/**
 * Ascending display order.
 *
 * Below dsh-login's 10_000: while nobody is signed in there is no roster to
 * pick from, so the login screen has to be the one covering the app.
 */
export const ENTRY_ORDER = 9_999

/**
 * Services required before mounting.
 *
 * `loginSession` is a hard requirement, not a soft read: without a session
 * there is no roster, and a picker that mounted anyway would show an empty list
 * that reads as "you have no profiles".
 */
export const inject = ['slots', 'loginSession']

/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the slot registry and session.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
    { name: OVERLAY_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    () => ProfileGate({ session: ctx.loginSession }),
  ))
}
