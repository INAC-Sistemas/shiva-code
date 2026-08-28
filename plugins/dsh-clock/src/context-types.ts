/**
 * Structural types for the cordis services this plugin consumes.
 *
 * A third-party plugin resolves outside the DSH monorepo's single cordis
 * instance, so the upstream `declare module` augmentations do not reach its
 * Context and the npm `cordis` package does not declare the DSH-vendored
 * runtime members. The faces below mirror the runtime shapes this plugin
 * actually touches — the client slot registry and nothing else — so drift from
 * upstream is contained to this file.
 *
 * This file must stay free of Node.js and React value imports: it is compiled
 * into the browser bundle, where the purity gate rejects anything but the
 * shared module-table entries.
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

/** The browser cordis context after the client runtime provides its services. */
export interface ClientContext {
  slots: SlotRegistry
}

/** The host cordis context; this plugin's host half registers nothing on it. */
export interface HostContext {}
