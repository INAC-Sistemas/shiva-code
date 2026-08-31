import { describe, expect, it } from 'vitest'
import { clearSession, readSession, STORAGE_KEY, writeSession } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'

/** An in-memory Storage stand-in; `fail` makes every access throw, as a blocked browser does. */
function storageOf(initial?: string, fail = false): StorageLike & { value: string | undefined } {
  return {
    value: initial,
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

describe('readSession', () => {
  it('reads back what writeSession stored', () => {
    const storage = storageOf()
    writeSession(storage, { token: 'abc', user: { id: 7 }, expiresInMs: null }, 1_000)
    expect(readSession(storage, 2_000)).toEqual({ token: 'abc', user: { id: 7 }, expiresAt: null })
  })

  it('turns a lifetime into an instant on the browser clock', () => {
    const storage = storageOf()
    expect(writeSession(storage, { token: 'abc', user: null, expiresInMs: 60_000 }, 1_000).expiresAt)
      .toBe(61_000)
  })

  it('drops an expired session and forgets it', () => {
    const storage = storageOf()
    writeSession(storage, { token: 'abc', user: null, expiresInMs: 60_000 }, 1_000)
    expect(readSession(storage, 61_000)).toBeNull()
    expect(storage.value).toBeUndefined()
  })

  it('keeps a session that has not run out yet', () => {
    const storage = storageOf()
    writeSession(storage, { token: 'abc', user: null, expiresInMs: 60_000 }, 1_000)
    expect(readSession(storage, 60_999)).not.toBeNull()
  })

  it('drops a row this version cannot read', () => {
    const storage = storageOf(JSON.stringify({ token: 42 }))
    expect(readSession(storage, 0)).toBeNull()
    expect(storage.value).toBeUndefined()
  })

  it('drops a row that is not JSON', () => {
    expect(readSession(storageOf('{'), 0)).toBeNull()
  })

  it('gates when there is no storage at all', () => {
    expect(readSession(undefined, 0)).toBeNull()
  })

  it('gates when the browser blocks storage access', () => {
    expect(readSession(storageOf(undefined, true), 0)).toBeNull()
  })
})

describe('writeSession', () => {
  it('still returns the session when the browser refuses to persist it', () => {
    expect(writeSession(storageOf(undefined, true), { token: 'abc', user: null, expiresInMs: null }, 0))
      .toMatchObject({ token: 'abc' })
  })
})

describe('clearSession', () => {
  it('signs the browser out', () => {
    const storage = storageOf()
    writeSession(storage, { token: 'abc', user: null, expiresInMs: null }, 0)
    clearSession(storage)
    expect(readSession(storage, 0)).toBeNull()
  })

  it('is a no-op without storage', () => {
    expect(() => clearSession(undefined)).not.toThrow()
  })
})
