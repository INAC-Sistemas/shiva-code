import { describe, expect, it, vi } from 'vitest'
import { credentialKey, isCredentialKeySegment } from '@deepseek-ai/dsh-credentials'
import type { CredentialKey, CredentialRecord } from '@deepseek-ai/dsh-credentials'
import {
  LOGIN_RECORD_ID,
  LOGIN_RECORD_SCOPE,
  loginRecordKey,
  publishGrant,
  readGrantPayload,
  resolveLoginAuthorization,
  revokeGrant,
  toGrantRecord,
} from '../src/vps-auth.ts'
import type { LoginCredentialStore } from '../src/vps-auth.ts'
import type { AuthenticatedSession } from '../src/wire.ts'

/** One granted session as the authenticate route builds it. */
function sessionOf(overrides: Partial<AuthenticatedSession> = {}): AuthenticatedSession {
  return { token: 't0ken', user: { name: 'Ana' }, expiresInMs: null, ...overrides }
}

/** A credential store over a Map, exposing the three methods this module uses. */
interface FakeStore extends LoginCredentialStore {
  readonly records: Map<CredentialKey, CredentialRecord>
}

/**
 * Build a store holding at most one record at this plugin's key.
 * @param seed - the record to start with, if any.
 * @returns the store, with its map exposed for assertions.
 */
function storeOf(seed?: CredentialRecord): FakeStore {
  const records = new Map<CredentialKey, CredentialRecord>()
  if (seed !== undefined) records.set(loginRecordKey(), seed)
  return {
    records,
    readRecord(key) {
      return Promise.resolve(records.get(key))
    },
    async modifyRecord(key, mutate) {
      const next = await mutate(records.get(key))
      if (next !== undefined) records.set(key, next)
      return next
    },
    deleteRecord(key) {
      records.delete(key)
      return Promise.resolve()
    },
  }
}

describe('loginRecordKey', () => {
  it('addresses the record under this plugin\'s own registered name', () => {
    expect(loginRecordKey()).toBe(credentialKey('dsh-login', 'session'))
    expect(LOGIN_RECORD_SCOPE).toBe('dsh-login')
    expect(LOGIN_RECORD_ID).toBe('session')
  })

  it('uses segments the seam accepts', () => {
    expect(isCredentialKeySegment(LOGIN_RECORD_SCOPE)).toBe(true)
    expect(isCredentialKeySegment(LOGIN_RECORD_ID)).toBe(true)
  })
})

describe('toGrantRecord', () => {
  it('turns a relative lifetime into an instant on the host clock', () => {
    const record = toGrantRecord(sessionOf({ expiresInMs: 1_000 }), 5_000)
    expect(record).toEqual({ kind: 'grant', payload: { token: 't0ken', expiresAt: 6_000, user: { name: 'Ana' } } })
  })

  it('keeps a session without a lifetime unexpiring', () => {
    expect(readGrantPayload(toGrantRecord(sessionOf(), 5_000))?.expiresAt).toBeNull()
  })

  it('carries the rest of the answer verbatim', () => {
    const user = { name: 'Ana', roles: ['admin'] }
    expect(readGrantPayload(toGrantRecord(sessionOf({ user }), 0))?.user).toEqual(user)
  })

  it('survives the JSON round trip the seam requires of a payload', () => {
    const record = toGrantRecord(sessionOf({ expiresInMs: 10 }), 1)
    expect(JSON.parse(JSON.stringify(record)) as unknown).toEqual(record)
  })
})

describe('readGrantPayload', () => {
  it('reads a well-formed record', () => {
    const record: CredentialRecord = { kind: 'grant', payload: { token: 't', expiresAt: null, user: null } }
    expect(readGrantPayload(record)).toEqual({ token: 't', expiresAt: null, user: null })
  })

  it.each([
    ['nothing stored', undefined],
    ['a record another writer owns', { kind: 'api-key', key: 'k' }],
    ['a payload that is not an object', { kind: 'grant', payload: 'token' }],
    ['a null payload', { kind: 'grant', payload: null }],
    ['a missing token', { kind: 'grant', payload: { expiresAt: null } }],
    ['a blank token', { kind: 'grant', payload: { token: '', expiresAt: null } }],
    ['a non-string token', { kind: 'grant', payload: { token: 7, expiresAt: null } }],
    ['an expiry that is neither number nor null', { kind: 'grant', payload: { token: 't', expiresAt: 'soon' } }],
  ])('reads %s as nothing', (_label, record) => {
    expect(readGrantPayload(record as CredentialRecord | undefined)).toBeUndefined()
  })
})

