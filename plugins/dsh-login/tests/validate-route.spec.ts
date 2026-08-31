import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveValidateEndpoint, validateHandler, Config } from '../src/index.ts'
import { requestOf, responseOf } from './host-routes.ts'
import type { ValidateResult } from '../src/wire.ts'

const ENDPOINT = new URL('https://auth.example.com/api/auth/me')

/**
 * Drive one validation.
 * @param answer - what the login service replies, or a rejection.
 * @param options - the endpoint to use, the clock, and the config overrides.
 * @returns the parsed answer, and how many upstream calls were made.
 */
async function validate(
  answer: Response | Error,
  options: {
    endpoint?: URL | undefined
    now?: () => number
    config?: Record<string, unknown>
    headers?: Record<string, string>
    method?: string
    calls?: { count: number }
    handler?: (req: ReturnType<typeof requestOf>, res: ReturnType<typeof responseOf>) => Promise<void>
  } = {},
): Promise<ValidateResult & { status: number }> {
  const handler = options.handler ?? validateHandler(
    'endpoint' in options ? options.endpoint : ENDPOINT,
    new Config({ endpoint: 'https://auth.example.com/login', ...options.config }) as Required<Config>,
    options.now,
  )
  const response = responseOf()
  await handler(
    requestOf(options.method ?? 'GET', { authorization: 'Bearer t0ken', ...options.headers }),
    response,
  )
  if (response.written === undefined) throw new Error('the handler wrote nothing')
  return { ...response.written.body as ValidateResult, status: response.written.status }
}

/**
 * Answer every upstream check with `answer`, counting the calls.
 * @param answer - the reply, or an error to reject with.
 * @returns the call counter.
 */
function upstream(answer: Response | Error): { count: number } {
  const calls = { count: 0 }
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    calls.count += 1
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer.clone())
  })
  return calls
}

afterEach(() => void vi.restoreAllMocks())

describe('resolveValidateEndpoint', () => {
  it('treats an empty value as a service without the route', () => {
    expect(resolveValidateEndpoint('')).toBeUndefined()
    expect(resolveValidateEndpoint('   ')).toBeUndefined()
  })

  it('rejects a value that is not an absolute URL, at load', () => {
    expect(() => resolveValidateEndpoint('/api/auth/me'))
      .toThrow(/config.validateEndpoint is not an absolute URL/)
  })

  it('rejects a non-http scheme', () => {
    expect(() => resolveValidateEndpoint('ftp://auth.example.com/me')).toThrow(/must be http\(s\)/)
  })
})

describe('the validate route', () => {
  it('refuses a cross-site caller', async () => {
    upstream(new Response(null, { status: 200 }))
    const written = await validate(new Response(null), { headers: { 'sec-fetch-site': 'cross-site' } })
    expect(written.status).toBe(403)
    expect(written.ok).toBe(false)
  })

  it('refuses a method that is not a read', async () => {
    const written = await validate(new Response(null), { method: 'POST' })
    expect(written.status).toBe(405)
  })

  it('refuses a caller presenting no token', async () => {
    const written = await validate(new Response(null), { headers: { authorization: undefined as unknown as string } })
    expect(written.status).toBe(400)
  })

  it('accepts without asking when the service has no such route', async () => {
    const calls = upstream(new Response(null, { status: 401 }))
    const written = await validate(new Response(null), { endpoint: undefined })
    expect(written).toMatchObject({ ok: true })
    expect(calls.count).toBe(0)
  })

  it('forwards the caller\'s own bearer', async () => {
    upstream(new Response(null, { status: 200 }))
    await validate(new Response(null))
    const init = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]
    expect((init?.headers as Record<string, string>)['authorization']).toBe('Bearer t0ken')
  })

  it('passes a session the service still accepts', async () => {
    upstream(new Response(null, { status: 200 }))
    await expect(validate(new Response(null))).resolves.toMatchObject({ ok: true })
  })

  it.each([401, 403])('reports a refusal as rejected (%i)', async (status) => {
    upstream(new Response(null, { status }))
    await expect(validate(new Response(null))).resolves.toMatchObject({ ok: false, reason: 'rejected' })
  })

  it.each([500, 502, 404])('reports a fault as unreachable, never a refusal (%i)', async (status) => {
    upstream(new Response(null, { status }))
    await expect(validate(new Response(null))).resolves.toMatchObject({ ok: false, reason: 'unreachable' })
  })

  it('reports a dead connection as unreachable', async () => {
    upstream(new Error('ECONNREFUSED'))
    await expect(validate(new Response(null))).resolves.toMatchObject({ ok: false, reason: 'unreachable' })
  })
})

