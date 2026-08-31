/**
 * The host's own copy of the granted session, kept as a credential record so
 * host-side plugins can authenticate as the signed-in user.
 *
 * The record is NOT a mirror of the browser's `localStorage` session. It is the
 * host's own copy of the same grant, written by the handler that produced it,
 * and retired by the same sign-out. Two copies, each expiring on its own clock;
 * nothing polls, subscribes, or reconciles them.
 *
 * The record key is `dsh-login/session` because the credential seam addresses a
 * record by its OWNER's registered plugin name: a payload is written in its
 * owner's format, so only the writer may name the scope. This plugin is the
 * only writer, which is why this module — the one home for the key, the payload
 * format, the expiry rule, and the `Bearer` construction — ships here and is
 * imported by consumers through the `dsh-login/vps-auth` subpath.
 *
 * Host-only. Nothing under `src/client/` may reach this module: it value-imports
 * a platform package, and the client bundle's purity gate rejects those.
 * @module dsh-login/vps-auth
 */
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import type { CredentialKey, CredentialProvider, CredentialRecord, GrantRecord } from '@deepseek-ai/dsh-credentials'
import type { AuthenticatedSession } from './wire.ts'

/** Record scope: this plugin's registered name, as the seam's addressing requires. */
export const LOGIN_RECORD_SCOPE = 'dsh-login'

/** Record id within the scope. Names what the record is, not where it points. */
export const LOGIN_RECORD_ID = 'session'

/**
 * The address of the stored session.
 * @returns the `dsh-login/session` credential key.
 */
export function loginRecordKey(): CredentialKey {
  return credentialKey(LOGIN_RECORD_SCOPE, LOGIN_RECORD_ID)
}

/**
 * The grant payload this plugin owns. Opaque to the seam and to every other
 * plugin; readable only through {@link readGrantPayload}.
 */
export interface LoginGrantPayload {
  /** The token the login service returned. */
  token: string
  /** Instant after which the session is over, or null when it has no expiry of its own. */
  expiresAt: number | null
  /** Everything the login service's answer carried besides the token. */
  user: unknown
}

/**
 * The credential-provider methods this module uses, and no others. Taking the
 * three methods rather than a `Context` keeps the module callable from a test
 * with an object literal, and keeps it from reaching anything ambient.
 */
export type LoginCredentialStore = Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'deleteRecord'>

/** Why there is no usable authorization, or the header when there is one. */
export type LoginAuthorization =
  | { ok: true, authorization: string, expiresAt: number | null }
  | { ok: false, reason: 'no-store' | 'absent' | 'expired' | 'malformed', message: string }

/** What each failure means, written for the reader that acts on it. */
const FAILURE_MESSAGE: Record<Exclude<LoginAuthorization, { ok: true }>['reason'], string> = {
  'no-store': 'This harness mounts no credential store, so a sign-in has nowhere to be recorded.',
  'absent': 'No one is signed in.',
  'expired': 'The signed-in session expired.',
  'malformed': 'The stored session record could not be read.',
}

/**
 * Build the record for one granted session.
 * @param session - the session the login service granted.
 * @param now - the host clock, applied to the session's relative lifetime.
 * @returns the grant record to store.
 */
export function toGrantRecord(session: AuthenticatedSession, now: number): GrantRecord {
  const payload: LoginGrantPayload = {
    token: session.token,
    expiresAt: session.expiresInMs === null ? null : now + session.expiresInMs,
    user: session.user,
  }
  return { kind: 'grant', payload }
}

/**
 * Read a stored record as this plugin's payload. The record is a durable
 * boundary, so every field is checked rather than trusted; a record of another
 * kind belongs to another writer and reads as nothing.
 * @param record - what the store holds at {@link loginRecordKey}, if anything.
 * @returns the payload, or undefined when there is none this plugin can use.
 */
export function readGrantPayload(record: CredentialRecord | undefined): LoginGrantPayload | undefined {
  if (record === undefined || record.kind !== 'grant') return undefined
  const payload: unknown = record.payload
  if (typeof payload !== 'object' || payload === null) return undefined
  const { token, expiresAt, user } = payload as Record<string, unknown>
  if (typeof token !== 'string' || token === '') return undefined
  if (expiresAt !== null && typeof expiresAt !== 'number') return undefined
  return { token, expiresAt, user }
}

/**
 * Resolve the authorization header for one operation.
 *
 * Consumers call this per operation and never cache the result: that
 * per-operation read is what makes a sign-in, a sign-out, or a re-login reach
 * the next operation without a restart.
 * @param store - the credential store, or undefined where none is mounted.
 * @param now - the host clock, compared against the stored expiry.
 * @returns the header to send, or the named reason there is none.
 */
export async function resolveLoginAuthorization(
  store: LoginCredentialStore | undefined,
  now: number,
): Promise<LoginAuthorization> {
  if (store === undefined) return { ok: false, reason: 'no-store', message: FAILURE_MESSAGE['no-store'] }
  const record = await store.readRecord(loginRecordKey())
  if (record === undefined) return { ok: false, reason: 'absent', message: FAILURE_MESSAGE.absent }
  const payload = readGrantPayload(record)
  if (payload === undefined) return { ok: false, reason: 'malformed', message: FAILURE_MESSAGE.malformed }
  if (payload.expiresAt !== null && payload.expiresAt <= now) {
    return { ok: false, reason: 'expired', message: FAILURE_MESSAGE.expired }
  }
  return { ok: true, authorization: `Bearer ${payload.token}`, expiresAt: payload.expiresAt }
}

/**
 * Record a granted session, replacing whatever was stored.
 *
 * A re-login replaces rather than merges: the previous grant is retired the
 * moment a new one exists, and carrying any of its fields forward would let a
 * stale expiry outlive the token it described.
 * @param store - the credential store to write through.
 * @param session - the session the login service granted.
 * @param now - the host clock, applied to the session's relative lifetime.
 */
export async function publishGrant(
  store: LoginCredentialStore,
  session: AuthenticatedSession,
  now: number,
): Promise<void> {
  await store.modifyRecord(loginRecordKey(), () => Promise.resolve(toGrantRecord(session, now)))
}

/**
 * Retire the stored session, but only for the caller that presents its token.
 *
 * The same-origin fence on the routes is a cross-site defence, not
 * authentication — a caller with neither `Sec-Fetch-Site` nor `Origin` passes —
 * so an unconditional delete would let any local process end the host's
 * session. Hence read, compare, delete.
 *
 * Accepted race: a sign-in landing between the read and the delete has its
 * fresh record removed. It is self-healing (the browser still holds its token
 * and the next request re-publishes) and the seam offers no compare-and-delete
 * primitive — `modifyRecord` returning undefined means *leave untouched*, not
 * *delete*.
 * @param store - the credential store to write through.
 * @param bearer - the incoming `authorization` header, with or without the `Bearer ` prefix.
 * @returns whether a record was actually removed.
 */
export async function revokeGrant(store: LoginCredentialStore, bearer: string): Promise<boolean> {
  const presented = bearer.replace(/^Bearer /i, '').trim()
  if (presented === '') return false
  const payload = readGrantPayload(await store.readRecord(loginRecordKey()))
  if (payload === undefined || payload.token !== presented) return false
  await store.deleteRecord(loginRecordKey())
  return true
}
