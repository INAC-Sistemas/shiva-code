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
export const UNKNOWN_INITIALS = '?'

/**
 * Read a display name out of the session's user value.
 *
 * `name` wins; an e-mail is the fallback, cut at the `@` so the badge shows
 * the person rather than the domain.
 * @param user - the session's user value, of unknown shape.
 * @returns the trimmed name, or null when the value carries neither.
 */
export function displayName(user: unknown): string | null {
  if (typeof user !== 'object' || user === null) return null
  const record = user as Record<string, unknown>
  const name = record['name']
  if (typeof name === 'string' && name.trim() !== '') return name.trim()
  const email = record['email']
  if (typeof email === 'string' && email.trim() !== '') {
    const local = email.trim().split('@')[0] ?? ''
    if (local !== '') return local
  }
  return null
}

/**
 * The badge's letters: the first two of the name, upper-cased.
 *
 * Iterated by code point, so an accented or non-Latin first letter counts as
 * one character rather than as half a surrogate pair. A one-character name
 * yields one letter; no name yields {@link UNKNOWN_INITIALS}.
 * @param name - the display name, or null.
 * @returns one or two upper-case characters.
 */
export function initials(name: string | null): string {
  if (name === null) return UNKNOWN_INITIALS
  const letters = [...name.trim()].slice(0, 2).join('')
  if (letters === '') return UNKNOWN_INITIALS
  return letters.toLocaleUpperCase()
}
