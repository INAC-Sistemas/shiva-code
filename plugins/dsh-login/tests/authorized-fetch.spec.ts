import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'
import { LoginSession, NoSessionError } from '../src/client/service.ts'
import { SessionStore } from '../src/client/store.ts'
import { LOGOUT_ROUTE } from '../src/wire.ts'

/** An in-memory Storage stand-in. */
function storageOf(): StorageLike & { value: string | undefined } {
  return {
    value: undefined,
    getItem(key) { return key === STORAGE_KEY && this.value !== undefined ? this.value : null },
    setItem(key, value) { if (key === STORAGE_KEY) this.value = value },
    removeItem(key) { if (key === STORAGE_KEY) this.value = undefined },
  }
}

/**
 * Build a signed-in session over in-memory storage.
 * @param token - the token the session holds.
 * @returns the store and the published service over it.
 */
function signedIn(token = 't0ken'): { store: SessionStore, session: LoginSession } {
  const store = new SessionStore(storageOf())
  store.grant({ token, user: { name: 'Ana' }, expiresInMs: null })
  return { store, session: new LoginSession(store) }
}

/**
 * Answer every request with `answer`, capturing what was sent.
 * @param answer - the reply, or an error to reject with.
 * @returns the captured requests.
 */
function capture(answer: Response | Error): Array<{ url: string, init: RequestInit }> {
  const calls: Array<{ url: string, init: RequestInit }> = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    calls.push({ url: String(url), init: init ?? {} })
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer.clone())
  })
  return calls
}

/**
 * Read the authorization header off a captured request.
 * @param init - the captured request options.
 * @returns the header value, or null.
 */
function authorizationOf(init: RequestInit): string | null {
  return new Headers(init.headers).get('authorization')
}

afterEach(() => void vi.restoreAllMocks())

describe('authorizedFetch', () => {
  it('attaches the session bearer', async () => {
    const calls = capture(new Response(null, { status: 200 }))
    const { session } = signedIn()
    await session.authorizedFetch('/api/thing')
    expect(authorizationOf(calls[0]!.init)).toBe('Bearer t0ken')
  })

  it('owns the authorization header, overriding what the caller passed', async () => {
    const calls = capture(new Response(null, { status: 200 }))
    const { session } = signedIn()
    await session.authorizedFetch('/api/thing', { headers: { authorization: 'Bearer forged' } })
    expect(authorizationOf(calls[0]!.init)).toBe('Bearer t0ken')
  })

  it('keeps the caller\'s other headers and options', async () => {
    const calls = capture(new Response(null, { status: 200 }))
    const { session } = signedIn()
    await session.authorizedFetch('/api/thing', { method: 'POST', headers: { 'x-trace': 'abc' } })
    expect(calls[0]!.init.method).toBe('POST')
    expect(new Headers(calls[0]!.init.headers).get('x-trace')).toBe('abc')
  })

  it('refuses before sending anything when nobody is signed in', async () => {
    const calls = capture(new Response(null, { status: 200 }))
    const session = new LoginSession(new SessionStore(storageOf()))
    await expect(session.authorizedFetch('/api/thing')).rejects.toBeInstanceOf(NoSessionError)
    expect(calls).toHaveLength(0)
  })

  it.each([401, 403])('returns to the gate when the API refuses the session (%i)', async (status) => {
    capture(new Response(null, { status }))
    const { store, session } = signedIn()
    const response = await session.authorizedFetch('/api/thing')
    expect(response.status).toBe(status)
    expect(store.getSnapshot()).toBeNull()
  })

  it('still hands the refusal back, so the caller decides what to render', async () => {
    capture(new Response('nope', { status: 401 }))
    const { session } = signedIn()
    await expect(session.authorizedFetch('/api/thing')).resolves.toMatchObject({ status: 401 })
  })

  it('tells the host to drop its copy, presenting the token that died', async () => {
    const calls = capture(new Response(null, { status: 401 }))
    const { session } = signedIn()
    await session.authorizedFetch('/api/thing')
    await Promise.resolve()
    const signOut = calls.find(call => call.url === LOGOUT_ROUTE)
    expect(signOut).toBeDefined()
    expect(authorizationOf(signOut!.init)).toBe('Bearer t0ken')
  })

  it.each([200, 404, 500])('leaves the session alone on any other status (%i)', async (status) => {
    capture(new Response(null, { status }))
    const { store, session } = signedIn()
    await session.authorizedFetch('/api/thing')
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('leaves the session alone when the network fails, and propagates the error', async () => {
    capture(new Error('offline'))
    const { store, session } = signedIn()
    await expect(session.authorizedFetch('/api/thing')).rejects.toThrow('offline')
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('does not end a newer session with a late refusal of the old token', async () => {
    const { store, session } = signedIn('old')
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      // The user signs in again while this request is in flight.
      store.grant({ token: 'new', user: null, expiresInMs: null })
      return Promise.resolve(new Response(null, { status: 401 }))
    })
    await session.authorizedFetch('/api/thing')
    expect(store.getSnapshot()?.token).toBe('new')
  })
})
