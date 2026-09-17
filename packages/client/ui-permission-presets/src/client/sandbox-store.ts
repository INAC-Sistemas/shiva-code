/**
 * File-sandbox settings controller. The boolean lives on the host `sandbox`
 * namespace; writes target only `enabled`, carry the descriptor revision, and
 * fold their answer back into the shared describe mirror.
 */

import type {
  IApiClient, SettingsNamespaceView,
} from '@deepseek-ai/dsh-api-remotes/client'
import {
  createSnapshotStore, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  SettingsDescribeFace,
} from '@deepseek-ai/dsh-client-ui-settings/client'

/** Sandbox's settings namespace on the host wire. */
export const SANDBOX_SETTINGS_NS = 'sandbox'

/** File-sandbox settings-row snapshot. */
export interface SandboxSettingsState {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'unavailable' | 'error'
  error: string | null
  writable: boolean
  enabled: boolean
  revision: number
}

/**
 * Read the host `enabled` boolean.
 * @param view - sandbox namespace descriptor.
 * @returns the current kill-switch value.
 */
export function sandboxEnabledOf(view: SettingsNamespaceView): boolean {
  const value = (view.value as { enabled?: unknown } | null)?.enabled
  if (typeof value !== 'boolean') throw new Error('sandbox settings has no enabled value')
  return value
}

/** Controller deriving the row from the shared mirror and writing `enabled`. */
export class SandboxSettingsController {
  /** Row snapshot consumed through a bound selector hook. */
  readonly store: SnapshotStore<SandboxSettingsState> = createSnapshotStore({
    status: 'idle',
    error: null,
    writable: false,
    enabled: true,
    revision: 0,
  })

  private following: (() => void) | undefined
  private saving = false
  private disposed = false

  /**
   * @param describeFace - the shared mirror's read/fold face (descriptor and schema source).
   * @param api - settings wire face for the `enabled` write.
   */
  constructor(
    private readonly describeFace: SettingsDescribeFace,
    private readonly api: Pick<IApiClient, 'settings'>,
  ) {}

  /**
   * Begin following the mirror (idempotent) and reflect its current answer.
   * @returns settlement once the snapshot reflects the mirror.
   */
  async load(): Promise<void> {
    if (this.disposed) return
    this.following ??= this.describeFace.subscribe(() => { this.derive() })
    this.store.update((state) => {
      state.status = 'loading'
      state.error = null
    })
    await this.describeFace.ensure()
    this.derive()
  }

  /**
   * Persist the process-wide file-sandbox kill switch. A selection made while
   * one is already saving is ignored — the row's control is disabled during
   * the save, so this only drops programmatic double-submits.
   * @param enabled - `false` forces Full access on every session, open ones included.
   * @returns nothing; {@link store} carries success or failure.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    const state = this.store.getSnapshot()
    const view = this.describeFace.getSnapshot().view?.namespaces
      .find(entry => entry.ns === SANDBOX_SETTINGS_NS)
    if (view === undefined || !state.writable || this.saving) return
    this.saving = true
    this.store.update((draft) => {
      draft.status = 'saving'
      draft.error = null
    })
    try {
      const response = await this.api.settings.mutate({
        ns: SANDBOX_SETTINGS_NS,
        ops: [{ op: 'set', path: ['enabled'], value: enabled }],
        expectedRevision: view.revision,
      })
      if (!response.result.ok) throw new Error(response.result.error.message)
      this.saving = false
      if (this.disposed) return
      this.describeFace.acceptView(response.result.value)
    } catch (error) {
      this.saving = false
      if (this.disposed) return
      this.fail(error)
    }
  }

  /** Stop following the mirror; later publishes leave the snapshot alone. */
  dispose(): void {
    this.disposed = true
    this.following?.()
    this.following = undefined
  }

  private derive(): void {
    if (this.disposed || this.saving) return
    const mirrored = this.describeFace.getSnapshot()
    if (mirrored.status === 'unavailable') {
      this.store.update((state) => {
        state.status = 'unavailable'
        state.writable = false
        state.enabled = true
      })
      return
    }
    if (mirrored.view === undefined) {
      if (mirrored.error !== null) this.fail(new Error(mirrored.error))
      return
    }
    const view = mirrored.view.namespaces.find(entry => entry.ns === SANDBOX_SETTINGS_NS)
    if (view === undefined) {
      this.store.update((state) => {
        state.status = 'unavailable'
        state.writable = false
        state.enabled = true
      })
      return
    }
    try {
      const enabled = sandboxEnabledOf(view)
      const { writable } = mirrored.view
      this.store.update((state) => {
        state.status = 'ready'
        state.error = null
        state.writable = writable
        state.enabled = enabled
        state.revision = view.revision
      })
    } catch (error) {
      this.fail(error)
    }
  }

  private fail(error: unknown): void {
    this.store.update((state) => {
      state.status = 'error'
      state.error = error instanceof Error ? error.message : String(error)
    })
  }
}
