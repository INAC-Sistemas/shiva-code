/**
 * The credential exchange, as pure functions over data: what the browser is
 * allowed to post, what this plugin sends to the login endpoint, and how that
 * endpoint's answer becomes a session or a named failure.
 *
 * Both ends of the exchange are untrusted input — one arrives over HTTP from a
 * page, the other over HTTP from another service — so every field is validated
 * here rather than assumed from a type.
 * @module dsh-login/auth
 */
import type { AuthenticateResult, Credentials } from './wire.ts'

/** A rejected browser request; the route answers it as a 400. */
export class LoginRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoginRequestError'
  }
}

/** The field names the login endpoint expects in its JSON body. */
export interface CredentialFields {
  /** Field carrying the identifier (`email`, `username`, …). */
  identifierField: string
  /** Field carrying the secret. */
  passwordField: string
}

/** How an endpoint answer is read. */
export interface AnswerReading {
  /** Dot path to the token inside the answer (`token`, `data.accessToken`, …). */
  tokenPath: string
  /** Lifetime handed to the browser with a granted session. */
  lifetimeMs: number | null
}

/** One upstream answer, already read off the wire. */
export interface UpstreamAnswer {
  status: number
  /** Parsed JSON body, or undefined when the answer was not JSON. */
  body: unknown
}

/**
 * Validate one posted login attempt.
 *
 * Blank fields are refused here instead of at the endpoint: an empty password
 * is never a login, and forwarding it spends a request and an audit-log row on
 * a user who has simply not typed yet.
 * @param body - the parsed request body.
 * @returns the validated credentials.
 * @throws LoginRequestError when either field is missing, not a string, or blank.
 */
export function parseCredentials(body: unknown): Credentials {
  if (typeof body !== 'object' || body === null) {
    throw new LoginRequestError('the request body must be a JSON object')
  }
  const record = body as Record<string, unknown>
  const identifier = record['identifier']
  const password = record['password']
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    throw new LoginRequestError('`identifier` must be a non-empty string')
  }
  if (typeof password !== 'string' || password === '') {
    throw new LoginRequestError('`password` must be a non-empty string')
  }
  return { identifier: identifier.trim(), password }
}

/**
 * Map the credentials onto the field names the endpoint expects.
 * @param credentials - the validated attempt.
 * @param fields - the configured field names.
 * @returns the JSON body to post.
 */
export function buildUpstreamPayload(credentials: Credentials, fields: CredentialFields): Record<string, string> {
  return {
    [fields.identifierField]: credentials.identifier,
    [fields.passwordField]: credentials.password,
  }
}

/**
 * Split a dot path into its segments.
 * @param path - the configured path.
 * @returns the non-empty segments, in order.
 */
function segmentsOf(path: string): string[] {
  return path.split('.').filter(segment => segment !== '')
}

/**
 * Read the token out of an answer.
 *
 * Traversal is own-property only, so a path like `constructor.name` reads
 * nothing rather than a prototype member.
 * @param body - the parsed answer.
 * @param path - dot path to the token.
 * @returns the token, or undefined when the path is absent or does not hold a non-empty string.
 */
export function pickToken(body: unknown, path: string): string | undefined {
  let cursor: unknown = body
  for (const segment of segmentsOf(path)) {
    if (typeof cursor !== 'object' || cursor === null) return undefined
    if (!Object.prototype.hasOwnProperty.call(cursor, segment)) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return typeof cursor === 'string' && cursor !== '' ? cursor : undefined
}

/**
 * Copy an answer without the value at one path.
 *
 * The copy is structural along the path only — untouched branches stay the
 * same references, which is enough because the result is serialized straight
 * back to the browser.
 * @param body - the parsed answer.
 * @param path - dot path to drop.
 * @returns the answer without that leaf, or the answer itself when the path is absent.
 */
export function withoutPath(body: unknown, path: string): unknown {
  const segments = segmentsOf(path)
  if (segments.length === 0) return body
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return body
  const [head, ...rest] = segments as [string, ...string[]]
  const record = body as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(record, head)) return body
  const copy = { ...record }
  if (rest.length === 0) {
    delete copy[head]
    return copy
  }
  copy[head] = withoutPath(record[head], rest.join('.'))
  return copy
}

/**
 * Turn one endpoint answer into the route's result.
 *
 * A 2xx without a usable token is a failure, not a login: the gate exists to
 * keep unauthenticated people out, so an answer this plugin cannot read is
 * treated as a refusal and named as a misconfiguration.
 * @param answer - status and parsed body from the endpoint.
 * @param reading - the token path and the session lifetime to grant.
 * @returns the session, or the named failure.
 */
export function interpretUpstream(answer: UpstreamAnswer, reading: AnswerReading): AuthenticateResult {
  if (answer.status === 401 || answer.status === 403) {
    return { ok: false, error: { code: 'invalid-credentials', message: messageOf(answer.body) ?? 'Invalid credentials.' } }
  }
  if (answer.status < 200 || answer.status > 299) {
    return {
      ok: false,
      error: {
        code: 'upstream',
        message: messageOf(answer.body) ?? `The login service answered ${answer.status}.`,
      },
    }
  }
  const token = pickToken(answer.body, reading.tokenPath)
  if (token === undefined) {
    return {
      ok: false,
      error: {
        code: 'malformed',
        message: `The login service accepted the credentials but returned no token at \`${reading.tokenPath}\`.`,
      },
    }
  }
  const user = withoutPath(answer.body, reading.tokenPath)
  return {
    ok: true,
    session: {
      token,
      user: typeof user === 'object' && user !== null ? user : null,
      expiresInMs: reading.lifetimeMs,
    },
  }
}

/**
 * Read a human-readable refusal out of an answer body.
 *
 * Only `message` and `error` (when it is a string) are read: anything else is
 * this plugin guessing at another service's schema, and a wrong guess puts
 * unrelated text in front of the user.
 * @param body - the parsed answer.
 * @returns the message, or undefined when the body carries none.
 */
function messageOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const record = body as Record<string, unknown>
  const message = record['message'] ?? record['error']
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}
