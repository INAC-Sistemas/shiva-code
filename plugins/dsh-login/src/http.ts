/**
 * The node:http plumbing the two routes share: a bounded JSON body reader and
 * a JSON writer. Host-only — the client bundle never imports this module.
 * @module dsh-login/http
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { LoginRequestError } from './auth.ts'

/**
 * Largest credential post this plugin reads. A login body is two short
 * strings; anything larger is a mistake or an attempt to make the harness hold
 * a big buffer, and reading it to the end would be the cost either way.
 */
export const MAX_BODY_BYTES = 16 * 1024

/**
 * Read a request body as JSON.
 * @param request - the incoming request.
 * @returns the parsed value.
 * @throws LoginRequestError when the body exceeds {@link MAX_BODY_BYTES} or is not JSON.
 */
export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer
    size += buffer.byteLength
    if (size > MAX_BODY_BYTES) throw new LoginRequestError('the request body is too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') throw new LoginRequestError('the request body is empty')
  try {
    return JSON.parse(text)
  } catch {
    throw new LoginRequestError('the request body is not valid JSON')
  }
}

/**
 * Write one JSON answer.
 *
 * `no-store` is unconditional: both routes describe or grant a session, and
 * neither belongs in a shared cache.
 * @param response - the server response.
 * @param status - the HTTP status.
 * @param body - the value to serialize.
 */
export function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': String(Buffer.byteLength(payload)),
  })
  response.end(payload)
}
