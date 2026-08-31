/**
 * dsh-login host half: the routes behind the login gate.
 *
 * The browser never talks to the login service directly. It posts the typed
 * credentials to this harness, and this plugin forwards them to the configured
 * endpoint. That keeps the endpoint URL (and any static header it needs) on
 * the host where the environment variable lives, and it keeps the exchange
 * same-origin, so no CORS grant on the login service is required for the gate
 * to work.
 *
 * Scope, stated plainly: the gate this plugin serves is a UI gate. It decides
 * what the browser renders, not what the harness serves — every other DSH
 * route stays reachable by anything that can reach the port. Bind the harness
 * to loopback, or put a real proxy in front of it, if that matters here.
 * @module dsh-login
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webserver plugin's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: pulls the credential seam's Context merge (ctx.credentials).
import type {} from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { buildUpstreamPayload, interpretUpstream, LoginRequestError, parseCredentials } from './auth.ts'
import {
  assertRevalidateInterval,
  assertSessionTtl,
  assertTimeout,
  resolveEndpoint,
  resolveLogoutEndpoint,
  resolveValidateEndpoint,
  sessionLifetime,
} from './config.ts'
import { isSameOriginRequest } from './fence.ts'
import { readJsonBody, writeJson } from './http.ts'
import { publishGrant, revokeGrant } from './vps-auth.ts'
import type { LoginCredentialStore } from './vps-auth.ts'
import { AUTHENTICATE_ROUTE, FORM_ROUTE, LOGOUT_ROUTE, VALIDATE_ROUTE } from './wire.ts'
import type { AuthenticateResult, LoginError, LoginForm, LogoutResult, ValidateResult } from './wire.ts'

export type { CredentialFields, AnswerReading, UpstreamAnswer } from './auth.ts'
export { buildUpstreamPayload, interpretUpstream, LoginRequestError, parseCredentials, pickToken, withoutPath } from './auth.ts'
export {
  assertRevalidateInterval, assertSessionTtl, assertTimeout,
  resolveEndpoint, resolveLogoutEndpoint, resolveValidateEndpoint, sessionLifetime,
} from './config.ts'
export { isSameOriginRequest } from './fence.ts'
export type { LoginAuthorization, LoginCredentialStore, LoginGrantPayload } from './vps-auth.ts'
export {
  LOGIN_RECORD_ID, LOGIN_RECORD_SCOPE, loginRecordKey, publishGrant,
  readGrantPayload, resolveLoginAuthorization, revokeGrant, toGrantRecord,
} from './vps-auth.ts'
export { AUTHENTICATE_ROUTE, FORM_ROUTE, LOGOUT_ROUTE, VALIDATE_ROUTE } from './wire.ts'
export type {
  AuthenticatedSession, AuthenticateResult, Credentials, LoginError, LoginErrorCode, LoginForm, LogoutResult,
  ValidateResult,
} from './wire.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-login'

/** Requires the HTTP route registry (`ctx.webServer`). */
export const inject = ['webServer']

/** Plugin config: where the credentials go, and what the gate says while asking for them. */
export interface Config {
  /**
   * Full URL that receives the credential POST, not a base — it is requested
   * verbatim. Overridden by the environment variable named in
   * {@link endpointEnv}, which is how a deployment points the gate somewhere
   * else without touching the profile.
   */
  endpoint?: string
  /** Environment variable that overrides {@link endpoint} when it is set and non-blank. */
  endpointEnv?: string
  /**
   * Full URL that ends a session at the login service, requested verbatim with
   * the signed-in user's own bearer token. Empty — the default — means the
   * service has no such route: signing out then clears the browser alone.
   */
  logoutEndpoint?: string
  /**
   * Full URL that answers whether a token is still good, requested verbatim
   * with the browser's own bearer token. Empty — the default — means the
   * service has no such route and a stored session is never revalidated.
   */
  validateEndpoint?: string
  /**
   * Shortest gap between two focus-driven revalidations, in milliseconds. `0`
   * revalidates on every focus, which is a request per tab switch.
   */
  revalidateIntervalMs?: number
  /** JSON field the endpoint expects the identifier in. */
  identifierField?: string
  /** JSON field the endpoint expects the secret in. */
  passwordField?: string
  /** Dot path to the token inside a successful answer (`token`, `data.accessToken`, …). */
  tokenPath?: string
  /** Static headers added to the forwarded request (a gateway key, a tenant id). */
  headers?: Record<string, string>
  /** Deadline for the forwarded request, in milliseconds. */
  timeoutMs?: number
  /**
   * How long a granted session keeps the gate away, in milliseconds. `0` means
   * it stays away until the browser storage is cleared — the token's own
   * expiry is the login service's business, not this plugin's.
   */
  sessionTtlMs?: number
  /** Heading on the login screen. */
  title?: string
  /** Line under the heading; empty renders nothing. */
  subtitle?: string
  /** Label of the identifier field. */
  identifierLabel?: string
  /** Label of the secret field. */
  passwordLabel?: string
  /** Text on the submit button. */
  submitLabel?: string
}

