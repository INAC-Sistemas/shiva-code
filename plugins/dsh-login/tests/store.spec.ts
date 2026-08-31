import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, writeSession } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'
import { SessionStore } from '../src/client/store.ts'

/** An in-memory Storage stand-in; `fail` makes every access throw, as a blocked browser does. */
function storageOf(fail = false): StorageLike & { value: string | undefined } {
  return {
    value: undefined,
    getItem(key) {
      if (fail) throw new Error('storage blocked')
      return key === STORAGE_KEY && this.value !== undefined ? this.value : null
    },
    setItem(key, value) {
      if (fail) throw new Error('storage blocked')
      if (key === STORAGE_KEY) this.value = value
    },
    removeItem(key) {
      if (fail) throw new Error('storage blocked')
      if (key === STORAGE_KEY) this.value = undefined
    },
  }
}

/** Counts the notifications one store sent. */
function watch(store: SessionStore): () => number {
  let count = 0
  store.subscribe(() => { count += 1 })
  return () => count
}

beforeEach(() => void vi.useFakeTimers({ now: 1_000 }))
afterEach(() => void vi.useRealTimers())

describe('SessionStore', () => {
  it('hydrates from storage, so a signed-in reload never flashes the gate', () => {
    const storage = storageOf()
    writeSession(storage, { token: 'abc', user: null, expiresInMs: null }, 1_000)
    expect(new SessionStore(storage).getSnapshot()?.token).toBe('abc')
  })

  it('starts anonymous when storage is blocked', () => {
    expect(new SessionStore(storageOf(true)).getSnapshot()).toBeNull()
  })

  it('publishes a granted session and persists it', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const notified = watch(store)
    store.grant({ token: 'abc', user: { id: 7 }, expiresInMs: null })
    expect(store.getSnapshot()).toEqual({ token: 'abc', user: { id: 7 }, expiresAt: null })
    expect(notified()).toBe(1)
    expect(new SessionStore(storage).getSnapshot()?.token).toBe('abc')
  })

  it('returns the same snapshot reference until the session changes', () => {
    // useSyncExternalStore re-renders forever when getSnapshot is not stable.
    const store = new SessionStore(storageOf())
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    expect(store.getSnapshot()).toBe(store.getSnapshot())
  })

  it('signs out here and in storage', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    const notified = watch(store)
    store.signOut()
    expect(store.getSnapshot()).toBeNull()
    expect(storage.value).toBeUndefined()
    expect(notified()).toBe(1)
  })

  it('stops notifying a listener that unsubscribed', () => {
    const store = new SessionStore(storageOf())
    let count = 0
    const off = store.subscribe(() => { count += 1 })
    off()
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    expect(count).toBe(0)
  })

  it('expires a session with a lifetime without waiting for a reload', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const notified = watch(store)
    store.grant({ token: 'abc', user: null, expiresInMs: 60_000 })
    vi.advanceTimersByTime(59_999)
    expect(store.getSnapshot()?.token).toBe('abc')
    vi.advanceTimersByTime(1)
    expect(store.getSnapshot()).toBeNull()
    expect(storage.value).toBeUndefined()
    expect(notified()).toBe(2)
  })

  it('rearms the expiry when a second session replaces the first', () => {
    const store = new SessionStore(storageOf())
    store.grant({ token: 'first', user: null, expiresInMs: 10_000 })
    vi.advanceTimersByTime(5_000)
    store.grant({ token: 'second', user: null, expiresInMs: 10_000 })
    vi.advanceTimersByTime(5_001)
    expect(store.getSnapshot()?.token).toBe('second')
    vi.advanceTimersByTime(5_000)
    expect(store.getSnapshot()).toBeNull()
  })

  it('adopts a sign-in another tab wrote', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const notified = watch(store)
    writeSession(storage, { token: 'from-other-tab', user: null, expiresInMs: null }, 1_000)
    store.sync()
    expect(store.getSnapshot()?.token).toBe('from-other-tab')
    expect(notified()).toBe(1)
  })

  it('adopts a sign-out another tab wrote', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    storage.value = undefined
    store.sync()
    expect(store.getSnapshot()).toBeNull()
  })

  it('leaves subscribers alone when the stored row did not change', () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    const notified = watch(store)
    store.sync()
    expect(notified()).toBe(0)
  })

  it('releases the expiry timer on disposal', () => {
    const store = new SessionStore(storageOf())
    store.grant({ token: 'abc', user: null, expiresInMs: 10_000 })
    const notified = watch(store)
    store.dispose()
    vi.advanceTimersByTime(20_000)
    expect(notified()).toBe(0)
  })
})
