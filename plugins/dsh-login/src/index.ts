/**
 * dsh-login host half: the two routes behind the login gate.
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
import z from '@deepseek-ai/schemastery'
import { buildUpstreamPayload, interpretUpstream, LoginRequestError, parseCredentials } from './auth.ts'
import { assertSessionTtl, assertTimeout, resolveEndpoint, sessionLifetime } from './config.ts'
import { isSameOriginRequest } from './fence.ts'
import { readJsonBody, writeJson } from './http.ts'
import { AUTHENTICATE_ROUTE, FORM_ROUTE } from './wire.ts'
import type { AuthenticateResult, LoginError, LoginForm } from './wire.ts'

export type { CredentialFields, AnswerReading, UpstreamAnswer } from './auth.ts'
export { buildUpstreamPayload, interpretUpstream, LoginRequestError, parseCredentials, pickToken, withoutPath } from './auth.ts'
export { assertSessionTtl, assertTimeout, resolveEndpoint, sessionLifetime } from './config.ts'
export { isSameOriginRequest } from './fence.ts'
export { AUTHENTICATE_ROUTE, FORM_ROUTE } from './wire.ts'
export type {
  AuthenticatedSession, AuthenticateResult, Credentials, LoginError, LoginErrorCode, LoginForm,
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
function formHandler(config: ResolvedConfig): (req: IncomingMessage, res: ServerResponse) => void {
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
 * @param endpoint - the resolved endpoint URL.
 * @param config - the resolved plugin config.
 * @returns the route handler.
 */
function authenticateHandler(
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
    if (result.ok) {
      writeJson(response, 200, result)
      return
    }
    writeFailure(response, result.error)
  }
}

/**
 * Register both routes.
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
  assertTimeout(resolved.timeoutMs)
  assertSessionTtl(resolved.sessionTtlMs)
  ctx.logger.info(
    `login gate posts credentials to ${endpoint.href} `
    + `(from ${from === 'env' ? `$${resolved.endpointEnv}` : 'config.endpoint'})`,
  )

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: FORM_ROUTE, handler: formHandler(resolved) }),
    `dsh-login: ${FORM_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: AUTHENTICATE_ROUTE,
      handler: authenticateHandler(endpoint, resolved),
    }),
    `dsh-login: ${AUTHENTICATE_ROUTE} route`,
  )
}