describe('resolveLoginAuthorization', () => {
  it('names a composition with no credential store', async () => {
    await expect(resolveLoginAuthorization(undefined, 0)).resolves.toMatchObject({ ok: false, reason: 'no-store' })
  })

  it('names an empty store', async () => {
    await expect(resolveLoginAuthorization(storeOf(), 0)).resolves.toMatchObject({ ok: false, reason: 'absent' })
  })

  it('names a record it cannot read', async () => {
    const store = storeOf({ kind: 'api-key', key: 'k' })
    await expect(resolveLoginAuthorization(store, 0)).resolves.toMatchObject({ ok: false, reason: 'malformed' })
  })

  it('builds the bearer for a live session', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(resolveLoginAuthorization(store, 0))
      .resolves.toEqual({ ok: true, authorization: 'Bearer t0ken', expiresAt: null })
  })

  it('treats the expiry instant itself as over, like the browser does', async () => {
    const store = storeOf(toGrantRecord(sessionOf({ expiresInMs: 100 }), 0))
    await expect(resolveLoginAuthorization(store, 99)).resolves.toMatchObject({ ok: true })
    await expect(resolveLoginAuthorization(store, 100)).resolves.toMatchObject({ ok: false, reason: 'expired' })
    await expect(resolveLoginAuthorization(store, 101)).resolves.toMatchObject({ ok: false, reason: 'expired' })
  })

  it('never expires a session that carries no lifetime', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(resolveLoginAuthorization(store, Number.MAX_SAFE_INTEGER)).resolves.toMatchObject({ ok: true })
  })
})

describe('publishGrant', () => {
  it('writes the record at this plugin\'s key', async () => {
    const store = storeOf()
    await publishGrant(store, sessionOf(), 0)
    expect(store.records.get(loginRecordKey())).toEqual(toGrantRecord(sessionOf(), 0))
  })

  it('replaces a previous grant rather than merging with it', async () => {
    const store = storeOf(toGrantRecord(sessionOf({ token: 'old', expiresInMs: 5 }), 0))
    await publishGrant(store, sessionOf({ token: 'new' }), 0)
    expect(readGrantPayload(store.records.get(loginRecordKey())))
      .toEqual({ token: 'new', expiresAt: null, user: { name: 'Ana' } })
  })

  it('goes through modifyRecord, the seam\'s only write path', async () => {
    const store = storeOf()
    const modify = vi.spyOn(store, 'modifyRecord')
    await publishGrant(store, sessionOf(), 0)
    expect(modify).toHaveBeenCalledOnce()
    expect(modify.mock.calls[0]?.[0]).toBe(loginRecordKey())
  })
})

describe('revokeGrant', () => {
  it('removes the record for the caller that presents its token', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(revokeGrant(store, 'Bearer t0ken')).resolves.toBe(true)
    expect(store.records.size).toBe(0)
  })

  it('accepts the bare token as well as the Bearer form', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(revokeGrant(store, 't0ken')).resolves.toBe(true)
  })

  it('leaves the record alone for a caller presenting another token', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(revokeGrant(store, 'Bearer someone-else')).resolves.toBe(false)
    expect(store.records.size).toBe(1)
  })

  it('does nothing when there is no record', async () => {
    const store = storeOf()
    await expect(revokeGrant(store, 'Bearer t0ken')).resolves.toBe(false)
  })

  it('does nothing for a blank bearer', async () => {
    const store = storeOf(toGrantRecord(sessionOf(), 0))
    await expect(revokeGrant(store, 'Bearer    ')).resolves.toBe(false)
    expect(store.records.size).toBe(1)
  })
})
