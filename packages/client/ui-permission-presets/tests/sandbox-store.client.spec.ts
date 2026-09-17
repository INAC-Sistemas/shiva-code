import { describe, expect, it, vi } from 'vitest'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { SettingsDescribeMirror } from '@deepseek-ai/dsh-client-ui-settings/src/client/settings-mirror.ts'
import {
  SANDBOX_SETTINGS_NS, SandboxSettingsController, sandboxEnabledOf,
} from '../src/client/sandbox-store.ts'

const SCHEMA = {
  uid: 2,
  refs: {
    1: { type: 'boolean' },
    2: { type: 'object', dict: { enabled: 1 } },
  },
}

function view(enabled: boolean, revision = 0): SettingsNamespaceView {
  return {
    ns: SANDBOX_SETTINGS_NS,
    schema: SCHEMA,
    value: { enabled },
    base: { enabled: true },
    applies: 'live',
    secrets: [],
    revision,
  }
}

function ok<T>(value: T) {
  return { rpcId: 'test', result: { ok: true as const, value } }
}

function sandboxController(api: object) {
  const wire = { settings: api } as never
  const mirror = new SettingsDescribeMirror(wire)
  return { mirror, controller: new SandboxSettingsController(mirror, wire) }
}

describe('sandbox settings store', () => {
  it('reads the host enabled boolean and rejects a missing value', () => {
    expect(sandboxEnabledOf(view(true))).toBe(true)
    expect(sandboxEnabledOf(view(false))).toBe(false)
    expect(() => sandboxEnabledOf({ ...view(true), value: {} })).toThrow(/no enabled value/)
  })

  it('loads and writes enabled with optimistic concurrency', async () => {
    const describe = vi.fn(() => Promise.resolve(ok({
      writable: true,
      hasDocument: false,
      namespaces: [view(true, 4)],
    })))
    const mutate = vi.fn(() => Promise.resolve(ok(view(false, 5))))
    const { controller } = sandboxController({ describe, mutate })
    await controller.load()
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'ready',
      writable: true,
      enabled: true,
      revision: 4,
    })
    await controller.setEnabled(false)
    expect(mutate).toHaveBeenCalledWith({
      ns: SANDBOX_SETTINGS_NS,
      ops: [{ op: 'set', path: ['enabled'], value: false }],
      expectedRevision: 4,
    })
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'ready',
      enabled: false,
      revision: 5,
    })
    expect(describe).toHaveBeenCalledTimes(1)
  })

  it('hides the row when the namespace is absent and contains write failures', async () => {
    const { controller } = sandboxController({
      describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [] })),
      mutate: vi.fn(),
    })
    await controller.load()
    expect(controller.store.getSnapshot().status).toBe('unavailable')

    const failing = sandboxController({
      describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
      mutate: () => Promise.resolve({
        rpcId: 'test',
        result: {
          ok: false as const,
          error: { code: 'settings-conflict', message: 'stale', details: {} },
        },
      }),
    }).controller
    await failing.load()
    await failing.setEnabled(false)
    expect(failing.store.getSnapshot()).toMatchObject({ status: 'error', error: 'stale' })

    const malformed = sandboxController({
      describe: () => Promise.resolve(ok({
        writable: true, hasDocument: false, namespaces: [{ ...view(true), value: {} }],
      })),
      mutate: vi.fn(),
    }).controller
    await malformed.load()
    expect(malformed.store.getSnapshot()).toMatchObject({
      status: 'error',
      error: 'sandbox settings has no enabled value',
    })

    const rejectedWrite = sandboxController({
      describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
      mutate: () => Promise.reject('wire down'),
    }).controller
    await rejectedWrite.load()
    await rejectedWrite.setEnabled(false)
    expect(rejectedWrite.store.getSnapshot()).toMatchObject({ status: 'error', error: 'wire down' })
  })

  it('contains read failures and no-ops without a writable view', async () => {
    const mutate = vi.fn()
    const readOnly = sandboxController({
      describe: () => Promise.resolve(ok({
        writable: false, hasDocument: false, namespaces: [view(true, 2)],
      })),
      mutate,
    }).controller
    await readOnly.load()
    expect(readOnly.store.getSnapshot()).toMatchObject({
      enabled: true,
      writable: false,
      revision: 2,
    })
    await readOnly.setEnabled(false)
    expect(mutate).not.toHaveBeenCalled()

    const rejected = sandboxController({
      describe: () => Promise.resolve({
        rpcId: 'test',
        result: { ok: false as const, error: { code: 'internal', message: 'offline', details: {} } },
      }),
      mutate,
    }).controller
    await rejected.setEnabled(false)
    await rejected.load()
    expect(rejected.store.getSnapshot()).toMatchObject({ status: 'error', error: 'offline' })
    expect(mutate).not.toHaveBeenCalled()

    const thrown = sandboxController({
      describe: async () => { throw 'disconnected' },
      mutate,
    }).controller
    await thrown.load()
    expect(thrown.store.getSnapshot()).toMatchObject({ status: 'error', error: 'disconnected' })
  })

  it('hides the row in a remote browser instead of loading forever', async () => {
    const describeCall = vi.fn()
    const mutate = vi.fn()
    const wire = { settings: { describe: describeCall, mutate } } as never
    const mirror = new SettingsDescribeMirror(wire, 'memory')
    const controller = new SandboxSettingsController(mirror, wire)
    await controller.load()
    expect(controller.store.getSnapshot().status).toBe('unavailable')
    await controller.setEnabled(false)
    expect(describeCall).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('follows a mirror refresh without an own read once loaded', async () => {
    const describe = vi.fn()
      .mockResolvedValueOnce(ok({ writable: true, hasDocument: false, namespaces: [view(true, 1)] }))
      .mockResolvedValueOnce(ok({ writable: true, hasDocument: false, namespaces: [view(false, 2)] }))
    const { mirror, controller } = sandboxController({ describe, mutate: vi.fn() })
    await controller.load()
    expect(controller.store.getSnapshot()).toMatchObject({ enabled: true })
    await mirror.load()
    expect(controller.store.getSnapshot()).toMatchObject({ enabled: false, revision: 2 })
  })

  it('disposal stops deriving and suppresses in-flight writes', async () => {
    const neverRead = vi.fn()
    const { controller: neverLoaded } = sandboxController({ describe: neverRead, mutate: vi.fn() })
    neverLoaded.dispose()
    await neverLoaded.load()
    expect(neverLoaded.store.getSnapshot().status).toBe('idle')
    expect(neverRead).not.toHaveBeenCalled()

    const read = Promise.withResolvers<ReturnType<typeof ok<{
      writable: boolean
      namespaces: SettingsNamespaceView[]
    }>>>()
    const { mirror, controller: idle } = sandboxController({ describe: () => read.promise, mutate: vi.fn() })
    const loading = idle.load()
    idle.dispose()
    read.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] }))
    await Promise.all([loading, mirror.load()])
    expect(idle.store.getSnapshot().status).toBe('loading')

    const mutation = Promise.withResolvers<ReturnType<typeof ok<SettingsNamespaceView>>>()
    const { controller: active } = sandboxController({
      describe: () => Promise.resolve(ok({
        writable: true,
        hasDocument: false,
        namespaces: [view(true)],
      })),
      mutate: () => mutation.promise,
    })
    await active.load()
    const saving = active.setEnabled(false)
    active.dispose()
    mutation.resolve(ok(view(false, 1)))
    await saving
    expect(active.store.getSnapshot().status).toBe('saving')

    const rejectedMutation = Promise.withResolvers<ReturnType<typeof ok<SettingsNamespaceView>>>()
    const { controller: disposedWrite } = sandboxController({
      describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
      mutate: () => rejectedMutation.promise,
    })
    await disposedWrite.load()
    const writing = disposedWrite.setEnabled(false)
    disposedWrite.dispose()
    rejectedMutation.reject(new Error('late write'))
    await writing
    expect(disposedWrite.store.getSnapshot().status).toBe('saving')
  })
})
