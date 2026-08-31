/**
 * Reading a display name and its initials out of the session's `user` value.
 *
 * That value is whatever the login service returned, minus the token — this
 * plugin never assumes a shape, so every field is checked before it is read.
 * A service that returns nothing usable leaves the badge with no name, which
 * the menu renders as a neutral placeholder rather than as a broken row.
 *
 * This module is deliberately dependency-free: no React, no Node, no
 * `@deepseek-ai` values, so the bundle purity gate never has to look at it.
 * @module dsh-user-menu/client/identity
 */
/** Shown when the service returned no name and no e-mail. */
export declare const UNKNOWN_INITIALS = "?";
/**
 * Read a display name out of the session's user value.
 *
 * dsh-login stores the login answer MINUS the token, so this value is the
 * response body as the service shaped it. Two shapes are conventional and both
 * are read: the fields at the top level (`{ token, name, email }` leaves
 * `{ name, email }`), and nested under a container (`{ token, user: {…} }`
 * leaves `{ user: {…} }`). The nested pass tries every object-valued property
 * rather than a hardcoded `user`/`data`/`profile` list, and stops at depth one
 * — deeper would start matching unrelated records the answer happens to carry.
 * @param user - the session's user value, of unknown shape.
 * @returns the trimmed name, or null when no field carries one.
 */
export declare function displayName(user: unknown): string | null;
/**
 * The badge's letters: the first two of the name, upper-cased.
 *
 * Iterated by code point, so an accented or non-Latin first letter counts as
 * one character rather than as half a surrogate pair. A one-character name
 * yields one letter; no name yields {@link UNKNOWN_INITIALS}.
 * @param name - the display name, or null.
 * @returns one or two upper-case characters.
 */
export declare function initials(name: string | null): string;
