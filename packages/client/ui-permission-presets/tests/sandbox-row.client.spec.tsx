// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { SandboxRow, type SandboxRowProps } from '../src/client/SandboxRow.tsx'
import { sandboxEn } from '../src/client/locales.ts'
import { SandboxSettingsController } from '../src/client/sandbox-store.ts'
import { SettingsDescribeMirror } from '@deepseek-ai/dsh-client-ui-settings/src/client/settings-mirror.ts'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'

afterEach(cleanup)

const SCHEMA = {
  uid: 2,
  refs: {
    1: { type: 'boolean' },
    2: { type: 'object', dict: { enabled: 1 } },
  },
}

function view(enabled: boolean, revision = 0): SettingsNamespaceView {
  return {
    ns: 'sandbox',
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

function derivedController(api: { settings: object }) {
  const wire = api as never
  return new SandboxSettingsController(new SettingsDescribeMirror(wire), wire)
}

const dictionary: Record<string, string> = sandboxEn
const t: SandboxRowProps['t'] = key => dictionary[key] ?? key
const runtime = {
  useSessions: (() => { throw new Error('unused') }) as never,
  useWorkspaces: (() => { throw new Error('unused') }) as never,
}

function mount(controller: SandboxSettingsController) {
  return render(
    <SandboxRow
      {...runtime}
      load={() => controller.load()}
      setEnabled={enabled => controller.setEnabled(enabled)}
      useSandbox={bindSnapshotSelector(controller.store)}
      t={t}
    />,
  )
}

describe('SandboxRow', () => {
  it('loads the descriptor and toggles the process-wide kill switch', async () => {
    const mutate = vi.fn(() => Promise.resolve(ok(view(false, 1))))
    const controller = derivedController({
      settings: {
        describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
        mutate,
      },
    })
    mount(controller)
    const toggle = await screen.findByRole('switch', { name: 'File sandbox' })
    expect((toggle as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('On')).toBeTruthy()
    expect(screen.getByText('Sessions follow their permission mode for file access')).toBeTruthy()
    fireEvent.click(toggle)
    await waitFor(() => { expect(mutate).toHaveBeenCalledOnce() })
    expect(mutate).toHaveBeenCalledWith({
      ns: 'sandbox',
      ops: [{ op: 'set', path: ['enabled'], value: false }],
      expectedRevision: 0,
    })
    await screen.findByText('Sandbox off globally: every session, open ones included, has Full access')
    expect(screen.getByText('Off')).toBeTruthy()
  })

  it('ignores a no-op change and hides an unavailable namespace', async () => {
    const mutate = vi.fn(() => Promise.resolve(ok(view(true, 1))))
    const controller = derivedController({
      settings: {
        describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
        mutate,
      },
    })
    mount(controller)
    const toggle = await screen.findByRole('switch', { name: 'File sandbox' })
    fireEvent.change(toggle, { target: { checked: true } })
    expect(mutate).not.toHaveBeenCalled()

    const absent = derivedController({
      settings: {
        describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [] })),
        mutate: vi.fn(),
      },
    })
    const rendered = mount(absent)
    await waitFor(() => { expect(rendered.container.textContent).toBe('') })
  })

  it('disables the switch while the descriptor is loading', async () => {
    const describe = Promise.withResolvers<ReturnType<typeof ok<{
      writable: boolean
      namespaces: SettingsNamespaceView[]
    }>>>()
    const controller = derivedController({
      settings: {
        describe: () => describe.promise,
        mutate: vi.fn(),
      },
    })
    mount(controller)
    expect((await screen.findByRole('switch', { name: 'File sandbox' })).hasAttribute('disabled')).toBe(true)
    describe.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] }))
    await waitFor(() => {
      expect((screen.getByRole('switch', { name: 'File sandbox' }) as HTMLInputElement).disabled).toBe(false)
    })
  })

  it('disables a read-only provider and shows a contained write error', async () => {
    const readonly = derivedController({
      settings: {
        describe: () => Promise.resolve(ok({ writable: false, hasDocument: false, namespaces: [view(true)] })),
        mutate: vi.fn(),
      },
    })
    mount(readonly)
    expect((await screen.findByRole('switch', { name: 'File sandbox' })).hasAttribute('disabled')).toBe(true)

    const controller = derivedController({
      settings: {
        describe: () => Promise.resolve(ok({ writable: true, hasDocument: false, namespaces: [view(true)] })),
        mutate: () => Promise.resolve({
          rpcId: 'test',
          result: {
            ok: false as const,
            error: { code: 'settings-conflict', message: 'changed elsewhere', details: {} },
          },
        }),
      },
    })
    cleanup()
    mount(controller)
    fireEvent.click(await screen.findByRole('switch', { name: 'File sandbox' }))
    expect((await screen.findByRole('alert')).textContent).toBe('changed elsewhere')
  })
})
