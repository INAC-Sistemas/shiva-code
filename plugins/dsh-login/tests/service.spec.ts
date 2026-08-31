import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, writeSession } from '../src/client/session.ts'
import type { StorageLike } from '../src/client/session.ts'
import { provideLoginSession } from '../src/client/service.ts'
import { SessionStore } from '../src/client/store.ts'
import type { ClientContext } from '../src/client/context-types.ts'
import type { LoginSessionContract } from '../src/client/contract.ts'

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
 * The browser's `storage` event, which Node's globalThis does not carry. The
 * client bundle only ever runs in a browser, so the plugin uses it unguarded.
 */
let handlers: Array<(event: { key: string | null }) => void>

beforeEach(() => {
  handlers = []
  const target = globalThis as unknown as Record<string, unknown>
  target['addEventListener'] = (name: string, fn: (event: { key: string | null }) => void) => {
    if (name === 'storage') handlers.push(fn)
  }
  target['removeEventListener'] = (name: string, fn: (event: { key: string | null }) => void) => {
    if (name !== 'storage') return
    const at = handlers.indexOf(fn)
    if (at >= 0) handlers.splice(at, 1)
  }
})

afterEach(() => {
  const target = globalThis as unknown as Record<string, unknown>
  delete target['addEventListener']
  delete target['removeEventListener']
})

/**
 * Mount the service on a real cordis context, awaiting activation — a fiber
 * publishes its services once it is active, not at the `plugin` call.
 * @param store - the session store to publish.
 * @returns the context and the disposer unmounting the plugin.
 */
async function mount(store: SessionStore): Promise<{ ctx: Context; dispose: () => Promise<void> }> {
  const ctx = new Context()
  const fiber = await ctx.plugin((scope: Context) => {
    provideLoginSession(scope as unknown as ClientContext, store)
  })
  return { ctx, dispose: async () => void await fiber.dispose() }
}

/**
 * Resolve the published service.
 * @param ctx - the context it was provided on.
 * @returns the service face.
 */
function service(ctx: Context): LoginSessionContract {
  const found = ctx.get('loginSession') as LoginSessionContract | undefined
  if (found === undefined) throw new Error('loginSession was not provided')
  return found
}

describe('provideLoginSession', () => {
  it('publishes the session as a service other plugins can inject', async () => {
    const store = new SessionStore(storageOf())
    const { ctx, dispose } = await mount(store)
    store.grant({ token: 'abc', user: { id: 7 }, expiresInMs: null })
    expect(service(ctx).token()).toBe('abc')
    expect(service(ctx).getSnapshot()).toEqual({ token: 'abc', user: { id: 7 }, expiresAt: null })
    await dispose()
  })

  it('relays store changes to a subscriber', async () => {
    const store = new SessionStore(storageOf())
    const { ctx, dispose } = await mount(store)
    let notified = 0
    service(ctx).subscribe(() => { notified += 1 })
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    expect(notified).toBe(1)
    await dispose()
  })

  it('ends the session through the contract', async () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const { ctx, dispose } = await mount(store)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    service(ctx).signOut()
    expect(store.getSnapshot()).toBeNull()
    expect(storage.value).toBeUndefined()
    await dispose()
  })

  it('adopts what another tab wrote, and ignores unrelated keys', async () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const { ctx, dispose } = await mount(store)
    writeSession(storage, { token: 'from-other-tab', user: null, expiresInMs: null }, Date.now())
    for (const fn of handlers) fn({ key: 'some-other-app' })
    expect(service(ctx).token()).toBeNull()
    for (const fn of handlers) fn({ key: STORAGE_KEY })
    expect(service(ctx).token()).toBe('from-other-tab')
    await dispose()
  })

  it('treats a null key as another tab clearing all storage', async () => {
    const storage = storageOf()
    const store = new SessionStore(storage)
    const { ctx, dispose } = await mount(store)
    store.grant({ token: 'abc', user: null, expiresInMs: null })
    storage.value = undefined
    for (const fn of handlers) fn({ key: null })
    expect(service(ctx).token()).toBeNull()
    await dispose()
  })

  it('withdraws the service and the listener when the plugin unloads', async () => {
    const store = new SessionStore(storageOf())
    const { ctx, dispose } = await mount(store)
    await dispose()
    expect(ctx.get('loginSession')).toBeUndefined()
    expect(handlers).toHaveLength(0)
  })
})
