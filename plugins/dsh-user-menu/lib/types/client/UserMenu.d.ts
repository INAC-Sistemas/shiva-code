import type { ReactNode } from 'react';
import type { LoginSessionFace } from '../context-types.ts';
/** What the badge needs: the shared session, and the sidebar's current width. */
export interface UserMenuProps {
    /** dsh-login's published session service. */
    session: LoginSessionFace;
    /** True while the sidebar is expanded; false on the collapsed icon rail. */
    wide: boolean;
}
/**
 * Render the badge.
 * @param props - the shared session and the sidebar width.
 * @returns the badge and its menu, or null while nobody is signed in.
 */
export declare function UserMenu({ session, wide }: UserMenuProps): ReactNode;
