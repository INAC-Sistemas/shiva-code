import type { CredentialRecord } from '@deepseek-ai/dsh-credentials'
import { loginRecordKey, toGrantRecord } from 'dsh-login/vps-auth'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureHeaders, mount, storeOf } from './headers.spec.ts'

/** Run the tool once, whatever its outcome. */
const run = (tool: { execute: (a: unknown, e: { signal: AbortSignal }) => Promise<unknown> }): Promise<unknown> =>
  tool.execute({}, { signal: new AbortController().signal })

afterEach(() => void vi.restoreAllMocks())

describe('with no usable session', () => {
  it('tells the model to have the user sign in, and asks the endpoint nothing', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch')
    await expect(run(mount({}, storeOf(null)))).rejects.toThrow(/No one is signed in/)
    expect(fetched).not.toHaveBeenCalled()
  })

  it('names an expired session separately, so the user knows to sign in again', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch')
    const store = storeOf(null)
    store.records.set(loginRecordKey(), toGrantRecord({ token: 't', user: null, expiresInMs: 1 }, 0))
    await expect(run(mount({}, store))).rejects.toThrow(/session expired/)
    expect(fetched).not.toHaveBeenCalled()
  })

  it('names a record it cannot read', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch')
    const store = storeOf(null)
    store.records.set(loginRecordKey(), { kind: 'api-key', key: 'k' } as CredentialRecord)
    await expect(run(mount({}, store))).rejects.toThrow(/could not be read/)
    expect(fetched).not.toHaveBeenCalled()
  })

  it('names a composition with no credential store', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch')
    await expect(run(mount({}, null))).rejects.toThrow(/no credential store/)
    expect(fetched).not.toHaveBeenCalled()
  })

  it('tells the model not to retry, since retrying cannot help', async () => {
    await expect(run(mount({}, storeOf(null)))).rejects.toThrow(/Do not retry/)
  })
})

describe('when the endpoint rejects the session', () => {
  it.each([401, 403])('says so and stops, rather than reporting a plain failure (%i)', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }))
    await expect(run(mount({}))).rejects.toThrow(/rejected the signed-in session/)
  })

  it('leaves the stored session alone: a tool call is the wrong place to end one', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))
    const store = storeOf()
    await expect(run(mount({}, store))).rejects.toThrow()
    expect(store.records.get(loginRecordKey())).toBeDefined()
  })

  it('still reports an ordinary failure as one', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    await expect(run(mount({}))).rejects.toThrow(/answered 500/)
  })
})

describe('the credential is read once per call, never cached', () => {
  it('carries the new token after the user signs in again', async () => {
    const headers = captureHeaders()
    const store = storeOf('first')
    const tool = mount({}, store)
    await run(tool)
    expect(headers['authorization']).toBe('Bearer first')
    store.records.set(loginRecordKey(), toGrantRecord({ token: 'second', user: null, expiresInMs: null }, 0))
    await run(tool)
    expect(headers['authorization']).toBe('Bearer second')
  })

  it('refuses after a sign-out, without a restart', async () => {
    captureHeaders()
    const store = storeOf()
    const tool = mount({}, store)
    await run(tool)
    store.records.delete(loginRecordKey())
    await expect(run(tool)).rejects.toThrow(/No one is signed in/)
  })
})
