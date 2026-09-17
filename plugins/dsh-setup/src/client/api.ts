/**
 * The same-origin calls the wizard makes.
 *
 * Three hosts answer them: this plugin's own routes, and the `dsh-assets` and
 * `dsh-openviking` routes, which remain the single writers of their settings.
 * Those two plugins answer failures as `{ ok: false, error }`; this module
 * reads both spellings so every step shows one kind of message.
 * @module dsh-setup/client/api
 */
import type { FailureResult } from '../wire.ts'

/** `dsh-assets` status: its saved settings. */
export interface AssetsStatus {
  ok: true
  settings: { provider: string, imageModel: string }
}

/** `dsh-assets` model listing for one provider and kind. */
export interface AssetsModels {
  ok: true
  models: string[]
}

/** `dsh-openviking` status. */
export interface MemoryStatus {
  ok: true
  configured: boolean
  installed: boolean
  phase: string
  openrouterKey: boolean
}

/** `dsh-openviking` OpenRouter model listing. */
export interface MemoryModels {
  ok: true
  embedding: string[]
  vision: string[]
}

/** The `dsh-assets` status route. */
export const ASSETS_STATUS = '/assets/api/status'
/** The `dsh-assets` model listing route. */
export const ASSETS_MODELS = '/assets/api/models'
/** The `dsh-assets` settings route. */
export const ASSETS_CONFIG = '/assets/api/config'
/** The `dsh-openviking` status route. */
export const MEMORY_STATUS = '/openviking/api/status'
/** The `dsh-openviking` model listing route. */
export const MEMORY_MODELS = '/openviking/api/models'
/** The `dsh-openviking` settings route. */
export const MEMORY_CONFIGURE = '/openviking/api/configure'

/**
 * Read the failure text out of any answer.
 * @param body - the parsed body, when there was one.
 * @param status - the HTTP status.
 * @returns the message.
 */
function failureText(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const record = body as { message?: unknown, error?: unknown }
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return `O aplicativo respondeu ${status}.`
}

/**
 * POST JSON to a same-origin route.
 * @param path - the route.
 * @param body - the request body.
 * @param signal - aborts the request.
 * @returns the answer when it is `ok: true`, otherwise a failure with its message.
 */
export async function post<T extends { ok: true }>(
  path: string,
  body: unknown = {},
  signal?: AbortSignal,
): Promise<T | FailureResult> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'o pedido falhou' }
  }
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    parsed = undefined
  }
  if (response.ok && typeof parsed === 'object' && parsed !== null && (parsed as { ok?: unknown }).ok === true) {
    return parsed as T
  }
  return { ok: false, message: failureText(parsed, response.status) }
}

/**
 * Read another plugin's status route, telling "not loaded" apart from a failure.
 * @param path - the status route.
 * @param signal - aborts the request.
 * @returns the status, or null when the plugin does not serve the route (not
 * loaded by the active profile) or could not answer.
 */
export async function pluginStatus<T extends { ok: true }>(path: string, signal?: AbortSignal): Promise<T | null> {
  const answer = await post<T>(path, {}, signal)
  return answer.ok ? answer : null
}
