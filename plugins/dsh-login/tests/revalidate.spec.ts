// @vitest-environment jsdom
// The boot and focus triggers register real `window` listeners, so this suite
// needs a DOM; the rest of the plugin's specs stay on the node lane.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { provideLoginSession, LoginSession } from '../src/client/service.ts'
import { STORAGE_KEY } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'
import { SessionStore } from '../src/client/store.ts'
import { VALIDATE_ROUTE } from '../src/wire.ts'
import type { ClientContext } from '../src/client/context-types.ts'
import type { ValidateResult } from '../src/wire.ts'

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
 * @returns the store and the service over it.
 */
function signedIn(token = 't0ken'): { store: SessionStore, session: LoginSession } {
  const store = new SessionStore(storageOf())
  store.grant({ token, user: null, expiresInMs: null })
  return { store, session: new LoginSession(store) }
}

/**
 * Answer every validation with `result`, counting the checks.
 * @param result - what the host route replies, or an error to reject with.
 * @returns the count of validate calls.
 */
function answerValidate(result: ValidateResult | Error): { count: number } {
  const calls = { count: 0 }
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (String(url) !== VALIDATE_ROUTE) return Promise.resolve(Response.json({ ok: true }))
    calls.count += 1
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(Response.json(result))
  })
  return calls
}

afterEach(() => void vi.restoreAllMocks())

describe('revalidate', () => {
  it('does not ask when nobody is signed in', async () => {
    const calls = answerValidate({ ok: true })
    const session = new LoginSession(new SessionStore(storageOf()))
    await expect(session.revalidate()).resolves.toBe(false)
    expect(calls.count).toBe(0)
  })

  it('keeps a session the service still accepts', async () => {
    answerValidate({ ok: true })
    const { store, session } = signedIn()
    await expect(session.revalidate()).resolves.toBe(true)
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('returns to the gate when the service refuses the token', async () => {
    answerValidate({ ok: false, reason: 'rejected' })
    const { store, session } = signedIn()
    await expect(session.revalidate()).resolves.toBe(false)
    expect(store.getSnapshot()).toBeNull()
  })

  it('keeps the session when the service is merely unreachable', async () => {
    answerValidate({ ok: false, reason: 'unreachable' })
    const { store, session } = signedIn()
    await expect(session.revalidate()).resolves.toBe(true)
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('keeps the session when the route itself is dead', async () => {
    answerValidate(new Error('offline'))
    const { store, session } = signedIn()
    await expect(session.revalidate()).resolves.toBe(true)
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('keeps the session when the answer is not the shape it expects', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html/>', { status: 200 }))
    const { store, session } = signedIn()
    await expect(session.revalidate()).resolves.toBe(true)
    expect(store.getSnapshot()).not.toBeNull()
  })

  it('does not end a newer session with a late refusal of the old token', async () => {
    const { store, session } = signedIn('old')
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      store.grant({ token: 'new', user: null, expiresInMs: null })
      return Promise.resolve(Response.json({ ok: false, reason: 'rejected' } satisfies ValidateResult))
    })
    await expect(session.revalidate()).resolves.toBe(true)
    expect(store.getSnapshot()?.token).toBe('new')
  })
})

/** Contexts still holding listeners on the shared jsdom window. */
const mounted: Array<() => void> = []

/**
 * A client context that records its effect disposers.
 *
 * Every context is torn down after its test: the listeners land on one shared
 * `window`, so a context left mounted would answer the next test's events too.
 * @returns the context, with an explicit disposer.
 */
function contextOf(): ClientContext & { dispose: () => void } {
  const disposers: Array<() => void> = []
  const dispose = (): void => {
    for (const off of disposers.splice(0)) off()
  }
  mounted.push(dispose)
  return {
    slots: { register: () => () => {}, inject: () => () => {} },
    provide: () => {},
    effect: (fn: () => () => void) => void disposers.push(fn()),
    dispose,
  } as unknown as ClientContext & { dispose: () => void }
}

afterEach(() => {
  for (const dispose of mounted.splice(0)) dispose()
})

describe('the boot and focus triggers', () => {
  it('checks the stored session once on boot', async () => {
    const calls = answerValidate({ ok: true })
    const store = new SessionStore(storageOf())
    store.grant({ token: 't0ken', user: null, expiresInMs: null })
    provideLoginSession(contextOf(), store)
    await vi.waitFor(() => expect(calls.count).toBe(1))
  })

  it('does not check on boot when nobody is signed in', async () => {
    const calls = answerValidate({ ok: true })
    provideLoginSession(contextOf(), new SessionStore(storageOf()))
    await Promise.resolve()
    expect(calls.count).toBe(0)
  })

  it('checks again when the tab regains focus', async () => {
    const calls = answerValidate({ ok: true })
    const store = new SessionStore(storageOf())
    store.grant({ token: 't0ken', user: null, expiresInMs: null })
    provideLoginSession(contextOf(), store)
    await vi.waitFor(() => expect(calls.count).toBe(1))
    globalThis.dispatchEvent(new Event('focus'))
    await vi.waitFor(() => expect(calls.count).toBe(2))
  })

  it('stops checking once the plugin is unloaded', async () => {
    const calls = answerValidate({ ok: true })
    const store = new SessionStore(storageOf())
    store.grant({ token: 't0ken', user: null, expiresInMs: null })
    const ctx = contextOf()
    provideLoginSession(ctx, store)
    await vi.waitFor(() => expect(calls.count).toBe(1))
    ctx.dispose()
    globalThis.dispatchEvent(new Event('focus'))
    await Promise.resolve()
    expect(calls.count).toBe(1)
  })
})
