/**
 * The picker: a full-frame screen that covers the app until this machine has
 * materialized one of the signed-in user's profiles.
 *
 * It renders `null` in three states — nobody signed in (the login gate is
 * covering the app), the state not read yet, and a selection already
 * materialized — which is the whole gating mechanism: the overlay seat is a
 * list, so an entry that renders nothing costs the app nothing.
 *
 * The server is the authority on which profile is active. When it names one
 * this machine has not materialized, the picker selects it silently rather than
 * asking: the user already chose, possibly on another device, and asking again
 * would be a question with one right answer.
 *
 * Styling comes from `./styles.ts`, shared with the authoring form so the two
 * screens are one dialog. `data-dsh-profiles` is the stable hook for a
 * profile's own CSS.
 * @module dsh-profiles/client/ProfileGate
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { fetchState, selectProfile } from './api.ts'
import { CreateProfileForm } from './CreateProfileForm.tsx'
import { desktopBridge } from './desktop.ts'
import type { DesktopBridge } from './desktop.ts'
import {
  BACKDROP_GATE, BACKDROP_MASK, CARD, CARD_WIDE, ERROR, FOOTER, NOTE, PRIMARY,
  ROW, ROW_CURRENT, ROW_HINT, SECONDARY, SUBTITLE, TITLE,
} from './styles.ts'
import type { LoginSessionFace } from './context-types.ts'
import type { ProfileStore } from './store.ts'
import type { ProfileState, ProfileSummary } from '../wire.ts'

/** What the gate is doing right now. */
type Phase =
  | { kind: 'reading' }
  | { kind: 'choosing', profiles: ProfileSummary[], error?: string }
  | { kind: 'creating' }
  | { kind: 'selecting' }
  | { kind: 'restarting', name: string }
  | { kind: 'restart', name: string }
  | { kind: 'done' }

/** Props of {@link ProfileGate}. */
export interface ProfileGateProps {
  /** The read face of `ctx.loginSession`; the gate stays out of the way until it reports a session. */
  session: LoginSessionFace
  /** Shared state with the sidebar badge, which is how a deliberate switch opens this. */
  store: ProfileStore
}

/**
 * Decide what the gate should do from one reading of the state.
 * @param state - the answer from the host half.
 * @returns the phase to enter, and the profile to materialize when there is one.
 */
export function planFrom(state: ProfileState): {
  phase: Phase
  materialize?: string
} {
  // Not signed in, or the host half could not answer. The login gate sits above
  // this one, so "unknown" resolves to covered — but with nothing to draw, so
  // the gate renders null and re-reads when the session changes.
  if (!state.signedIn) return { phase: { kind: 'done' } }

  // The server names an active profile this machine has not materialized (a new
  // machine, or a switch made elsewhere). Follow it rather than asking.
  if (state.serverActiveId !== null && state.active?.id !== state.serverActiveId) {
    return { phase: { kind: 'selecting' }, materialize: state.serverActiveId }
  }

  if (state.serverActiveId === null) {
    return { phase: { kind: 'choosing', profiles: state.profiles } }
  }

  return { phase: { kind: 'done' } }
}

/**
 * The picker.
 * @param props - the login session face.
 * @returns the cover, or null once a profile is materialized.
 */
