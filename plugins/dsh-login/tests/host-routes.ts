/**
 * Shared doubles for driving the host route handlers: a request, a response
 * that captures what was written, and a credential store over a Map.
 *
 * Not a spec file — vitest's `include` only picks up `tests/**\/*.spec.ts`.
 * @module dsh-login/tests/host-routes
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { CredentialKey, CredentialRecord } from '@deepseek-ai/dsh-credentials'
import { loginRecordKey } from '../src/vps-auth.ts'
import type { LoginCredentialStore } from '../src/vps-auth.ts'

/** A credential store over a Map, with its contents exposed for assertions. */
export interface FakeStore extends LoginCredentialStore {
  readonly records: Map<CredentialKey, CredentialRecord>
}

/**
 * Build a store holding at most one record at this plugin's key.
 * @param seed - the record to start with, if any.
 * @returns the store, with its map exposed.
 */
export function storeOf(seed?: CredentialRecord): FakeStore {
  const records = new Map<CredentialKey, CredentialRecord>()
  if (seed !== undefined) records.set(loginRecordKey(), seed)
  return {
    records,
    readRecord(key) {
      return Promise.resolve(records.get(key))
    },
    async modifyRecord(key, mutate) {
      const next = await mutate(records.get(key))
      if (next !== undefined) records.set(key, next)
      return next
    },
    deleteRecord(key) {
      records.delete(key)
      return Promise.resolve()
    },
  }
}

/** What a handler wrote back. */
export interface Written {
  status: number
  body: unknown
}

/** A `ServerResponse` stand-in that records the single answer written to it. */
export interface FakeResponse extends ServerResponse {
  /** The answer, once the handler has written one. */
  readonly written: Written | undefined
}

/**
 * Build a response double.
 * @returns the response, with the captured answer readable as `written`.
 */
export function responseOf(): FakeResponse {
  let status = 0
  const response = {
    written: undefined as Written | undefined,
    writeHead(code: number) {
      status = code
      return response
    },
    end(payload?: string) {
      response.written = { status, body: payload === undefined ? undefined : JSON.parse(payload) }
      return response
    },
  }
  return response as unknown as FakeResponse
}

/**
 * Build a request double that passes the same-origin fence.
 * @param method - the HTTP method.
 * @param headers - request headers; `sec-fetch-site` defaults to same-origin.
 * @param body - a JSON body the handler may read, for POST routes.
 * @returns the request.
 */
export function requestOf(
  method: string,
  headers: Record<string, string> = {},
  body?: unknown,
): IncomingMessage {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    method,
    headers: { 'sec-fetch-site': 'same-origin', ...headers },
    [Symbol.asyncIterator]: () => chunks[Symbol.iterator](),
  } as unknown as IncomingMessage
}

/**
 * Build the host context double the handlers take.
 * @param store - the credential store to answer `ctx.get('credentials')` with.
 * @returns the context, plus the logger lines it collected.
 */
export function contextOf(store: LoginCredentialStore | undefined): Context & { logs: string[] } {
  const logs: string[] = []
  return {
    logs,
    get: (name: string) => (name === 'credentials' ? store : undefined),
    logger: {
      info: (line: string) => void logs.push(`info ${line}`),
      warn: (line: string) => void logs.push(`warn ${line}`),
      error: (line: string) => void logs.push(`error ${line}`),
    },
  } as unknown as Context & { logs: string[] }
}
