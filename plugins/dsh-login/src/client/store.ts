/**
 * The live session: one holder every consumer subscribes to, backed by the
 * `localStorage` row {@link module:dsh-login/client/session} owns.
 *
 * `getSnapshot` returns the same reference until the session actually changes,
 * which `useSyncExternalStore` requires — a fresh object per call re-renders
 * forever. Writing is not part of the published service contract: the gate
 * holds this object, other plugins see the read face plus `signOut`.
 *
 * The store also owns the two transitions that happen without anyone asking —
 * a lifetime running out, and another tab signing in or out — so a subscriber
 * never has to poll or re-read storage.
 * @module dsh-login/client/store
 */
import { clearSession, readSession, writeSession } from './session.ts'
import type { StorageLike, StoredSession } from './session.ts'
import type { AuthenticatedSession } from '../wire.ts'

/** Reads the current instant; injected so expiry is testable without waiting. */
export type Clock = () => number

/** The live session, with the transitions that change it. */
export class SessionStore {
  private current: StoredSession | null
  private readonly listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined

  /**
   * Hydrate from storage, so an already-signed-in reload never flashes the gate.
   * @param storage - the browser storage, or undefined where none exists.
   * @param now - the browser clock.
   */
  constructor(
    private readonly storage: StorageLike | undefined,
    private readonly now: Clock = Date.now,
  ) {
    this.current = readSession(storage, now())
    this.arm()
  }

  /**
   * Subscribe to session changes.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * The current session.
   * @returns the live session, or null while nobody is signed in. The
   * reference is stable until the session changes.
   */
  getSnapshot(): StoredSession | null {
    return this.current
  }

  /**
   * Record a granted session and persist it.
   * @param session - the session the host granted.
   */
  grant(session: AuthenticatedSession): void {
    this.settle(writeSession(this.storage, session, this.now()))
  }

  /** Drop the session here and in storage. */
  signOut(): void {
    clearSession(this.storage)
    this.settle(null)
  }

  /**
   * Adopt what storage now holds, after another tab wrote the row. A row that
   * did not change leaves subscribers alone.
   */
  sync(): void {
    const next = readSession(this.storage, this.now())
    if (next?.token === this.current?.token && next?.expiresAt === this.current?.expiresAt) return
    this.settle(next)
  }

  /** Release the expiry timer and the subscriptions. */
  dispose(): void {
    this.disarm()
    this.listeners.clear()
  }

  /**
   * Publish one transition.
   * @param next - the session that now holds.
   */
  private settle(next: StoredSession | null): void {
    this.current = next
    this.arm()
    // A listener may unsubscribe while being notified.
    for (const listener of [...this.listeners]) listener()
  }

  /** Schedule the expiry of the current session, if it has one. */
  private arm(): void {
    this.disarm()
    const expiresAt = this.current?.expiresAt
    if (expiresAt == null) return
    this.timer = setTimeout(() => {
      clearSession(this.storage)
      this.settle(null)
    }, Math.max(0, expiresAt - this.now()))
  }

  /** Cancel a scheduled expiry. */
  private disarm(): void {
    if (this.timer === undefined) return
    clearTimeout(this.timer)
    this.timer = undefined
  }
}
