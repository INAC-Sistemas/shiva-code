/**
 * Client half of dsh-user-menu: one entry in the frame-wide overlay layer,
 * pinned to the top-right of the app.
 *
 * The sidebar foot is where a user badge belongs, and it is not available. Its
 * only additive seat, `sidebar.footer.action`, is a flex ROW 256px wide, and
 * `dsh-kanban` occupies it with a `flex: 0 0 auto` button hardcoded to 264px —
 * already 8px wider than the row before anything else asks for space. A second
 * occupant is pushed past the sidebar's 280px edge and clipped, whatever width
 * it declares. `sidebar.settings` is SINGLE and held by the settings shell,
 * and `settings.action` renders inside the settings panel, behind a click.
 *
 * Everything else in the app's slot map is `scope: 'session'`, so a badge
 * there would vanish on the home screen — wrong for an identity control.
 *
 * That leaves `shell.overlay`: a list, root-scoped, always mounted, and the
 * layer grants pointer events to each entry. Pinning to the viewport's
 * top-right rather than to the sidebar is deliberate — the sidebar is
 * `position: static` and publishes no width variable, so nothing anchors to it
 * that survives its collapse.
 *
 * `slots.inject` waits for the seat's declaration and `inject` waits for
 * dsh-login's session service, so unloading either plugin removes the badge
 * with it.
 * @module dsh-user-menu/client
 */
import { UserMenu } from './UserMenu.tsx'
import type { ClientContext } from '../context-types.ts'

export { UserMenu } from './UserMenu.tsx'
export type { UserMenuProps } from './UserMenu.tsx'
export { displayName, initials, UNKNOWN_INITIALS } from './identity.ts'

/** The seat this plugin contributes into. */
export const OVERLAY_SLOT = 'shell.overlay'

/** This entry's cell key in that list slot. */
export const ENTRY_ID = 'dsh-user-menu'

/**
 * Ascending display order. Far below dsh-login's gate (10000), which must
 * cover this badge along with the rest of the app while signed out.
 */
export const ENTRY_ORDER = 100

/**
 * Services required before mounting: the slot registry from the client
 * runtime, and the shared session dsh-login publishes.
 */
export const inject = ['slots', 'loginSession']

/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the slot registry and session.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
    { name: OVERLAY_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    () => UserMenu({ session: ctx.loginSession }),
  ))
}
