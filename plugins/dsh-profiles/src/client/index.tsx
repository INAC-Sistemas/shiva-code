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
import { ProfileBadge } from './ProfileBadge.tsx'
import { ProfileGate } from './ProfileGate.tsx'
import { ProfileStore } from './store.ts'
import type { ClientContext } from './context-types.ts'

export { ProfileBadge, profileMark } from './ProfileBadge.tsx'
export type { ProfileBadgeProps } from './ProfileBadge.tsx'
export { ProfileGate, planFrom } from './ProfileGate.tsx'
export type { ProfileGateProps } from './ProfileGate.tsx'
export { ProfileStore } from './store.ts'
export type { ProfileSnapshot } from './store.ts'
export { fetchState, selectProfile } from './api.ts'
export type { ClientContext, LoginSessionFace, SlotComponent, SlotRegistry } from './context-types.ts'

/** The seat the picker covers the app from. */
export const OVERLAY_SLOT = 'shell.overlay'

/**
 * The seat the profile row sits in: the sidebar foot, above the account row.
 *
 * A stacking list, so this row claims the full width beside its neighbours
 * rather than competing with them inside one flex row — the reason
 * `dsh-user-menu` uses the same seat.
 */
export const FOOTER_SLOT = 'sidebar.footer.below'

/** This entry's cell key in those list slots. */
export const ENTRY_ID = 'dsh-profiles'

/** Ascending order in the sidebar foot; above `dsh-user-menu`'s account row at 100. */
export const FOOTER_ORDER = 90

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
 *
 * Two surfaces over one store. The gate opens itself when nothing is
 * materialized; the badge in the sidebar foot opens it on demand, and is the
 * only way to SWITCH — without it a machine that already has a profile never
 * sees the picker again, and changing profiles would mean the plugin manager's
 * dashboard plus a reload.
 * @param ctx - the browser cordis context carrying the slot registry and session.
 */
export function apply(ctx: ClientContext): void {
  const store = new ProfileStore()
  ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
    { name: OVERLAY_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    () => ProfileGate({ session: ctx.loginSession, store }),
  ))
  ctx.slots.inject(FOOTER_SLOT, () => ctx.slots.register(
    { name: FOOTER_SLOT, id: ENTRY_ID, order: FOOTER_ORDER },
    props => ProfileBadge({ store, wide: props.wide === true }),
  ))
}
