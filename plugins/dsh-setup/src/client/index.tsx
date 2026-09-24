/**
 * Client half of dsh-setup: one entry in the frame-wide overlay layer that
 * covers the app until the chat model, the image generator and — when the
 * active profile loads it — the OpenViking memory are configured.
 *
 * The order sits below dsh-profiles' 9_999 and dsh-login's 10_000, so on a
 * first run the person signs in, picks a profile, and only then configures the
 * models: which tools exist depends on the profile.
 * @module dsh-setup/client
 */
import { SetupGate } from './SetupGate.tsx'
import type { ClientContext } from './context-types.ts'

export { SetupGate } from './SetupGate.tsx'
export type { SetupGateProps } from './SetupGate.tsx'
export type { ClientContext, LoginSessionFace, SlotComponent, SlotRegistry } from './context-types.ts'

/** The seat the wizard covers the app from. */
export const OVERLAY_SLOT = 'shell.overlay'

/** This entry's cell key in the overlay list. */
export const ENTRY_ID = 'dsh-setup'

/** Ascending display order: below dsh-profiles (9_999) and dsh-login (10_000). */
export const ENTRY_ORDER = 9_998

/**
 * Services required before mounting. `loginSession` is required because the
 * wizard waits for sign-in: until then the login gate covers the app.
 */
export const inject = ['slots', 'loginSession']

/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the slot registry and session.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
    { name: OVERLAY_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    () => SetupGate({ session: ctx.loginSession }),
  ))
}
