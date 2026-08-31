import type { Context } from '@deepseek-ai/cordis'
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

/**
 * Mount the plugin with `config` over the schema defaults and hand back the
 * tool it registered.
 * @param config - the entry config as cordis.patch.yml would supply it.
 * @returns the registered tool.
 */
function mount(config: Record<string, unknown>): Registered {
  let registered: Registered | undefined
  const ctx = { tools: { register: (tool: Registered) => void (registered = tool) } }
  apply(ctx as unknown as Context, new Config({ endpoint: 'https://vps.example.com/status', ...config }))
  if (registered === undefined) throw new Error('the plugin registered no tool')
  return registered
}

/**
 * Answer the next request with `ANSWER` and capture the headers it carried.
 * @returns the captured headers, filled once the request is made.
 */
function captureHeaders(): Record<string, string> {
  const captured: Record<string, string> = {}
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    for (const [name, value] of Object.entries(init?.headers ?? {})) captured[name] = value as string
    return new Response(JSON.stringify(ANSWER), { headers: { 'content-type': 'application/json' } })
  })
  return captured
}

afterEach(() => void vi.restoreAllMocks())

describe('static headers', () => {
  it('sends a configured credential with the request', async () => {
    const headers = captureHeaders()
    await mount({ headers: { authorization: 'Bearer t0ken' } })
      .execute({}, { signal: new AbortController().signal })
    expect(headers['authorization']).toBe('Bearer t0ken')
  })

  it('applies its own accept last, so config cannot change the answer format', async () => {
    const headers = captureHeaders()
    await mount({ headers: { accept: 'text/html' } })
      .execute({}, { signal: new AbortController().signal })
    expect(headers['accept']).toBe('application/json')
  })

  it('sends only accept when none are configured', async () => {
    const headers = captureHeaders()
    await mount({}).execute({}, { signal: new AbortController().signal })
    expect(headers).toEqual({ accept: 'application/json' })
  })

  it('rejects a blank value at load rather than sending an anonymous request', () => {
    expect(() => mount({ headers: { authorization: '   ' } }))
      .toThrow(/header "authorization" has a blank value/)
  })

  it('rejects a name fetch could not send', () => {
    expect(() => mount({ headers: { 'x api key': 'k' } }))
      .toThrow(/"x api key" is not a valid header name/)
  })
})
