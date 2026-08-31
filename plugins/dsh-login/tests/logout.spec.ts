import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLogoutEndpoint } from '../src/config.ts'
import { STORAGE_KEY } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'
import { LoginSession } from '../src/client/service.ts'
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
 * Capture the sign-out request the browser makes.
 * @param answer - what the host route replies.
 * @returns the captured requests.
 */
function captureLogout(answer: Response = Response.json({ ok: true })): Array<{ url: string; init: RequestInit }> {
  const calls: Array<{ url: string; init: RequestInit }> = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} })
    return answer
  })
  return calls
}

afterEach(() => void vi.restoreAllMocks())

describe('resolveLogoutEndpoint', () => {
  it('treats an empty value as a service without a sign-out route', () => {
    expect(resolveLogoutEndpoint('')).toBeUndefined()
    expect(resolveLogoutEndpoint('   ')).toBeUndefined()
  })

  it('parses a configured URL', () => {
    expect(resolveLogoutEndpoint('https://auth.example.com/logout')?.href)
      .toBe('https://auth.example.com/logout')
  })

  it('rejects a value that is not an absolute URL, at load', () => {
    expect(() => resolveLogoutEndpoint('/api/auth/logout'))
      .toThrow(/config.logoutEndpoint is not an absolute URL/)
  })

  it('rejects a non-http scheme', () => {
    expect(() => resolveLogoutEndpoint('ftp://auth.example.com/logout'))
      .toThrow(/must be http\(s\)/)
  })
})

describe('LoginSession.signOut', () => {
  it('forwards the retired token to the host route', async () => {
    const calls = captureLogout()
    const store = new SessionStore(storageOf())
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    await new LoginSession(store).signOut()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(LOGOUT_ROUTE)
    expect(calls[0]?.init.method).toBe('POST')
    expect((calls[0]?.init.headers as Record<string, string>)['authorization']).toBe('Bearer abc')
  })

  it('clears the browser before the service answers, so a refusal cannot trap anyone', async () => {
    captureLogout(Response.json({ ok: false, message: 'nope' }, { status: 502 }))
    const storage = storageOf()
    const store = new SessionStore(storage)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    const settled = new LoginSession(store).signOut()
    // Not awaited yet: the local half already happened.
    expect(store.getSnapshot()).toBeNull()
    expect(storage.value).toBeUndefined()
    expect(await settled).toEqual({ ok: false, message: 'nope' })
  })

  it('reports an unreachable app without rejecting', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'))
    const store = new SessionStore(storageOf())
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    await expect(new LoginSession(store).signOut()).resolves.toEqual({
      ok: false,
      message: 'The app could not be reached.',
    })
    expect(store.getSnapshot()).toBeNull()
  })

  it('calls nothing when nobody is signed in', async () => {
    const calls = captureLogout()
    await expect(new LoginSession(new SessionStore(storageOf())).signOut()).resolves.toEqual({ ok: true })
    expect(calls).toHaveLength(0)
  })

  it('reports an answer that is not a result body', async () => {
    captureLogout(new Response('<html>gateway</html>', { status: 500 }))
    const store = new SessionStore(storageOf())
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    expect(await new LoginSession(store).signOut()).toEqual({
      ok: false,
      message: 'Unexpected answer from the app (500).',
    })
  })
})
