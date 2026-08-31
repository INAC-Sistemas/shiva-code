import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticateHandler, Config } from '../src/index.ts'
import { loginRecordKey, readGrantPayload } from '../src/vps-auth.ts'
import type { LoginCredentialStore } from '../src/vps-auth.ts'
import { contextOf, requestOf, responseOf, storeOf } from './host-routes.ts'
import type { FakeStore } from './host-routes.ts'

const ENDPOINT = new URL('https://auth.example.com/login')

/** Answer the upstream login call with `answer`. */
function upstream(answer: Response): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer)
}

/**
 * Drive one login attempt.
 * @param store - the credential store the composition mounts, if any.
 * @param config - config overrides on top of the schema defaults.
 * @returns what the route answered, and the store it wrote through.
 */
async function authenticate(
  store: LoginCredentialStore | undefined,
  config: Record<string, unknown> = {},
): Promise<{ status: number, body: unknown }> {
  const resolved = new Config({ endpoint: ENDPOINT.href, ...config }) as Required<Config>
  const response = responseOf()
  await authenticateHandler(contextOf(store), ENDPOINT, resolved)(
    requestOf('POST', {}, { identifier: 'ana@example.com', password: 'hunter2' }),
    response,
  )
  if (response.written === undefined) throw new Error('the handler wrote nothing')
  return response.written
}

afterEach(() => void vi.restoreAllMocks())

describe('a successful login', () => {
  it('records the granted session at this plugin\'s key', async () => {
    upstream(Response.json({ token: 't0ken', name: 'Ana' }))
    const store = storeOf()
    const written = await authenticate(store)
    expect(written.status).toBe(200)
    expect(readGrantPayload(store.records.get(loginRecordKey())))
      .toMatchObject({ token: 't0ken', user: { name: 'Ana' } })
  })

  it('stores no expiry when the session carries no lifetime', async () => {
    upstream(Response.json({ token: 't0ken' }))
    const store = storeOf()
    await authenticate(store, { sessionTtlMs: 0 })
    expect(readGrantPayload(store.records.get(loginRecordKey()))?.expiresAt).toBeNull()
  })

  it('stores an instant on the host clock for a configured lifetime', async () => {
    upstream(Response.json({ token: 't0ken' }))
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const store = storeOf()
    await authenticate(store, { sessionTtlMs: 500 })
    expect(readGrantPayload(store.records.get(loginRecordKey()))?.expiresAt).toBe(1_500)
  })

  it('writes the record before the browser is told', async () => {
    upstream(Response.json({ token: 't0ken' }))
    const order: string[] = []
    const store = storeOf()
    const write = store.modifyRecord.bind(store)
    vi.spyOn(store, 'modifyRecord').mockImplementation(async (key, mutate) => {
      await Promise.resolve()
      order.push('record')
      return await write(key, mutate)
    })
    const response = responseOf()
    const original = response.end.bind(response)
    vi.spyOn(response, 'end').mockImplementation((payload?: unknown) => {
      order.push('response')
      return original(payload as string)
    })
    await authenticateHandler(contextOf(store), ENDPOINT, new Config({ endpoint: ENDPOINT.href }) as Required<Config>)(
      requestOf('POST', {}, { identifier: 'a', password: 'b' }),
      response,
    )
    expect(order).toEqual(['record', 'response'])
  })
})

describe('a login the host cannot record', () => {
  it('fails the attempt rather than signing the browser in alone', async () => {
    upstream(Response.json({ token: 't0ken' }))
    const store: FakeStore = storeOf()
    vi.spyOn(store, 'modifyRecord').mockRejectedValue(new Error('disk is read-only'))
    const written = await authenticate(store)
    expect(written.status).toBe(500)
    expect(written.body).toMatchObject({ ok: false, error: { code: 'grant-storage' } })
  })

  it('never hands the browser a session it did not store', async () => {
    upstream(Response.json({ token: 't0ken' }))
    const store: FakeStore = storeOf()
    vi.spyOn(store, 'modifyRecord').mockRejectedValue(new Error('locked'))
    const written = await authenticate(store)
    expect(written.body).not.toHaveProperty('session')
  })

  it('names a composition with no credential store', async () => {
    upstream(Response.json({ token: 't0ken' }))
    const written = await authenticate(undefined)
    expect(written.status).toBe(500)
    expect(written.body).toMatchObject({ ok: false, error: { code: 'grant-storage' } })
    expect((written.body as { error: { message: string } }).error.message).toMatch(/no credential store/)
  })
})

describe('a login the service refused', () => {
  it.each([
    ['rejected credentials', Response.json({ message: 'nope' }, { status: 401 })],
    ['an answer without a token', Response.json({ name: 'Ana' })],
    ['an answer that is not JSON', new Response('<html/>', { status: 200 })],
  ])('stores nothing after %s', async (_label, answer) => {
    upstream(answer)
    const store = storeOf()
    const written = await authenticate(store)
    expect(written.status).not.toBe(200)
    expect(store.records.size).toBe(0)
  })

  it('stores nothing when the service cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const store = storeOf()
    const written = await authenticate(store)
    expect(written.body).toMatchObject({ ok: false, error: { code: 'unreachable' } })
    expect(store.records.size).toBe(0)
  })
})
