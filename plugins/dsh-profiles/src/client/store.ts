/**
 * The little bit of state the two client surfaces share: which profile is
 * materialized, and whether the picker is open.
 *
 * The gate opens itself when there is nothing materialized. The badge in the
 * sidebar foot opens it on demand, which is the only way to SWITCH — without
 * it, a machine that already has a profile never sees the picker again, and
 * changing profiles means going to the plugin manager's dashboard.
 *
 * A store rather than props because the two surfaces sit in different slots and
 * never share a React tree. Its shape is what `useSyncExternalStore` needs: a
 * subscribe function and a snapshot whose reference only changes when the value
 * does.
 * @module dsh-profiles/client/store
 */
import type { ActiveProfile } from '../wire.ts'

/** What both surfaces render from. */
export interface ProfileSnapshot {
  /** The materialized profile, or null before any selection is recorded. */
  active: ActiveProfile | null
  /** Whether the picker is showing because someone asked for it. */
  picking: boolean
}

const EMPTY: ProfileSnapshot = { active: null, picking: false }

/** Shared state for the gate and the sidebar badge. */
export class ProfileStore {
  private snapshot: ProfileSnapshot = EMPTY
  private readonly listeners = new Set<() => void>()

  /**
   * Subscribe to changes.
   * @param listener - called after every change, with no arguments.
   * @returns disposer removing the subscription.
   */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * The current value.
   * @returns a snapshot whose reference is stable until something changes.
   */
  readonly getSnapshot = (): ProfileSnapshot => this.snapshot

  /**
   * Record the profile this machine has materialized.
   * @param active - the selection, or null when there is none.
   */
  setActive(active: ActiveProfile | null): void {
    this.update({ ...this.snapshot, active })
  }

  /** Show the picker. Called by the sidebar badge; this is how a switch starts. */
  openPicker(): void {
    this.update({ ...this.snapshot, picking: true })
  }

  /** Hide the picker without changing the selection. */
  closePicker(): void {
    this.update({ ...this.snapshot, picking: false })
  }

  private update(next: ProfileSnapshot): void {
    if (next.active === this.snapshot.active && next.picking === this.snapshot.picking) return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}