export const Config: z<Config> = z.object({
  endpoint: z.string().default('http://localhost:3000/api/auth/login'),
  endpointEnv: z.string().default('DSH_LOGIN_ENDPOINT'),
  logoutEndpoint: z.string().default(''),
  validateEndpoint: z.string().default(''),
  revalidateIntervalMs: z.number().default(60_000),
  identifierField: z.string().default('email'),
  passwordField: z.string().default('password'),
  tokenPath: z.string().default('token'),
  headers: z.dict(z.string()).default({}),
  timeoutMs: z.number().default(10_000),
  sessionTtlMs: z.number().default(0),
  title: z.string().default('Sign in'),
  subtitle: z.string().default(''),
  identifierLabel: z.string().default('E-mail'),
  passwordLabel: z.string().default('Password'),
  submitLabel: z.string().default('Sign in'),
})

/** Complete config after schemastery applies every field default. */
type ResolvedConfig = Required<Config>

/** HTTP status for each failure code, so a caller can act on the status alone. */
const FAILURE_STATUS: Record<LoginError['code'], number> = {
  'invalid-credentials': 401,
  'unreachable': 502,
  'upstream': 502,
  'malformed': 502,
  'bad-request': 400,
  'forbidden': 403,
  'grant-storage': 500,
}

/**
 * The credential store, if this composition mounts one.
 *
 * Resolved per request rather than captured at `apply`: the credential seam is
 * optional and may mount after this plugin, and its own rule is that consumers
 * re-resolve per operation instead of holding a provider that may be disposed.
 * @param ctx - the host cordis context.
 * @returns the store, or undefined where no credential service is mounted.
 */
function credentialStore(ctx: Context): LoginCredentialStore | undefined {
  return ctx.get('credentials')
}

/**
 * Answer one failed attempt.
 * @param response - the server response.
 * @param error - the named failure.
 */
function writeFailure(response: ServerResponse, error: LoginError): void {
  const result: AuthenticateResult = { ok: false, error }
  writeJson(response, FAILURE_STATUS[error.code], result)
}

/**
 * Forward one credential pair to the login endpoint and read its answer.
 * @param endpoint - the resolved endpoint URL.
 * @param payload - the credential body, already mapped onto the endpoint's field names.
 * @param config - the resolved plugin config (headers, deadline, token path, lifetime).
 * @returns the session, or the named failure.
 */
async function authenticate(
  endpoint: URL,
  payload: Record<string, string>,
  config: ResolvedConfig,
): Promise<AuthenticateResult> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: { ...config.headers, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    return {
      ok: false,
      error: {
        code: 'unreachable',
        message: timedOut
          ? `The login service did not answer within ${config.timeoutMs} ms.`
          : 'The login service could not be reached.',
      },
    }
  }
  // A login service is free to answer an error as HTML or as an empty body;
  // interpretUpstream decides on the status when the body carries nothing.
  const body: unknown = await response.json().catch(() => undefined)
  return interpretUpstream(
    { status: response.status, body },
    { tokenPath: config.tokenPath, lifetimeMs: sessionLifetime(config.sessionTtlMs) },
  )
}

/**
 * Serve the form descriptor: everything the gate renders, owned by the host.
 * @param config - the resolved plugin config.
 * @returns the route handler.
 */
