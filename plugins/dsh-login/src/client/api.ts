/**
 * The browser's calls into the host half. All of them are same-origin fetches
 * against this plugin's own routes; the login service is the host's business.
 * @module dsh-login/client/api
 */
import { AUTHENTICATE_ROUTE, FORM_ROUTE, LOGOUT_ROUTE, VALIDATE_ROUTE } from '../wire.ts'
import type { AuthenticateResult, Credentials, LoginForm, LogoutResult, ValidateResult } from '../wire.ts'

/**
 * Fetch the form descriptor.
 * @param signal - aborts the request when the gate unmounts.
 * @returns the descriptor the host serves.
 * @throws Error when the route is unreachable or does not answer a descriptor.
 */
export async function fetchForm(signal: AbortSignal): Promise<LoginForm> {
  const response = await fetch(FORM_ROUTE, { signal, headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`the login plugin's form route answered ${response.status}`)
  return await response.json() as LoginForm
}

/**
 * Post one login attempt.
 *
 * A refusal is a result, not an exception: the route answers the same JSON
 * body on 401 and 502 as on success, and only a dead connection or a
 * non-JSON answer becomes the local 'unreachable' failure below.
 * @param credentials - what the user typed.
 * @param signal - aborts the request when the gate unmounts.
 * @returns the granted session, or the named failure.
 */
export async function submitCredentials(credentials: Credentials, signal: AbortSignal): Promise<AuthenticateResult> {
  let response: Response
  try {
    response = await fetch(AUTHENTICATE_ROUTE, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(credentials),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return { ok: false, error: { code: 'unreachable', message: 'The app could not be reached.' } }
  }
  const parsed = await response.json().catch(() => undefined) as AuthenticateResult | undefined
  if (parsed === undefined || typeof parsed.ok !== 'boolean') {
    return { ok: false, error: { code: 'upstream', message: `Unexpected answer from the app (${response.status}).` } }
  }
  return parsed
}

/**
 * Tell the login service the session is over, forwarding the browser's own
 * bearer token through the host.
 *
 * Never throws: the browser has already signed itself out by the time this
 * runs, so a service that refuses or cannot be reached changes nothing the
 * user can act on — the outcome is a diagnostic.
 * @param token - the token being retired.
 * @returns whether the login service acknowledged it.
 */
/**
 * Ask the host whether the stored token is still good.
 *
 * Never throws, and every failure it cannot attribute to the login service is
 * reported as `unreachable`: only a refusal may end a session, so an outage
 * between here and the service must not read as one.
 * @param token - the token to check.
 * @returns whether the session still holds, and why it does not.
 */
export async function submitValidate(token: string): Promise<ValidateResult> {
  try {
    const response = await fetch(VALIDATE_ROUTE, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    const parsed = await response.json().catch(() => undefined) as ValidateResult | undefined
    if (parsed === undefined || typeof parsed.ok !== 'boolean') {
      return { ok: false, reason: 'unreachable', message: `Unexpected answer from the app (${response.status}).` }
    }
    return parsed
  } catch {
    return { ok: false, reason: 'unreachable', message: 'The app could not be reached.' }
  }
}

export async function submitLogout(token: string): Promise<LogoutResult> {
  try {
    const response = await fetch(LOGOUT_ROUTE, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    const parsed = await response.json().catch(() => undefined) as LogoutResult | undefined
    if (parsed === undefined || typeof parsed.ok !== 'boolean') {
      return { ok: false, message: `Unexpected answer from the app (${response.status}).` }
    }
    return parsed
  } catch {
    return { ok: false, message: 'The app could not be reached.' }
  }
}
