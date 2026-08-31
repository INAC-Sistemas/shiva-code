/**
 * Client half of dsh-user-menu: the last row of the sidebar foot, under
 * Settings.
 *
 * `sidebar.footer.below` is a stacking list, which is what this badge needs
 * and what the older `sidebar.footer.action` seat cannot give: that one is a
 * single flex ROW shared by every occupant, and `dsh-kanban` already fills it
 * with a `flex: 0 0 auto` button hardcoded to 264px inside a 256px row, so a
 * second entry is pushed past the sidebar's edge and clipped whatever width it
 * declares. The new seat is a column, so this row claims the full width beside
 * its neighbours rather than competing with them.
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

/** The seat this plugin contributes into: the sidebar foot, under Settings. */
export const FOOTER_SLOT = 'sidebar.footer.below'

/** This entry's cell key in that list slot. */
export const ENTRY_ID = 'dsh-user-menu'

/** Ascending display order among the occupants of that seat. */
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
  ctx.slots.inject(FOOTER_SLOT, () => ctx.slots.register(
    { name: FOOTER_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    props => UserMenu({ session: ctx.loginSession, wide: props['wide'] === true }),
  ))
}
