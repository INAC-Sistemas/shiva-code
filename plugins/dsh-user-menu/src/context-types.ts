/**
 * Structural types for the browser cordis services this plugin consumes.
 *
 * A plugin outside the DSH monorepo's single cordis instance never receives
 * the upstream `declare module` augmentations, and the bundle purity gate
 * rejects `@deepseek-ai` value imports, so the faces below mirror the runtime
 * members this plugin actually touches. Drift from upstream is contained here.
 *
 * `LoginSessionFace` mirrors dsh-login's published contract the same way, so
 * this plugin does not depend on that package to compile — the two meet at the
 * service name alone.
 *
 * This module must stay free of Node.js and React value imports: it is
 * compiled into the browser bundle.
 * @module dsh-user-menu/context-types
 */
import type { ReactNode } from 'react'

/** A slot component as the registry stores it: props in, rendered output out. */
export type SlotComponent = (props: Record<string, unknown>) => ReactNode

/** The list-slot registration options this plugin passes to `slots.register`. */
export interface SlotListRegisterOptions {
  /** Declared SlotMap key being contributed into. */
  name: string
  /** This entry's cell key: a fresh id is added beside the shipped entries. */
  id: string
  /** Position among the entries, ascending (default 0). */
  order?: number
}

/** The browser SlotRegistry face (`ctx.slots`). */
export interface SlotRegistry {
  /**
   * Contribute one component into a declared slot.
   * @param options - the cell key, slot name, and display order.
   * @param component - the component rendered in that cell.
   * @returns disposer removing the contribution.
   */
  register(options: SlotListRegisterOptions, component: SlotComponent): () => void
  /**
   * Install an effect for each declaration lifetime of a slot, so a
   * registration waits for the owner that declares its seat.
   * @param key - the declared SlotMap key to depend on.
   * @param callback - creates the disposer live for that declaration.
   * @returns disposer for the wait and any active contribution.
   */
  inject(key: string, callback: () => () => void): () => void
}

/** One granted session, as dsh-login publishes it. */
export interface SessionSnapshot {
  /** The token the login service returned. */
  token: string
  /** Everything else that answer carried; of unknown shape by design. */
  user: unknown
  /** Instant after which the session is over, or null for no expiry. */
  expiresAt: number | null
}

/** The `ctx.loginSession` face this plugin uses (dsh-login's published contract). */
export interface LoginSessionFace {
  /**
   * Subscribe to sign-in, sign-out, and expiry.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  subscribe(listener: () => void): () => void
  /**
   * The current session.
   * @returns the live session, or null while nobody is signed in. The
   * reference is stable until the session changes.
   */
  getSnapshot(): SessionSnapshot | null
  /**
   * End the session locally and at the login service.
   * @returns whether the service acknowledged it; never rejects.
   */
  signOut(): Promise<unknown>
}

/** The browser cordis context after the client runtime provides its services. */
export interface ClientContext {
  slots: SlotRegistry
  loginSession: LoginSessionFace
}

/** The host cordis context; this plugin's host half touches nothing on it. */
export type HostContext = object