describe('the revalidation floor', () => {
  it('answers a repeat check of the same token without asking again', async () => {
    const calls = upstream(new Response(null, { status: 200 }))
    let clock = 0
    const handler = validateHandler(
      ENDPOINT,
      new Config({ endpoint: 'https://auth.example.com/login', revalidateIntervalMs: 1_000 }) as Required<Config>,
      () => clock,
    )
    await validate(new Response(null), { handler })
    clock = 999
    await expect(validate(new Response(null), { handler })).resolves.toMatchObject({ ok: true })
    expect(calls.count).toBe(1)
  })

  it('asks again once the window has passed', async () => {
    const calls = upstream(new Response(null, { status: 200 }))
    let clock = 0
    const handler = validateHandler(
      ENDPOINT,
      new Config({ endpoint: 'https://auth.example.com/login', revalidateIntervalMs: 1_000 }) as Required<Config>,
      () => clock,
    )
    await validate(new Response(null), { handler })
    clock = 1_000
    await validate(new Response(null), { handler })
    expect(calls.count).toBe(2)
  })

  it('never lets a memo answer for a different token', async () => {
    const calls = upstream(new Response(null, { status: 200 }))
    const handler = validateHandler(
      ENDPOINT,
      new Config({ endpoint: 'https://auth.example.com/login', revalidateIntervalMs: 1_000 }) as Required<Config>,
      () => 0,
    )
    await validate(new Response(null), { handler })
    await validate(new Response(null), { handler, headers: { authorization: 'Bearer other' } })
    expect(calls.count).toBe(2)
  })

  it('keeps passing a token revoked inside the window — the cost of the rate limit', async () => {
    let status = 200
    const calls = { count: 0 }
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      calls.count += 1
      return Promise.resolve(new Response(null, { status }))
    })
    let clock = 0
    const handler = validateHandler(
      ENDPOINT,
      new Config({ endpoint: 'https://auth.example.com/login', revalidateIntervalMs: 60_000 }) as Required<Config>,
      () => clock,
    )
    await validate(new Response(null), { handler })
    status = 401
    await expect(validate(new Response(null), { handler })).resolves.toMatchObject({ ok: true })
    expect(calls.count).toBe(1)
    // The window bounds how stale that answer can be.
    clock = 60_000
    await expect(validate(new Response(null), { handler }))
      .resolves.toMatchObject({ ok: false, reason: 'rejected' })
  })

  it('stops serving a memo once it has seen that token refused', async () => {
    let status = 200
    const calls = { count: 0 }
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      calls.count += 1
      return Promise.resolve(new Response(null, { status }))
    })
    let clock = 0
    const handler = validateHandler(
      ENDPOINT,
      new Config({ endpoint: 'https://auth.example.com/login', revalidateIntervalMs: 1_000 }) as Required<Config>,
      () => clock,
    )
    await validate(new Response(null), { handler })
    clock = 1_000
    status = 401
    await validate(new Response(null), { handler })
    // The memo is gone, so the very next check asks rather than replaying the pass.
    clock = 1_001
    await expect(validate(new Response(null), { handler }))
      .resolves.toMatchObject({ ok: false, reason: 'rejected' })
    expect(calls.count).toBe(3)
  })
})
