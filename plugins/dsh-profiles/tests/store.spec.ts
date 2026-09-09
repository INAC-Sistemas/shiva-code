import { describe, expect, it, vi } from 'vitest'
import { ProfileStore } from '../src/client/store.ts'

const PROFILE = { id: 'p1', name: 'Web', plugins: ['dsh-mds'], revision: 1 }

describe('the shared profile state', () => {
  it('starts with nothing materialized and the picker closed', () => {
    // The gate reads this before its first fetch resolves, and an unknown state
    // must not flash the picker over a signed-in app.
    expect(new ProfileStore().getSnapshot()).toEqual({ active: null, picking: false })
  })

  it('opens the picker on demand, which is how a switch starts', () => {
    // Without this the picker is unreachable once a profile is materialized:
    // the gate only opens itself when there is nothing to materialize.
    const store = new ProfileStore()
    store.setActive(PROFILE)

    store.openPicker()

    expect(store.getSnapshot().picking).toBe(true)
    expect(store.getSnapshot().active).toEqual(PROFILE)
  })

  it('closes the picker without touching the selection', () => {
    // Cancelling a switch must leave the machine on the profile it was already
    // running, not on none.
    const store = new ProfileStore()
    store.setActive(PROFILE)
    store.openPicker()

    store.closePicker()

    expect(store.getSnapshot()).toEqual({ active: PROFILE, picking: false })
  })

  it('notifies subscribers on every change', () => {
    const store = new ProfileStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.setActive(PROFILE)
    store.openPicker()

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('keeps the snapshot reference stable when nothing changed', () => {
    // `useSyncExternalStore` re-renders on every new reference, so a no-op write
    // that minted a fresh object would loop the gate against its own fetch.
    const store = new ProfileStore()
    store.setActive(PROFILE)
    const first = store.getSnapshot()
    const listener = vi.fn()
    store.subscribe(listener)

    store.setActive(PROFILE)

    expect(store.getSnapshot()).toBe(first)
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after the disposer runs', () => {
    const store = new ProfileStore()
    const listener = vi.fn()
    store.subscribe(listener)()

    store.openPicker()

    expect(listener).not.toHaveBeenCalled()
  })
})
