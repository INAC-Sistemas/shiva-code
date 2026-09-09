/**
 * Structural types for the browser cordis services this plugin consumes.
 *
 * A plugin outside the DSH monorepo's single cordis instance never receives the
 * upstream `declare module` augmentations, so the faces below mirror the runtime
 * members this half actually touches — the slot registry and the login session —
 * and drift from upstream is contained to this file.
 *
 * This module must stay free of Node.js and React value imports: it is compiled
 * into the browser bundle, where the purity gate rejects everything but the
 * shared module-table entries.
 * @module dsh-profiles/client/context-types
 */
import type { ReactNode } from 'react'

/** A slot component as the registry stores it: props in, rendered output out. */
export type SlotComponent = (props: Record<string, unknown>) => ReactNode

/** The list-slot registration options this plugin passes to `slots.register`. */
export interface SlotListRegisterOptions {
  name: string
  id: string
  order?: number
}

/** The browser SlotRegistry face (`ctx.slots`). */
export interface SlotRegistry {
  register(options: SlotListRegisterOptions, component: SlotComponent): () => void
  inject(key: string, callback: () => () => void): () => void
}

/**
 * The part of `ctx.loginSession` this plugin reads.
 *
 * Only the read face: the picker needs to know WHETHER someone is signed in, so
 * it can stay out of the way until the login gate is done. Granting and ending
 * a session belong to dsh-login.
 */
export interface LoginSessionFace {
  /**
   * Subscribe to sign-in, sign-out, and expiry.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  subscribe(listener: () => void): () => void
  /**
   * The current session.
   * @returns a session object while signed in, or null. The reference is stable
   * until the session changes, which is what `useSyncExternalStore` requires.
   */
  getSnapshot(): unknown
}

/** The browser cordis context after the client runtime provides its services. */
export interface ClientContext {
  slots: SlotRegistry
  loginSession: LoginSessionFace
}
