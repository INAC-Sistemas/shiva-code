/**
 * Load-time validation of the plugin config.
 *
 * Every check here fails the composition, not the first skill lookup. A skill
 * provider is read on the agent's step boundary, where a thrown error is a
 * warned-and-skipped provider — a bad endpoint would surface as skills that
 * quietly never appear, which is the hardest failure to trace back to a typo.
 * @module
 */

/** Hosts allowed to be reached over plain http. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Parse and check the library base URL.
 *
 * Plain http is refused off loopback. The bodies this endpoint serves are the
 * instructions that drive the agent, and they travel with the signed-in user's
 * bearer token attached; over http both are readable by anything on the path.
 * Loopback stays allowed because that is where the plugin manager runs in
 * development.
 * @param endpoint - the configured base URL.
 * @returns the parsed base, with a trailing slash so sub-paths append.
 * @throws Error when the value is not an absolute http(s) URL, or is http off loopback.
 */
export function resolveEndpoint(endpoint: string): URL {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error(`dsh-skill-library: endpoint is not an absolute URL: ${endpoint}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`dsh-skill-library: endpoint must be http(s), got ${url.protocol}`)
  }
  if (url.protocol === 'http:' && !LOOPBACK.has(url.hostname)) {
    throw new Error(
      `dsh-skill-library: endpoint must be https off loopback, got ${url.origin}. `
      + 'Skill bodies and the signed-in bearer token both travel on this request.',
    )
  }
  // A trailing slash makes `new URL('skills', base)` keep the base path instead
  // of replacing its last segment.
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url
}

/**
 * Reject a non-positive deadline; zero or negative would abort every request
 * before it is sent.
 * @param timeoutMs - the configured deadline.
 * @param field - config field name, for the error message.
 * @throws Error when the deadline is not a positive finite number.
 */
export function assertTimeout(timeoutMs: number, field: string): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `dsh-skill-library: ${field} must be a positive finite number, got ${timeoutMs}`,
    )
  }
}

/**
 * Reject a rank that cannot order candidates.
 * @param rank - the configured rank.
 * @throws Error when the rank is not a finite number.
 */
export function assertRank(rank: number): void {
  if (!Number.isFinite(rank)) {
    throw new Error(`dsh-skill-library: rank must be a finite number, got ${rank}`)
  }
}

/**
 * Reject a non-positive body cap; it would refuse every skill.
 * @param maxBodyBytes - the configured cap.
 * @throws Error when the cap is not a positive finite number.
 */
export function assertMaxBodyBytes(maxBodyBytes: number): void {
  if (!Number.isFinite(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error(
      `dsh-skill-library: maxBodyBytes must be a positive finite number, got ${maxBodyBytes}`,
    )
  }
}

/** Characters RFC 9110 allows in a field name. */
const FIELD_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * Reject unusable static headers.
 *
 * A configured `authorization` is rejected because the request is authenticated
 * with the signed-in user's session: a leftover static token would sit in front
 * of it and silently shadow whoever is signed in.
 * @param headers - the configured static headers.
 * @throws Error when a name is not a field name, a value is blank, or the name is `authorization`.
 */
export function assertHeaders(headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) {
    if (!FIELD_NAME.test(name)) {
      throw new Error(`dsh-skill-library: "${name}" is not a valid header name`)
    }
    if (name.toLowerCase() === 'authorization') {
      throw new Error(
        'dsh-skill-library: config.headers must not set "authorization"; the request is '
        + "authenticated with the signed-in user's session from dsh-login",
      )
    }
    if (value.trim() === '') {
      throw new Error(`dsh-skill-library: header "${name}" has a blank value`)
    }
  }
}
