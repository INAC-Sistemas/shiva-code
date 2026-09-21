/**
 * The question asked before adding a workspace: switch profiles first, or stay
 * on the current one.
 *
 * A new workspace is where new work starts, and the profile decides which
 * skills and plugins that work gets, so the choice is offered at the button
 * rather than discovered later. The workspace browser's button is owned by
 * `@deepseek-ai/dsh-client-ui-workspace`, which exposes no hook; the desktop
 * patch for that package marks it `data-dsh-action="add-workspace"`, and
 * {@link guardAddWorkspace} intercepts its click in the capture phase, before
 * React sees it. "Seguir no mesmo perfil" replays the click with the guard
 * stood down, so the package's own flow runs unchanged.
 * @module dsh-profiles/client/WorkspacePrompt
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { BACKDROP_MASK, CARD, FOOTER, PRIMARY, SECONDARY, SUBTITLE, TITLE } from './styles.ts'
import type { ProfileStore } from './store.ts'

/** Selector of the button the workspace-package patch marks. */
export const ADD_WORKSPACE_SELECTOR = '[data-dsh-action="add-workspace"]'

/** The element methods the guard uses; `Element` in the browser. */
interface ClosestTarget {
  closest(selector: string): { click(): void } | null
}

/** The half of the guard the prompt drives. */
export interface AddWorkspaceGuard {
  /** Run the intercepted click through to the workspace package. */
  proceed(): void
  /** Remove the listener. */
  dispose(): void
}

/**
 * Intercept clicks on the add-workspace button and open the prompt instead.
 * @param root - where to listen, `document` in the browser.
 * @param store - the shared profile state; its prompt flag opens the modal.
 * @returns the guard, whose `proceed()` replays the last intercepted click.
 */
export function guardAddWorkspace(root: EventTarget, store: ProfileStore): AddWorkspaceGuard {
  let pending: { click(): void } | undefined
  let replaying = false
  const listener = (event: Event): void => {
    if (replaying) return
    const target = event.target as Partial<ClosestTarget> | null
    const button = typeof target?.closest === 'function' ? target.closest(ADD_WORKSPACE_SELECTOR) : null
    if (button === null) return
    // Before React's root listener: the package's toggle never runs.
    event.preventDefault()
    event.stopImmediatePropagation()
    pending = button
    store.openWorkspacePrompt()
  }
  root.addEventListener('click', listener, { capture: true })
  return {
    proceed() {
      const button = pending
      pending = undefined
      if (button === undefined) return
      replaying = true
      try {
        button.click()
      } finally {
        replaying = false
      }
    },
    dispose() {
      root.removeEventListener('click', listener, { capture: true })
    },
  }
}

/** Props of {@link WorkspacePrompt}. */
export interface WorkspacePromptProps {
  store: ProfileStore
  guard: AddWorkspaceGuard
}

/**
 * The modal.
 * @param props - the shared store and the guard to resume through.
 * @returns the modal while the question is open, otherwise null.
 */
export function WorkspacePrompt({ store, guard }: WorkspacePromptProps): ReactNode {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const switchProfile = useCallback(() => {
    store.closeWorkspacePrompt()
    store.openPicker()
  }, [store])

  const stay = useCallback(() => {
    store.closeWorkspacePrompt()
    guard.proceed()
  }, [store, guard])

  const dismiss = useCallback(() => { store.closeWorkspacePrompt() }, [store])

  useEffect(() => {
    if (!snapshot.promptingWorkspace) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [snapshot.promptingWorkspace, dismiss])

  if (!snapshot.promptingWorkspace) return null
  const name = snapshot.active?.name

  return (
    <div
      style={BACKDROP_MASK}
      data-dsh-profiles="workspace-prompt"
      onClick={event => { if (event.target === event.currentTarget) dismiss() }}
    >
      <div style={CARD} role="dialog" aria-modal="true" aria-labelledby="dsh-profiles-workspace-prompt-title">
        <h1 id="dsh-profiles-workspace-prompt-title" style={TITLE}>Adicionar workspace</h1>
        <p style={SUBTITLE}>
          {name === undefined
            ? 'O perfil decide quais skills e plugins o agente usa neste workspace.'
            : `Você está no perfil “${name}”, que decide quais skills e plugins o agente usa neste workspace.`}
          {' '}Quer trocar de perfil antes de continuar?
        </p>
        <div style={FOOTER}>
          <button type="button" style={PRIMARY} onClick={switchProfile}>Mudar de perfil</button>
          <button type="button" style={SECONDARY} onClick={stay} autoFocus>Seguir no mesmo perfil</button>
        </div>
      </div>
    </div>
  )
}
