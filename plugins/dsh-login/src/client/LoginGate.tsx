/**
 * The gate itself: a full-frame sign-in screen that covers the app until the
 * login service accepts a credential pair.
 *
 * It renders `null` once a live session exists, which is the whole gating
 * mechanism — the overlay seat is a list, so an entry that renders nothing
 * costs the app nothing. The first render decides from `localStorage`
 * synchronously, so a signed-in reload never shows the screen, and an unknown
 * state always resolves to "covered".
 *
 * Styling is inline rather than a CSS module so the bundle carries no CSS
 * pipeline; the values are DSH design tokens, so the screen follows the active
 * theme. `data-dsh-login` is the stable hook for a profile's own CSS.
 * @module dsh-login/client/LoginGate
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { fetchForm, submitCredentials } from './api.ts'
import { browserStorage, readSession, writeSession } from './session.ts'
import type { StoredSession } from './session.ts'
import type { LoginError, LoginForm } from '../wire.ts'

/** Full-frame cover. The overlay layer grants pointer events to its children, so the app underneath is unreachable. */
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
  maxWidth: 360,
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

const LABEL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 13,
  lineHeight: '20px',
}

const INPUT: CSSProperties = {
  height: 40,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
}

const BUTTON: CSSProperties = {
  height: 40,
  marginTop: 4,
  borderRadius: 10,
  border: 'none',
  background: 'var(--dsw-alias-state-business-primary)',
  color: 'var(--dsw-static-white, #fff)',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const BUTTON_BUSY: CSSProperties = { ...BUTTON, opacity: 0.6, cursor: 'progress' }

const ERROR: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-state-error-primary)',
  fontSize: 13,
  lineHeight: '20px',
}

/** Text shown while the descriptor is still loading; the cover is already up. */
const LOADING: CSSProperties = { ...SUBTITLE, textAlign: 'center' }

/** The descriptor request's outcome. */
type FormState =
  | { kind: 'loading' }
  | { kind: 'ready'; form: LoginForm }
  | { kind: 'failed'; message: string }

/**
 * Render the gate.
 * @returns the sign-in screen, or null once a live session exists.
 */
export function LoginGate(): ReactNode {
  const storage = useMemo(browserStorage, [])
  const [session, setSession] = useState<StoredSession | null>(() => readSession(storage, Date.now()))
  const [state, setState] = useState<FormState>({ kind: 'loading' })
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const cardRef = useRef<HTMLFormElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const gated = session === null

  // The descriptor is only needed while the screen is up, and it is re-read
  // after a sign-out so a restyled gate does not need a page reload.
  useEffect(() => {
    if (!gated) return
    const controller = new AbortController()
    setState({ kind: 'loading' })
    fetchForm(controller.signal).then(
      form => setState({ kind: 'ready', form }),
      (cause: unknown) => {
        if (controller.signal.aborted) return
        setState({ kind: 'failed', message: cause instanceof Error ? cause.message : String(cause) })
      },
    )
    return () => { controller.abort() }
  }, [gated])

  // A session with a lifetime brings the gate back when it runs out, without
  // waiting for the next page load.
  useEffect(() => {
    if (session?.expiresAt == null) return
    const timer = setTimeout(() => { setSession(null) }, Math.max(0, session.expiresAt - Date.now()))
    return () => { clearTimeout(timer) }
  }, [session])

  // Covering the app is not enough on its own: Tab from the page underneath
  // would still reach it. Focus that escapes the card is pulled back in.
  useEffect(() => {
    if (!gated) return
    firstFieldRef.current?.focus()
    const onFocusIn = (event: FocusEvent): void => {
      const card = cardRef.current
      if (card === null || event.target === null) return
      if (!card.contains(event.target as Node)) firstFieldRef.current?.focus()
    }
    document.addEventListener('focusin', onFocusIn)
    return () => { document.removeEventListener('focusin', onFocusIn) }
  }, [gated, state.kind])

  const onSubmit = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    // The attempt outlives no unmount: the gate unmounts only on success, and
    // the component's own state is what closes it.
    submitCredentials({ identifier, password }, new AbortController().signal).then(
      (result) => {
        setPending(false)
        if (!result.ok) {
          setError(result.error)
          setPassword('')
          return
        }
        setSession(writeSession(storage, result.session, Date.now()))
      },
      (cause: unknown) => {
        setPending(false)
        setError({ code: 'unreachable', message: cause instanceof Error ? cause.message : String(cause) })
      },
    )
  }, [identifier, password, pending, storage])

  if (!gated) return null

  const form = state.kind === 'ready' ? state.form : undefined
  const canSubmit = form !== undefined && !pending && identifier.trim() !== '' && password !== ''

  return (
    <div data-dsh-login="" style={BACKDROP}>
      <form
        ref={cardRef}
        style={CARD}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={form?.title ?? 'Sign in'}
      >
        {form === undefined
          ? <p style={LOADING}>{state.kind === 'failed' ? state.message : '…'}</p>
          : (
              <>
                <h1 style={TITLE}>{form.title}</h1>
                {form.subtitle !== '' && <p style={SUBTITLE}>{form.subtitle}</p>}
                <label style={LABEL}>
                  {form.identifierLabel}
                  <input
                    ref={firstFieldRef}
                    style={INPUT}
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={identifier}
                    disabled={pending}
                    onChange={event => setIdentifier(event.target.value)}
                  />
                </label>
                <label style={LABEL}>
                  {form.passwordLabel}
                  <input
                    style={INPUT}
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    disabled={pending}
                    onChange={event => setPassword(event.target.value)}
                  />
                </label>
                {error !== null && <p style={ERROR} role="alert">{error.message}</p>}
                <button style={pending ? BUTTON_BUSY : BUTTON} type="submit" disabled={!canSubmit}>
                  {form.submitLabel}
                </button>
              </>
            )}
      </form>
    </div>
  )
}
