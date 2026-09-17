/**
 * The light tests each step runs before it saves anything.
 *
 * Every probe spends at most one small request, and each answers a message
 * written for the person, never a stack. A model listing is not a test: most
 * catalogs are public or shipped with the adapter, so a wrong key would pass.
 * @module dsh-setup/probes
 */
import type { FinishChunk, LlmFace } from './services.ts'

/** A probe outcome. */
export type ProbeResult = { ok: true } | { ok: false, message: string }

/** The `fetch` a probe calls; injected so tests need no network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

/**
 * Read a failure message out of a JSON error answer.
 * @param response - the refused response.
 * @returns the provider's own message when it sent one, else the status.
 */
async function refusal(response: Response): Promise<string> {
  let detail = ''
  try {
    const body = await response.json() as { error?: { message?: unknown } | string, message?: unknown }
    if (typeof body.error === 'string') detail = body.error
    else if (typeof body.error?.message === 'string') detail = body.error.message
    else if (typeof body.message === 'string') detail = body.message
  } catch {
    // A non-JSON error page; the status alone is still an answer.
  }
  const hint = response.status === 401 || response.status === 403 ? ' Confira a chave.' : ''
  return `O provedor respondeu ${response.status}${detail === '' ? '' : `: ${detail}`}.${hint}`
}

/**
 * Describe a transport failure.
 * @param error - what `fetch` threw.
 * @param url - the address that failed.
 * @returns the message to show.
 */
function unreachable(error: unknown, url: string): string {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return `${url} não respondeu a tempo.`
  }
  return `Não foi possível acessar ${url}: ${error instanceof Error ? error.message : String(error)}.`
}

/**
 * Join an API base and a path without doubling the slash.
 * @param base - the base URL the person typed or a preset supplied.
 * @param path - the path starting with `/`.
 * @returns the full URL.
 */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}

/**
 * Whether a base URL is one the probes may call.
 * @param base - the typed base URL.
 * @returns true for an absolute http or https URL.
 */
export function isHttpUrl(base: string): boolean {
  try {
    const url = new URL(base)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Send one tiny chat request through the harness itself, which is the only
 * test that holds for every adapter: it resolves the stored credential, the
 * route and the model exactly the way a conversation will.
 * @param llm - the LLM runtime.
 * @param provider - the registered route.
 * @param model - the model id.
 * @param timeoutMs - the deadline for the whole request.
 * @returns whether the route answered.
 */
export async function probeChat(llm: LlmFace, provider: string, model: string, timeoutMs: number): Promise<ProbeResult> {
  const signal = AbortSignal.timeout(timeoutMs)
  let finish: FinishChunk | undefined
  try {
    for await (const chunk of llm.stream({
      provider,
      model,
      maxTokens: 16,
      signal,
      messages: [{
        id: `dsh-setup-probe-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: 'Responda apenas: ok' }],
        source: { kind: 'user' },
      }],
    })) {
      if (chunk.type === 'finish') finish = chunk as FinishChunk
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
  if (finish === undefined) return { ok: false, message: 'O modelo encerrou a resposta sem concluir.' }
  if (finish.reason.kind === 'error' || finish.reason.kind === 'aborted') {
    const message = finish.reason.failure?.message
    return {
      ok: false,
      message: signal.aborted
        ? 'O modelo não respondeu a tempo.'
        : message ?? 'O modelo recusou o pedido de teste.',
    }
  }
  return { ok: true }
}

/**
 * Check an OpenRouter key against the endpoint that describes the key itself.
 * @param fetchImpl - the fetch to call.
 * @param baseUrl - the OpenRouter API base.
 * @param apiKey - the key under test.
 * @param timeoutMs - the deadline.
 * @returns whether OpenRouter accepted the key.
 */
export async function probeOpenRouterKey(
  fetchImpl: FetchLike,
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
): Promise<ProbeResult> {
  const url = joinUrl(baseUrl, '/key')
  let response: Response
  try {
    response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    return { ok: false, message: unreachable(error, url) }
  }
  return response.ok ? { ok: true } : { ok: false, message: await refusal(response) }
}

/**
 * Embed one word, which proves the endpoint, the key and the model together
 * and reports the vector width OpenViking has to be configured with.
 * @param fetchImpl - the fetch to call.
 * @param base - the OpenAI-compatible API base.
 * @param apiKey - the key, or empty for an endpoint without one.
 * @param model - the embedding model.
 * @param timeoutMs - the deadline.
 * @returns the embedding width, or why it failed.
 */
export async function probeEmbedding(
  fetchImpl: FetchLike,
  base: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
): Promise<{ ok: true, dimension: number } | { ok: false, message: string }> {
  const url = joinUrl(base, '/embeddings')
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(apiKey === '' ? {} : { authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({ model, input: 'ok' }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    return { ok: false, message: unreachable(error, url) }
  }
  if (!response.ok) return { ok: false, message: await refusal(response) }
  let vector: unknown
  try {
    const body = await response.json() as { data?: Array<{ embedding?: unknown }> }
    vector = body.data?.[0]?.embedding
  } catch {
    vector = undefined
  }
  if (!Array.isArray(vector) || vector.length === 0) {
    return { ok: false, message: `${url} respondeu, mas não devolveu um embedding. Confira se o modelo é de embedding.` }
  }
  return { ok: true, dimension: vector.length }
}

/**
 * Ask a vision-language model for one short completion.
 * @param fetchImpl - the fetch to call.
 * @param base - the OpenAI-compatible API base.
 * @param apiKey - the key, or empty for an endpoint without one.
 * @param model - the model.
 * @param timeoutMs - the deadline.
 * @returns whether the endpoint answered.
 */
export async function probeCompletion(
  fetchImpl: FetchLike,
  base: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
): Promise<ProbeResult> {
  const url = joinUrl(base, '/chat/completions')
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(apiKey === '' ? {} : { authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'Responda apenas: ok' }] }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    return { ok: false, message: unreachable(error, url) }
  }
  return response.ok ? { ok: true } : { ok: false, message: await refusal(response) }
}
