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
 * Styling is inline rather than a CSS module so the bundle carries no CSS
 * pipeline; the values are DSH design tokens, so the screen follows the active
 * theme. `data-dsh-profiles` is the stable hook for a profile's own CSS.
 * @module dsh-profiles/client/ProfileGate
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { fetchState, selectProfile } from './api.ts'
import type { LoginSessionFace } from './context-types.ts'
import type { ProfileState, ProfileSummary } from '../wire.ts'

const BACKDROP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--dsw-alias-bg-base)',
  fontFamily: 'var(--dsw-font-family)',
  overflow: 'auto',
}

const CARD: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 32,
  borderRadius: 16,
  border: '1px solid var(--dsw-alias-border-l1)',
  boxShadow: 'var(--dsw-shadow-lv2)',
}

const TITLE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 22,
  fontWeight: 600,
  lineHeight: '30px',
}

const SUBTITLE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 13,
  lineHeight: '20px',
}

const ROW: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  textAlign: 'left',
  cursor: 'pointer',
}

const ROW_HINT: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  lineHeight: '18px',
}

const NOTE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  lineHeight: '18px',
}

const ERROR: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-error, #d64545)',
  fontSize: 13,
  lineHeight: '20px',
}

/** What the gate is doing right now. */
type Phase =
  | { kind: 'reading' }
  | { kind: 'choosing', profiles: ProfileSummary[], error?: string }
  | { kind: 'selecting' }
  | { kind: 'restart', name: string }
  | { kind: 'done' }

/** Props of {@link ProfileGate}. */
export interface ProfileGateProps {
  /** The read face of `ctx.loginSession`; the gate stays out of the way until it reports a session. */
  session: LoginSessionFace
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
export function ProfileGate({ session }: ProfileGateProps): ReactNode {
  const signedIn = useSyncExternalStore(
    useCallback(listener => session.subscribe(listener), [session]),
    useCallback(() => session.getSnapshot() !== null, [session]),
    useCallback(() => false, []),
  )
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' })
  const pending = useRef<AbortController | undefined>(undefined)

  const apply = useCallback(async (state: ProfileState) => {
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
    setPhase(result.restartRequired
      ? { kind: 'restart', name: result.active.name }
      : { kind: 'done' })
  }, [])

  useEffect(() => {
    if (!signedIn) {
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
  }, [signedIn, apply])

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
    setPhase(result.restartRequired
      ? { kind: 'restart', name: result.active.name }
      : { kind: 'done' })
  }, [])

  if (phase.kind === 'done') return null
  if (phase.kind === 'reading' && !signedIn) return null

  return (
    <div style={BACKDROP} data-dsh-profiles="gate">
      <div style={CARD}>
        {phase.kind === 'restart'
          ? (
            <>
              <h1 style={TITLE}>Reinicie para aplicar</h1>
              <p style={SUBTITLE}>
                O perfil “{phase.name}” liga ou desliga plugins que só carregam no
                início do aplicativo. Feche e abra o Shiva Code para aplicá-los.
              </p>
              <p style={NOTE}>
                As skills do perfil já valem para as próximas sessões. As conversas
                abertas continuam com os plugins com que começaram.
              </p>
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

        {phase.kind === 'choosing'
          ? (
            <>
              <h1 style={TITLE}>Escolha um perfil</h1>
              <p style={SUBTITLE}>
                O perfil decide quais skills e plugins o agente enxerga.
              </p>

              {phase.error === undefined ? null : <p style={ERROR}>{phase.error}</p>}

              {phase.profiles.length === 0
                ? (
                  <p style={NOTE}>
                    Você ainda não tem perfis. Crie um em <strong>Perfis</strong>, no
                    painel do plugin manager, e volte aqui.
                  </p>
                )
                : phase.profiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    style={ROW}
                    onClick={() => void choose(profile.id)}
                  >
                    <span>{profile.name}</span>
                    <span style={ROW_HINT}>
                      {profile.description ?? `${profile.skillCount} skills · ${profile.pluginCount} plugins`}
                    </span>
                  </button>
                ))}
            </>
          )
          : null}
      </div>
    </div>
  )
}
