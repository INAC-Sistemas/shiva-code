/**
 * Same-origin fence for the two login routes.
 *
 * The authenticate route spends a credential attempt against the login service
 * on whatever a caller posts, so a page on another site must not be able to
 * drive it through a logged-in browser — that is credential stuffing with
 * someone else's browser paying for it. The fence reads the browser's own
 * markers: `Sec-Fetch-Site` names the relationship directly, and `Origin` is
 * compared against the `Host` the request was sent to for older browsers that
 * send one without the other. A caller with neither marker (curl, a script) is
 * allowed through: this is a cross-site defense, not authentication, and the
 * request still has to satisfy the login service.
 * @module dsh-login/fence
 */

/** The request facts the fence reads. */
export interface FenceRequest {
  headers: Record<string, string | string[] | undefined>
}

/**
 * Read one header as a string.
 * @param headers - the request headers.
 * @param name - lowercase header name.
 * @returns the value, or undefined when absent or repeated.
 */
function header(headers: FenceRequest['headers'], name: string): string | undefined {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

/**
 * Decide whether one request may reach the login routes.
 * @param request - the incoming request's headers.
 * @returns true when the request is not a cross-site browser request.
 */
export function isSameOriginRequest(request: FenceRequest): boolean {
  const site = header(request.headers, 'sec-fetch-site')
  if (site !== undefined) return site === 'same-origin' || site === 'none'
  const origin = header(request.headers, 'origin')
  if (origin === undefined) return true
  const host = header(request.headers, 'host')
  if (host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
