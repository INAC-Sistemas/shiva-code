/**
 * The browser's record of a granted session: one `localStorage` row read
 * synchronously on first render, so an already-signed-in reload never flashes
 * the gate.
 *
 * Every access is wrapped: `localStorage` throws outright in a browser
 * configured to block site data, and the gate must still work there — it just
 * asks again on each reload. A stored row is untrusted input like any other
 * durable value, so it is validated field by field rather than cast.
 * @module dsh-login/client/session
 */
import type { AuthenticatedSession } from '../wire.ts'

/** The `localStorage` key holding the record. Clearing it signs the browser out. */
export const STORAGE_KEY = 'dsh-login.session'

/** The subset of the Storage interface this module uses. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** One granted session, as persisted. */
export interface StoredSession {
  /** The token the login service returned. */
  token: string
  /** Everything else that answer carried. */
  user: unknown
  /** Instant (browser clock) after which the gate returns, or null for no expiry. */
  expiresAt: number | null
}

/**
 * Read the stored session, dropping an expired or unreadable one.
 * @param storage - the browser storage, or undefined where none exists.
 * @param now - the current instant on the browser clock.
 * @returns the live session, or null when there is none.
 */
export function readSession(storage: StorageLike | undefined, now: number): StoredSession | null {
  if (storage === undefined) return null
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    // Storage blocked by the browser (private mode, site-data policy): the
    // gate falls back to asking on every load, which is the safe direction.
    return null
  }
  if (raw === null) return null
  const session = parseSession(raw)
  if (session === null) {
    clearSession(storage)
    return null
  }
  if (session.expiresAt !== null && session.expiresAt <= now) {
    clearSession(storage)
    return null
  }
  return session
}

/**
 * Validate one stored row.
 * @param raw - the serialized record.
 * @returns the record, or null when it is not one this version wrote.
 */
function parseSession(raw: string): StoredSession | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const token = record['token']
  const expiresAt = record['expiresAt']
  if (typeof token !== 'string' || token === '') return null
  if (expiresAt !== null && typeof expiresAt !== 'number') return null
  return { token, user: record['user'] ?? null, expiresAt }
}

/**
 * Persist a granted session, turning its lifetime into an instant on this
 * browser's own clock.
 * @param storage - the browser storage, or undefined where none exists.
 * @param session - the session the host granted.
 * @param now - the current instant on the browser clock.
 * @returns the stored record (returned even when persisting failed, so the
 * gate closes for this page load either way).
 */
export function writeSession(
  storage: StorageLike | undefined,
  session: AuthenticatedSession,
  now: number,
): StoredSession {
  const stored: StoredSession = {
    token: session.token,
    user: session.user,
    expiresAt: session.expiresInMs === null ? null : now + session.expiresInMs,
  }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage blocked or full: the session lives for this page load only.
  }
  return stored
}

/**
 * Drop the stored session.
 * @param storage - the browser storage, or undefined where none exists.
 */
export function clearSession(storage: StorageLike | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: there is nothing stored to drop.
  }
}

/**
 * The page's storage, or undefined where the environment has none.
 * @returns the `localStorage` object, or undefined when it is unavailable.
 */
export function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage as StorageLike | undefined
  } catch {
    // Accessing the property itself throws under a blocking site-data policy.
    return undefined
  }
}
