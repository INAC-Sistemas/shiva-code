/**
 * File sandbox preference row: a process-wide kill switch. Turning it off
 * forces Full access for every session, open ones included, without rewriting
 * those sessions' permission logs.
 */

import { useEffect } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SandboxSettingsState } from './sandbox-store.ts'
import type { SandboxSettingsKey } from './locales.ts'
import css from './SandboxRow.module.css'

/** Registration-side business face for the host-backed kill switch. */
export interface SandboxRowInjected {
  hooks: {
    /** Sandbox settings snapshot bound by the renderer as useSandbox. */
    sandbox: SnapshotStore<SandboxSettingsState>
  }
  /** Load the descriptor when the row first renders. */
  load: () => Promise<void>
  /** Persist the process-wide enabled flag. */
  setEnabled: (enabled: boolean) => Promise<void>
}

/** Full component props. */
export type SandboxRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.sandbox'>
  & InjectFace<SandboxRowInjected>

/**
 * Render the General File sandbox toggle.
 * @param props - composed slot props.
 * @returns the row, or null when the host does not expose sandbox settings.
 */
export function SandboxRow({ load, setEnabled, useSandbox, t }: SandboxRowProps) {
  const state = useSandbox(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  if (state.status === 'unavailable') return null
  const busy = state.status === 'loading' || state.status === 'saving'
  const description = state.error ?? (state.enabled ? t('description.on') : t('description.off'))
  const stateLabel = state.enabled ? t('on') : t('off')

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('title')}</div>
        <div className={css.desc} role={state.error === null ? undefined : 'alert'}>{description}</div>
      </div>
      <div className={css.control}>
        <span className={css.state}>{stateLabel}</span>
        <label className={css.switch}>
          <input
            type="checkbox"
            role="switch"
            className={css.switchInput}
            checked={state.enabled}
            aria-label={t('title')}
            disabled={busy || !state.writable}
            onChange={event => {
              const next = event.currentTarget.checked
              if (next === state.enabled) return
              void setEnabled(next)
            }}
          />
          <span className={css.switchTrack} aria-hidden="true">
            <span className={css.switchThumb} />
          </span>
        </label>
      </div>
    </div>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** File sandbox General-settings row copy. */
    'settings.sandbox': SandboxSettingsKey
  }
}