export function formHandler(config: ResolvedConfig): (req: IncomingMessage, res: ServerResponse) => void {
  const form: LoginForm = {
    title: config.title,
    subtitle: config.subtitle,
    identifierLabel: config.identifierLabel,
    passwordLabel: config.passwordLabel,
    submitLabel: config.submitLabel,
  }
  return (request, response) => {
    if (!isSameOriginRequest(request)) {
      writeJson(response, 403, { ok: false, error: { code: 'forbidden', message: 'cross-site request' } })
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      writeJson(response, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
      return
    }
    writeJson(response, 200, form)
  }
}

/**
 * Serve the credential exchange.
 *
 * A granted session is written to the credential store BEFORE the browser is
 * told, and a store that refuses fails the login: a browser holding a session
 * the host has no record of would report success and then fail every host-side
 * request, which is the silent half-state this ordering exists to prevent.
 * @param ctx - the host cordis context, for the per-request credential store.
 * @param endpoint - the resolved endpoint URL.
 * @param config - the resolved plugin config.
 * @returns the route handler.
 */
export function authenticateHandler(
  ctx: Context,
  endpoint: URL,
  config: ResolvedConfig,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (request, response) => {
    if (!isSameOriginRequest(request)) {
      writeFailure(response, { code: 'forbidden', message: 'cross-site request' })
      return
    }
    if (request.method !== 'POST') {
      writeJson(response, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
      return
    }
    let payload: Record<string, string>
    try {
      payload = buildUpstreamPayload(parseCredentials(await readJsonBody(request)), config)
    } catch (error) {
      if (error instanceof LoginRequestError) {
        writeFailure(response, { code: 'bad-request', message: error.message })
        return
      }
      throw error
    }
    const result = await authenticate(endpoint, payload, config)
    if (!result.ok) {
      writeFailure(response, result.error)
      return
    }
    const store = credentialStore(ctx)
    if (store === undefined) {
      writeFailure(response, {
        code: 'grant-storage',
        message: 'This app mounts no credential store, so a sign-in has nowhere to be recorded.',
      })
      return
    }
    try {
      await publishGrant(store, result.session, Date.now())
    } catch (error) {
      ctx.logger.error(`dsh-login: could not store the granted session: ${(error as Error).message}`)
      writeFailure(response, {
        code: 'grant-storage',
        message: 'The session could not be stored on this machine. Try again.',
      })
      return
    }
    writeJson(response, 200, result)
  }
}

/**
 * Serve the sign-out, forwarding the browser's own bearer token.
 *
 * The token is taken from the incoming `authorization` header rather than
 * stored here: this plugin keeps no session state, and the browser is the only
 * place a granted token lives.
 * @param endpoint - the resolved logout URL, or undefined when the service has none.
 * @param config - the resolved plugin config.
 * @returns the route handler.
 */
export function logoutHandler(
  ctx: Context,
  endpoint: URL | undefined,
  config: ResolvedConfig,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (request, response) => {
    if (!isSameOriginRequest(request)) {
      writeJson(response, 403, { ok: false, message: 'cross-site request' } satisfies LogoutResult)
      return
    }
    if (request.method !== 'POST') {
      writeJson(response, 405, { ok: false, message: 'method not allowed' } satisfies LogoutResult)
      return
    }
    const bearer = request.headers.authorization
    if (bearer === undefined) {
      writeJson(response, 400, { ok: false, message: 'no bearer token' } satisfies LogoutResult)
      return
    }
    // The host copy goes first and unconditionally, before either answer
    // below: a login service that refuses or has no logout route must never
    // leave this machine holding a session the user has ended.
    const store = credentialStore(ctx)
    if (store !== undefined) {
      try {
        await revokeGrant(store, bearer)
      } catch (error) {
        ctx.logger.warn(`dsh-login: could not clear the stored session: ${(error as Error).message}`)
      }
    }
    if (endpoint === undefined) {
      // Configured without an upstream route: the browser has already signed
      // itself out, and there is nothing to tell.
      writeJson(response, 200, { ok: true } satisfies LogoutResult)
      return
    }
    let upstream: Response
    try {
      upstream = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: { ...config.headers, authorization: bearer, accept: 'application/json' },
      })
    } catch {
      writeJson(response, 502, { ok: false, message: 'the login service could not be reached' } satisfies LogoutResult)
      return
    }
    writeJson(
      response,
      upstream.ok ? 200 : 502,
      upstream.ok ? { ok: true } : { ok: false, message: `the login service answered ${upstream.status}` },
    )
  }
}

/**
 * Serve the token check the browser runs on boot and on focus.
 *
 * The bearer comes from the incoming header; no session is stored here. The
 * answer separates a refusal from an outage because only the first may end a
 * session.
 *
 * `revalidateIntervalMs` is enforced here rather than in the browser because
 * the client bundle receives no plugin config. The browser may ask on every tab
 * switch; a repeat check of the same token inside that window is answered from
 * the last positive result instead of calling the login service again.
 *
 * The cost, stated plainly: a token revoked at the login service keeps passing
 * revalidation until the window elapses. That is what the rate limit buys, and
 * it bounds how stale an answer can be — it does not make one authoritative.
 * The memo only ever caches a pass, never a refusal, and holds one token at a
 * time.
 * @param endpoint - the resolved validation URL, or undefined when the service has none.
 * @param config - the resolved plugin config.
 * @param now - reads the current instant; injected so the window is testable.
 * @returns the route handler.
 */
