/**
 * LoginSession (`ctx.loginSession`): publishes the granted session to every
 * other client plugin.
 *
 * A plugin outside the monorepo cannot import cordis values into its browser
 * bundle — the purity gate rejects them, and collaboration goes through
 * services instead. So this is a plain object registered with
 * `ctx.provide`, not a `Service` subclass: consumers reach it exactly the same
 * way, by declaring `inject: ['loginSession']`.
 *
 * It wraps the {@link SessionStore} in the read face alone. The store itself
 * stays with this package's gate, which is the one caller allowed to grant a
 * session — the published contract has no way to.
 * @module dsh-login/client/service
 */
import { submitLogout, submitValidate } from './api.ts'
import { STORAGE_KEY } from './session.ts'
import type { StoredSession } from './session.ts'
import type { SessionStore } from './store.ts'
import type { ClientContext } from './context-types.ts'
import type { LoginSessionContract } from './contract.ts'
import type { LogoutResult } from '../wire.ts'

/** The service name other plugins inject. */
export const SERVICE_NAME = 'loginSession'

/** Thrown by {@link LoginSession.authorizedFetch} when nobody is signed in. */
export class NoSessionError extends Error {
  /** Discriminant for a caller that catches without matching on the message. */
  readonly code = 'NO_SESSION'

  constructor() {
    super('dsh-login: no one is signed in, so the request was not sent')
    this.name = 'NoSessionError'
  }
}

/** The published face of the shared session. */
export class LoginSession implements LoginSessionContract {
  /**
   * @param store - the live session this service publishes read-only.
   */
  constructor(private readonly store: SessionStore) {}

  /**
   * Subscribe to sign-in, sign-out, and expiry.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }

  /**
   * The current session.
   * @returns the live session, or null while nobody is signed in. The
   * reference is stable until the session changes.
   */
  getSnapshot(): StoredSession | null {
    return this.store.getSnapshot()
  }

  /**
   * The token to send to the login service's own API.
   * @returns the token, or null while nobody is signed in.
   */
  token(): string | null {
    return this.store.getSnapshot()?.token ?? null
  }

  /**
   * Call an API that authenticates with this session, returning to the gate
   * when it says the session is over.
   *
   * The bearer is attached here and overrides any `authorization` in `init`.
   * A `401` or `403` ends the session everywhere and the response is still
   * returned; every other status, a network failure included, leaves the
   * session alone.
   * @param input - the request, as `fetch` takes it.
   * @param init - request options; any `authorization` header is replaced.
   * @returns the response, whatever its status.
   * @throws NoSessionError when nobody is signed in, before any request is made.
   */
  async authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = this.store.getSnapshot()?.token
    if (token === undefined) {
      // Another tab may have signed in since this snapshot settled; adopting
      // storage first keeps a divergent state from becoming an anonymous call.
      this.store.sync()
      const adopted = this.store.getSnapshot()?.token
      if (adopted === undefined) throw new NoSessionError()
      return await this.send(input, init, adopted)
    }
    return await this.send(input, init, token)
  }

  /**
   * Issue one authorized request and act on a refusal.
   * @param input - the request, as `fetch` takes it.
   * @param init - request options; any `authorization` header is replaced.
   * @param token - the bearer to present.
   * @returns the response, whatever its status.
   */
  private async send(input: RequestInfo | URL, init: RequestInit | undefined, token: string): Promise<Response> {
    const headers = new Headers(init?.headers)
    headers.set('authorization', `Bearer ${token}`)
    const response = await fetch(input, { ...init, headers })
    if (response.status !== 401 && response.status !== 403) return response
    // The token this call presented is the one being retired: if the session
    // has already moved on, a late refusal must not end the newer one.
    if (this.store.getSnapshot()?.token === token) void this.signOut()
    return response
  }

  /**
   * Ask the login service whether this session still holds, and end it if not.
   *
   * Only an explicit refusal ends the session. An unreachable service, a
   * timeout, and a `5xx` all leave it alone — a login service that is down must
   * not sign everyone out.
   * @returns whether a session is still in place afterwards.
   */
  async revalidate(): Promise<boolean> {
    const token = this.store.getSnapshot()?.token
    if (token === undefined) return false
    const result = await submitValidate(token)
    if (result.ok || result.reason !== 'rejected') return true
    // A session granted while this check was in flight is a different one.
    if (this.store.getSnapshot()?.token !== token) return true
    void this.signOut()
    return false
  }

  /**
   * End the session here, in storage, in every other tab, and at the login
   * service.
   *
   * The local half is synchronous and unconditional, and it runs first: a
   * login service that refuses or cannot be reached must never be able to trap
   * someone inside the app. The returned promise reports only whether the
   * service was told, and never rejects.
   * @returns whether the login service acknowledged the sign-out.
   */
  signOut(): Promise<LogoutResult> {
    const token = this.store.getSnapshot()?.token
    this.store.signOut()
    if (token === undefined) return Promise.resolve({ ok: true })
    return submitLogout(token)
  }
}

/**
 * Publish the shared session and wire the two transitions nobody asks for: the
 * `storage` event, which fires only in the *other* tabs, so signing out
 * anywhere signs out everywhere; and the store's own expiry timer, released
 * with the plugin.
 * @param ctx - the browser cordis context.
 * @param store - the live session to publish.
 */
export function provideLoginSession(ctx: ClientContext, store: SessionStore): void {
  const session = new LoginSession(store)
  ctx.provide(SERVICE_NAME, session)
  ctx.effect(() => {
    const onStorage = (event: StorageEvent): void => {
      // A null key is `localStorage.clear()` in another tab.
      if (event.key !== null && event.key !== STORAGE_KEY) return
      store.sync()
    }
    // A token that died while this browser was closed survives in storage, so
    // the stored session is checked once on boot and again whenever the tab
    // comes back — otherwise the app looks signed in until the first call
    // fails. The host route rate-limits the repeats; the check itself never
    // ends a session for anything but an explicit refusal.
    const onFocus = (): void => void session.revalidate()
    const onVisibility = (): void => {
      if (globalThis.document?.visibilityState === 'visible') void session.revalidate()
    }
    globalThis.addEventListener('storage', onStorage)
    globalThis.addEventListener('focus', onFocus)
    globalThis.document?.addEventListener('visibilitychange', onVisibility)
    void session.revalidate()
    return () => {
      globalThis.removeEventListener('storage', onStorage)
      globalThis.removeEventListener('focus', onFocus)
      globalThis.document?.removeEventListener('visibilitychange', onVisibility)
      store.dispose()
    }
  }, 'dsh-login: shared session')
}
