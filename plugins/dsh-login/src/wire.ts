/**
 * The wire vocabulary shared by the two halves of dsh-login: route paths, the
 * form descriptor the browser renders, the credential envelope it posts, and
 * the authenticate result it reads back.
 *
 * This module is deliberately dependency-free — no Node imports, no React, no
 * `@deepseek-ai` values — because the client bundle imports it and the build's
 * purity gate rejects anything else.
 * @module dsh-login/wire
 */

/** `GET` route answering the {@link LoginForm} descriptor. */
export const FORM_ROUTE = '/login/api/form'

/** `POST` route that forwards one credential pair to the configured endpoint. */
export const AUTHENTICATE_ROUTE = '/login/api/authenticate'

/** `POST` route that ends the session at the login service. */
export const LOGOUT_ROUTE = '/login/api/logout'

/**
 * The logout route's answer.
 *
 * The browser's own session is already gone before this arrives — signing out
 * locally is unconditional, because a login service that refuses to end a
 * session must never be able to trap someone inside the app. `ok: false` only
 * says the service was not told.
 */
export interface LogoutResult {
  /** Whether the login service acknowledged the sign-out. */
  ok: boolean
  /** Why it did not, for a diagnostic; never shown as a blocking error. */
  message?: string
}

/** Everything the browser needs to draw the form; the host owns every value. */
export interface LoginForm {
  /** Heading above the fields. */
  title: string
  /** Sub-heading under the title; empty string renders no line. */
  subtitle: string
  /** Label of the identifier field (e-mail, user name, …). */
  identifierLabel: string
  /** Label of the secret field. */
  passwordLabel: string
  /** Text on the submit button. */
  submitLabel: string
}

/** One login attempt as the browser posts it. */
export interface Credentials {
  /** Whatever the identifier field holds; the host maps it onto the configured field name. */
  identifier: string
  /** The secret; never persisted, never logged. */
  password: string
}

/** The authenticated session the browser persists until it expires. */
export interface AuthenticatedSession {
  /** Token read out of the endpoint's answer at the configured path. */
  token: string
  /**
   * The endpoint's answer minus the token, verbatim — profile fields, roles,
   * anything else it returned. `null` when the answer was not a JSON object.
   */
  user: unknown
  /**
   * Lifetime in milliseconds, or `null` for a session that never expires on
   * its own. The browser adds it to its OWN clock: an absolute instant from
   * the host would drift against a client in another timezone or with a skewed
   * clock, and this value only decides when the gate returns.
   */
  expiresInMs: number | null
}

/** Why a login attempt did not produce a session. */
export type LoginErrorCode =
  /** The endpoint refused the credentials (401/403). */
  | 'invalid-credentials'
  /** The endpoint could not be reached, or took longer than the deadline. */
  | 'unreachable'
  /** The endpoint answered a status this plugin does not translate. */
  | 'upstream'
  /** The endpoint answered success without a usable token at the configured path. */
  | 'malformed'
  /** The browser posted something other than a pair of non-empty strings. */
  | 'bad-request'
  /** The request did not come from this app's own page. */
  | 'forbidden'

/** A failed attempt: the code drives the UI, the message is shown to the user. */
export interface LoginError {
  code: LoginErrorCode
  message: string
}

/** The authenticate route's answer. */
export type AuthenticateResult =
  | { ok: true; session: AuthenticatedSession }
  | { ok: false; error: LoginError }