export function validateHandler(
  endpoint: URL | undefined,
  config: ResolvedConfig,
  now: () => number = Date.now,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  let lastPass: { token: string, at: number } | undefined
  return async (request, response) => {
    if (!isSameOriginRequest(request)) {
      writeJson(response, 403, { ok: false, reason: 'rejected', message: 'cross-site request' } satisfies ValidateResult)
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      writeJson(response, 405, { ok: false, reason: 'unreachable', message: 'method not allowed' } satisfies ValidateResult)
      return
    }
    const bearer = request.headers.authorization
    if (bearer === undefined) {
      writeJson(response, 400, { ok: false, reason: 'unreachable', message: 'no bearer token' } satisfies ValidateResult)
      return
    }
    if (endpoint === undefined) {
      // No route to ask: a session cannot be disproved, and answering
      // "rejected" here would sign out every user of a service that simply
      // does not offer this check.
      writeJson(response, 200, { ok: true } satisfies ValidateResult)
      return
    }
    if (lastPass !== undefined && lastPass.token === bearer && now() - lastPass.at < config.revalidateIntervalMs) {
      writeJson(response, 200, { ok: true } satisfies ValidateResult)
      return
    }
    let upstream: Response
    try {
      upstream = await fetch(endpoint, {
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: { ...config.headers, authorization: bearer, accept: 'application/json' },
      })
    } catch {
      writeJson(response, 200, {
        ok: false,
        reason: 'unreachable',
        message: 'the login service could not be reached',
      } satisfies ValidateResult)
      return
    }
    if (upstream.ok) {
      lastPass = { token: bearer, at: now() }
      writeJson(response, 200, { ok: true } satisfies ValidateResult)
      return
    }
    const rejected = upstream.status === 401 || upstream.status === 403
    if (rejected && lastPass?.token === bearer) lastPass = undefined
    writeJson(response, 200, {
      ok: false,
      reason: rejected ? 'rejected' : 'unreachable',
      message: `the login service answered ${upstream.status}`,
    } satisfies ValidateResult)
  }
}

/**
 * Register the routes.
 *
 * The endpoint is resolved and validated here so a gate pointed at a malformed
 * URL fails at load, with the operator watching, rather than locking the first
 * user out of the app.
 * @param ctx - host cordis context carrying the route registry.
 * @param config - validated plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  const { url: endpoint, from } = resolveEndpoint(process.env, resolved)
  const logoutEndpoint = resolveLogoutEndpoint(resolved.logoutEndpoint)
  const validateEndpoint = resolveValidateEndpoint(resolved.validateEndpoint)
  assertTimeout(resolved.timeoutMs)
  assertSessionTtl(resolved.sessionTtlMs)
  assertRevalidateInterval(resolved.revalidateIntervalMs)
  ctx.logger.info(
    `login gate posts credentials to ${endpoint.href} `
    + `(from ${from === 'env' ? `$${resolved.endpointEnv}` : 'config.endpoint'})`,
  )
  if (credentialStore(ctx) === undefined) {
    // A diagnostic, not a gate: the seam may still mount after this plugin,
    // and the login attempt itself is the earliest point that can decide.
    ctx.logger.warn(
      'dsh-login: no credentials service is mounted yet; host-side plugins cannot use the signed-in session '
      + 'until one is (mount @deepseek-ai/dsh-credentials-local)',
    )
  }

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: FORM_ROUTE, handler: formHandler(resolved) }),
    `dsh-login: ${FORM_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: AUTHENTICATE_ROUTE,
      handler: authenticateHandler(ctx, endpoint, resolved),
    }),
    `dsh-login: ${AUTHENTICATE_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: LOGOUT_ROUTE,
      handler: logoutHandler(ctx, logoutEndpoint, resolved),
    }),
    `dsh-login: ${LOGOUT_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: VALIDATE_ROUTE,
      handler: validateHandler(validateEndpoint, resolved),
    }),
    `dsh-login: ${VALIDATE_ROUTE} route`,
  )
}
