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
import { submitLogout } from './api.ts'
import { STORAGE_KEY } from './session.ts'
import type { StoredSession } from './session.ts'
import type { SessionStore } from './store.ts'
import type { ClientContext } from './context-types.ts'
import type { LoginSessionContract } from './contract.ts'
import type { LogoutResult } from '../wire.ts'

/** The service name other plugins inject. */
export const SERVICE_NAME = 'loginSession'

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
  ctx.provide(SERVICE_NAME, new LoginSession(store))
  ctx.effect(() => {
    const onStorage = (event: StorageEvent): void => {
      // A null key is `localStorage.clear()` in another tab.
      if (event.key !== null && event.key !== STORAGE_KEY) return
      store.sync()
    }
    globalThis.addEventListener('storage', onStorage)
    return () => {
      globalThis.removeEventListener('storage', onStorage)
      store.dispose()
    }
  }, 'dsh-login: shared session')
}
