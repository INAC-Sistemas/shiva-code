import type { ClientContext } from '../context-types.ts';
export { UserMenu } from './UserMenu.tsx';
export type { UserMenuProps } from './UserMenu.tsx';
export { displayName, initials, UNKNOWN_INITIALS } from './identity.ts';
/** The seat this plugin contributes into: the sidebar foot, under Settings. */
export declare const FOOTER_SLOT = "sidebar.footer.below";
/** This entry's cell key in that list slot. */
export declare const ENTRY_ID = "dsh-user-menu";
/** Ascending display order among the occupants of that seat. */
export declare const ENTRY_ORDER = 100;
/**
 * Services required before mounting: the slot registry from the client
 * runtime, and the shared session dsh-login publishes.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the slot registry and session.
 */
export declare function apply(ctx: ClientContext): void;
