/**
 * Frozen service contract of the shared session (`ctx.loginSession`). Types
 * only.
 *
 * This is what a consumer plugin sees: read the token, react to sign-in and
 * sign-out, and end the session. Granting one is not here — that authority
 * belongs to the gate, which holds the store itself.
 * @module dsh-login/client/contract
 */
import type { StoredSession } from './session.ts'

/** The `ctx.loginSession` service face. */
export interface LoginSessionContract {
  /**
   * Subscribe to sign-in, sign-out, and expiry.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  subscribe(listener: () => void): () => void
  /**
   * The current session, for `useSyncExternalStore` and for one-off reads.
   * @returns the live session, or null while nobody is signed in. The
   * reference is stable until the session changes.
   */
  getSnapshot(): StoredSession | null
  /**
   * The token to send to the login service's own API.
   * @returns the token, or null while nobody is signed in.
   */
  token(): string | null
  /** End the session here, in storage, and in every other tab. */
  signOut(): void
}
