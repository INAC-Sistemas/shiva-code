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
import type { LogoutResult } from '../wire.ts'

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
  /**
   * Call an API that authenticates with this session, and return to the gate
   * when it says the session is over.
   *
   * This is the path a consumer plugin should use for every such call. Building
   * the request by hand from {@link token} works and is exactly what loses the
   * `401` handling below, leaving the app looking signed in with a token
   * nothing accepts.
   *
   * The bearer is attached here and overrides any `authorization` in `init` —
   * this method owns that header. A `401` or `403` ends the session (here, in
   * storage, in every other tab, and on the host) and the response is still
   * returned, so the caller decides what to render. Every other status,
   * including a network failure, leaves the session alone: a service that
   * cannot be reached must not sign anyone out.
   * @param input - the request, as `fetch` takes it.
   * @param init - request options; any `authorization` header is replaced.
   * @returns the response, whatever its status.
   * @throws whatever `fetch` throws, unchanged.
   */
  authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  /**
   * End the session here, in storage, in every other tab, and at the login
   * service.
   *
   * The local half is synchronous and unconditional: a login service that
   * refuses or cannot be reached must never be able to trap someone inside the
   * app. The promise reports only whether the service was told, and never
   * rejects — a caller with nothing to show for it may ignore it.
   * @returns whether the login service acknowledged the sign-out.
   */
  signOut(): Promise<LogoutResult>
}
