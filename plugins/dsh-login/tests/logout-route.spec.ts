import { afterEach, describe, expect, it, vi } from 'vitest'
import { Config, logoutHandler } from '../src/index.ts'
import { loginRecordKey, toGrantRecord } from '../src/vps-auth.ts'
import type { LoginCredentialStore } from '../src/vps-auth.ts'
import { contextOf, requestOf, responseOf, storeOf } from './host-routes.ts'
import type { FakeStore } from './host-routes.ts'
import type { AuthenticatedSession } from '../src/wire.ts'

const ENDPOINT = new URL('https://auth.example.com/logout')

/** The session the store starts out holding. */
const SESSION: AuthenticatedSession = { token: 't0ken', user: null, expiresInMs: null }

/**
 * Drive one sign-out.
 * @param store - the credential store the composition mounts, if any.
 * @param options - the upstream URL, the bearer presented, and the method.
 * @returns what the route answered.
 */
async function logout(
  store: LoginCredentialStore | undefined,
  options: { endpoint?: URL | undefined, headers?: Record<string, string>, method?: string } = {},
): Promise<{ status: number, body: unknown }> {
  const response = responseOf()
  await logoutHandler(
    contextOf(store),
    'endpoint' in options ? options.endpoint : ENDPOINT,
    new Config({ endpoint: 'https://auth.example.com/login' }) as Required<Config>,
  )(
    requestOf(options.method ?? 'POST', { authorization: 'Bearer t0ken', ...options.headers }),
    response,
  )
  if (response.written === undefined) throw new Error('the handler wrote nothing')
  return response.written
}

afterEach(() => void vi.restoreAllMocks())

describe('the host copy on sign-out', () => {
  it('is removed for the caller presenting its token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    const store = storeOf(toGrantRecord(SESSION, 0))
    await logout(store)
    expect(store.records.size).toBe(0)
  })

  it('is removed even when the service has no sign-out route', async () => {
    const calls = vi.spyOn(globalThis, 'fetch')
    const store = storeOf(toGrantRecord(SESSION, 0))
    const written = await logout(store, { endpoint: undefined })
    expect(written).toMatchObject({ status: 200, body: { ok: true } })
    expect(store.records.size).toBe(0)
    expect(calls).not.toHaveBeenCalled()
  })

  it('is removed even when the service refuses the sign-out', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    const store = storeOf(toGrantRecord(SESSION, 0))
    const written = await logout(store)
    expect(written.status).toBe(502)
    expect(store.records.size).toBe(0)
  })

  it('is removed even when the service cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const store = storeOf(toGrantRecord(SESSION, 0))
    await logout(store)
    expect(store.records.size).toBe(0)
  })

  it('is left alone for a caller presenting another token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    const store = storeOf(toGrantRecord(SESSION, 0))
    await logout(store, { headers: { authorization: 'Bearer someone-else' } })
    expect(store.records.get(loginRecordKey())).toBeDefined()
  })

  it('is untouched when the caller presents no token at all', async () => {
    const store: FakeStore = storeOf(toGrantRecord(SESSION, 0))
    const read = vi.spyOn(store, 'readRecord')
    const written = await logout(store, { headers: { authorization: undefined as unknown as string } })
    expect(written.status).toBe(400)
    expect(read).not.toHaveBeenCalled()
    expect(store.records.size).toBe(1)
  })

  it('does not fail the sign-out when the store refuses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    const store: FakeStore = storeOf(toGrantRecord(SESSION, 0))
    vi.spyOn(store, 'deleteRecord').mockRejectedValue(new Error('read-only'))
    const ctx = contextOf(store)
    const response = responseOf()
    await logoutHandler(ctx, ENDPOINT, new Config({ endpoint: 'https://x.example/login' }) as Required<Config>)(
      requestOf('POST', { authorization: 'Bearer t0ken' }),
      response,
    )
    expect(response.written).toMatchObject({ status: 200, body: { ok: true } })
    expect(ctx.logs.some(line => line.startsWith('warn'))).toBe(true)
  })

  it('is not reached at all by a cross-site caller', async () => {
    const store: FakeStore = storeOf(toGrantRecord(SESSION, 0))
    const read = vi.spyOn(store, 'readRecord')
    const written = await logout(store, { headers: { 'sec-fetch-site': 'cross-site' } })
    expect(written.status).toBe(403)
    expect(read).not.toHaveBeenCalled()
  })

  it('signs out cleanly in a composition with no credential store', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    await expect(logout(undefined)).resolves.toMatchObject({ status: 200, body: { ok: true } })
  })
})