export function ProfileGate({ session, store }: ProfileGateProps): ReactNode {
  const signedIn = useSyncExternalStore(
    useCallback(listener => session.subscribe(listener), [session]),
    useCallback(() => session.getSnapshot() !== null, [session]),
    useCallback(() => false, []),
  )
  const picking = useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.getSnapshot().picking, [store]),
    useCallback(() => false, [store]),
  )
  const active = useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.getSnapshot().active, [store]),
    useCallback(() => null, []),
  )
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' })
  const [restarting, setRestarting] = useState(false)
  const [restartError, setRestartError] = useState<string | undefined>(undefined)
  const pending = useRef<AbortController | undefined>(undefined)
  // Read once per mount: the shell injects it before the page runs, so it never
  // appears or disappears while the gate is up.
  const [desktop] = useState<DesktopBridge | undefined>(desktopBridge)

  // The restart is the shell's to perform, and the window goes down with it, so
  // there is no success path to render. A failure falls back to the notice,
  // which carries the manual instruction: a selection that could not be applied
  // must not leave the person with nothing to do.
  const restart = useCallback(async (bridge: DesktopBridge, name: string) => {
    setRestarting(true)
    setRestartError(undefined)
    try {
      const result = await bridge.restartHarness()
      if (result.ok) return
      setRestartError('O aplicativo não voltou pronto. Feche e abra o Shiva Code.')
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : 'Não foi possível reiniciar.')
    }
    setRestarting(false)
    setPhase({ kind: 'restart', name })
  }, [])

  /**
   * What a finished selection does, whether it was automatic or deliberate.
   *
   * Inside the desktop shell the restart is simply performed: the person has
   * already answered the only question there was by choosing the profile, and
   * asking them to confirm the consequence of their own choice is a second
   * question with one right answer. The notice survives for the browser, where
   * there is no process the page can restart.
   */
  const settle = useCallback((result: { name: string; restartRequired: boolean }) => {
    store.closePicker()
    if (!result.restartRequired) {
      setPhase({ kind: 'done' })
      return
    }
    if (desktop === undefined) {
      setPhase({ kind: 'restart', name: result.name })
      return
    }
    setPhase({ kind: 'restarting', name: result.name })
    void restart(desktop, result.name)
  }, [store, desktop, restart])

  const apply = useCallback(async (state: ProfileState) => {
    store.setActive(state.signedIn ? state.active : null)
    const plan = planFrom(state)
    setPhase(plan.phase)
    if (plan.materialize === undefined) return
    const result = await selectProfile(plan.materialize)
    if (!result.ok) {
      // Falling back to the picker is the recoverable answer: the server's
      // choice could not be materialized, so let the person pick again.
      const reread = await fetchState()
      setPhase(reread.signedIn
        ? { kind: 'choosing', profiles: reread.profiles, error: result.message }
        : { kind: 'done' })
      return
    }
    store.setActive(result.active)
    settle({ name: result.active.name, restartRequired: result.restartRequired })
  }, [store, settle])

  useEffect(() => {
    if (!signedIn) {
      store.setActive(null)
      setPhase({ kind: 'done' })
      return
    }
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setPhase({ kind: 'reading' })
    void fetchState(controller.signal).then(state => {
      if (!controller.signal.aborted) void apply(state)
    })
    return () => controller.abort()
  }, [signedIn, apply, store])

  // A deliberate switch: the badge asked for the picker, so the roster is read
  // again rather than reused. It is the plugin manager's, it is small, and a
  // stale one would offer a profile that no longer exists.
  useEffect(() => {
    if (!picking || !signedIn) return
    const controller = new AbortController()
    setPhase({ kind: 'reading' })
    void fetchState(controller.signal).then(state => {
      if (controller.signal.aborted) return
      if (!state.signedIn) {
        store.closePicker()
        setPhase({ kind: 'done' })
        return
      }
      store.setActive(state.active)
      setPhase({ kind: 'choosing', profiles: state.profiles })
    })
    return () => controller.abort()
  }, [picking, signedIn, store])

  const choose = useCallback(async (profileId: string) => {
    setPhase({ kind: 'selecting' })
    const result = await selectProfile(profileId)
    if (!result.ok) {
      const state = await fetchState()
      setPhase(state.signedIn
        ? { kind: 'choosing', profiles: state.profiles, error: result.message }
        : { kind: 'done' })
      return
    }
    store.setActive(result.active)
    settle({ name: result.active.name, restartRequired: result.restartRequired })
  }, [store, settle])

  const cancel = useCallback(() => {
    store.closePicker()
    setPhase({ kind: 'done' })
  }, [store])

  // Backing out of the form returns to the roster, which is re-read rather than
  // remembered: a profile may have been created since it was drawn.
  const abandonCreate = useCallback(() => {
    setPhase({ kind: 'reading' })
    void fetchState().then(state => {
      setPhase(state.signedIn
        ? { kind: 'choosing', profiles: state.profiles }
        : { kind: 'done' })
    })
  }, [])

  if (phase.kind === 'done') return null
  if (phase.kind === 'reading' && !signedIn) return null

  return (
    <div
      style={active === null ? BACKDROP_GATE : BACKDROP_MASK}
      data-dsh-profiles={active === null ? 'gate' : 'switcher'}
    >
      <div style={phase.kind === 'creating' ? CARD_WIDE : CARD}>
        {phase.kind === 'restart'
          ? (
            <>
              <h1 style={TITLE}>Reinicie para aplicar</h1>
              <p style={SUBTITLE}>
                O perfil “{phase.name}” liga ou desliga plugins que só carregam no
                início do aplicativo.
                {desktop === undefined
                  ? ' Feche e abra o Shiva Code para aplicá-los.'
                  : ' Reinicie agora para aplicá-los.'}
              </p>
              <p style={NOTE}>
                As skills do perfil já valem para as próximas sessões. As conversas
                abertas continuam com os plugins com que começaram.
              </p>

              {restartError === undefined ? null : <p style={ERROR}>{restartError}</p>}

              <div style={FOOTER}>
                {/* Offered only inside the desktop shell: in a plain browser
                    there is no process for the page to restart, and a button
                    that cannot act is worse than the instruction it replaced. */}
                {desktop === undefined ? null : (
                  <button
                    type="button"
                    style={PRIMARY}
                    disabled={restarting}
                    onClick={() => { void restart(desktop, phase.name) }}
                  >
                    {restarting ? 'Reiniciando…' : 'Reiniciar agora'}
                  </button>
                )}
                <button type="button" style={SECONDARY} onClick={cancel} disabled={restarting}>
                  Continuar sem reiniciar
                </button>
              </div>
            </>
          )
          : null}

        {phase.kind === 'reading' || phase.kind === 'selecting'
          ? (
            <>
              <h1 style={TITLE}>Carregando seu perfil…</h1>
              <p style={SUBTITLE}>Buscando o recorte de skills e plugins.</p>
            </>
          )
          : null}

        {/* Held only until the shell takes the window down; it exists so the
            moment between the click and the splash is not a frozen dialog. */}
        {phase.kind === 'restarting'
          ? (
            <>
              <h1 style={TITLE}>Aplicando o perfil…</h1>
              <p style={SUBTITLE}>
                O perfil “{phase.name}” liga ou desliga plugins que só carregam no
                início do aplicativo, então o Shiva Code está reiniciando.
              </p>
            </>
          )
          : null}

        {phase.kind === 'choosing'
          ? (
            <>
              <h1 style={TITLE}>
                {active === null ? 'Escolha um perfil' : 'Trocar de perfil'}
              </h1>
              <p style={SUBTITLE}>
                O perfil decide quais skills e plugins o agente enxerga.
                {active === null
                  ? ''
                  : ' As conversas já abertas continuam com o perfil com que começaram.'}
              </p>

              {phase.error === undefined ? null : <p style={ERROR}>{phase.error}</p>}

              {phase.profiles.length === 0
                ? (
                  <p style={NOTE}>
                    Você ainda não tem perfis. Crie o primeiro aqui mesmo — ou no
                    painel do plugin manager, em <strong>Perfis</strong>.
                  </p>
                )
                : phase.profiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    style={profile.id === active?.id ? { ...ROW, ...ROW_CURRENT } : ROW}
                    onClick={() => void choose(profile.id)}
                  >
                    <span>
                      {profile.name}
                      {profile.id === active?.id ? ' · atual' : ''}
                    </span>
                    <span style={ROW_HINT}>
                      {profile.description ?? `${profile.skillCount} skills · ${profile.pluginCount} plugins`}
                    </span>
                  </button>
                ))}

              {/* Authoring is offered in both states, and it is the only way
                  out of the gate other than picking: a person with no profiles
                  used to have to leave for the panel to get past this screen. */}
              <button
                type="button"
                style={PRIMARY}
                onClick={() => { setPhase({ kind: 'creating' }) }}
              >
                Criar perfil
              </button>

              {/* Only for a deliberate switch: with nothing materialized there
                  is no state to go back to, so the gate has no way out but a
                  choice. */}
              {active === null ? null : (
                <button type="button" style={SECONDARY} onClick={cancel}>
                  Cancelar
                </button>
              )}
            </>
          )
          : null}

        {phase.kind === 'creating'
          ? (
            <CreateProfileForm
              // Created, then selected: with nothing materialized, leaving the
              // person on the roster to click the profile they just authored
              // would be a second question with one right answer — the same
              // reason the server activates a user's first profile itself.
              onCreated={profile => { void choose(profile.id) }}
              onCancel={abandonCreate}
            />
          )
          : null}
      </div>
    </div>
  )
}
