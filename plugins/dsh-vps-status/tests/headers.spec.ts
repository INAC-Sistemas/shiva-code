import type { Context } from '@deepseek-ai/cordis'
import type { CredentialKey, CredentialRecord } from '@deepseek-ai/dsh-credentials'
import { loginRecordKey, toGrantRecord } from 'dsh-login/vps-auth'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, Config } from '../src/index.ts'

const GIB = 1024 ** 3

/** A well-formed endpoint answer, so `execute` reaches its parse step. */
const ANSWER = {
  disk: { totalBytes: 50 * GIB, usedBytes: 25 * GIB },
  memory: { totalBytes: 8 * GIB, usedBytes: 3 * GIB },
}

/** The registered tool, minus the parts this suite does not drive. */
interface Registered {
  execute: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown>
}

/** A credential store holding at most the login session record. */
export interface FakeStore {
  readRecord: (key: CredentialKey) => Promise<CredentialRecord | undefined>
  readonly records: Map<CredentialKey, CredentialRecord>
}

/**
 * Build a credential store seeded with a session for `token`.
 *
 * `null` — not `undefined` — means nobody is signed in: an explicit `undefined`
 * argument selects a default parameter, which would quietly seed a session in
 * exactly the tests that mean to assert there is none.
 * @param token - the signed-in token, or null for an empty store.
 * @returns the store, with its map exposed so a test can change it mid-flight.
 */
export function storeOf(token: string | null = 't0ken'): FakeStore {
  const records = new Map<CredentialKey, CredentialRecord>()
  if (token !== null) {
    records.set(loginRecordKey(), toGrantRecord({ token, user: null, expiresInMs: null }, 0))
  }
  return { records, readRecord: key => Promise.resolve(records.get(key)) }
}

/**
 * Mount the plugin with `config` over the schema defaults and hand back the
 * tool it registered.
 * @param config - the entry config as cordis.patch.yml would supply it.
 * @param store - the credential store the composition mounts, or null for one that mounts none.
 * @returns the registered tool.
 */
export function mount(config: Record<string, unknown>, store: FakeStore | null = storeOf()): Registered {
  let registered: Registered | undefined
  const ctx = {
    tools: { register: (tool: Registered) => void (registered = tool) },
    get: (name: string) => (name === 'credentials' && store !== null ? store : undefined),
  }
  apply(ctx as unknown as Context, new Config({ endpoint: 'https://vps.example.com/status', ...config }))
  if (registered === undefined) throw new Error('the plugin registered no tool')
  return registered
}

/**
 * Answer the next request with `ANSWER` and capture the headers it carried.
 * @returns the captured headers, filled once the request is made.
 */
export function captureHeaders(): Record<string, string> {
  const captured: Record<string, string> = {}
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    for (const [name, value] of Object.entries(init?.headers ?? {})) captured[name] = value as string
    return new Response(JSON.stringify(ANSWER), { headers: { 'content-type': 'application/json' } })
  })
  return captured
}

afterEach(() => void vi.restoreAllMocks())

describe('request headers', () => {
  it('authenticates as the signed-in user', async () => {
    const headers = captureHeaders()
    await mount({}).execute({}, { signal: new AbortController().signal })
    expect(headers['authorization']).toBe('Bearer t0ken')
  })

  it('applies its own accept last, so config cannot change the answer format', async () => {
    const headers = captureHeaders()
    await mount({ headers: { accept: 'text/html' } })
      .execute({}, { signal: new AbortController().signal })
    expect(headers['accept']).toBe('application/json')
  })

  it('sends the configured headers alongside the credential', async () => {
    const headers = captureHeaders()
    await mount({ headers: { 'x-tenant': 'acme' } })
      .execute({}, { signal: new AbortController().signal })
    expect(headers).toEqual({ 'x-tenant': 'acme', authorization: 'Bearer t0ken', accept: 'application/json' })
  })

  it('rejects a configured authorization at load, so a stale token cannot shadow the session', () => {
    expect(() => mount({ headers: { authorization: 'Bearer leftover' } }))
      .toThrow(/must not set "authorization"/)
  })

  it('rejects it whatever the case, since header names are case-insensitive', () => {
    expect(() => mount({ headers: { Authorization: 'Bearer leftover' } }))
      .toThrow(/must not set "authorization"/)
  })

  it('rejects a blank value at load rather than sending an anonymous request', () => {
    expect(() => mount({ headers: { 'x-tenant': '   ' } }))
      .toThrow(/header "x-tenant" has a blank value/)
  })

  it('rejects a name fetch could not send', () => {
    expect(() => mount({ headers: { 'x api key': 'k' } }))
      .toThrow(/"x api key" is not a valid header name/)
  })
})
