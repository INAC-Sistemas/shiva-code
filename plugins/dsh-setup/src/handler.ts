/**
 * The routes behind the wizard.
 *
 * Nothing here invents storage. The chat key goes to the credentials service
 * under the reference the chat route's settings profile names, the chat model
 * to `agent-default-model`, the image key to `OPENROUTER_API_KEY` or `FAL_KEY`,
 * and the completion marker to the `shiva-setup` settings section. The image
 * model and the OpenViking endpoints are written by the browser through those
 * plugins' own routes, so each tool keeps a single writer for its settings.
 *
 * A key is kept only after its test passed. The chat test has to run with the
 * key stored — the adapter resolves it from the credentials service — so a
 * failed chat test puts back whatever the reference held before.
 * @module dsh-setup/handler
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isSameOriginRequest } from 'dsh-login'
import { SETUP_VERSION } from './plan.ts'
import {
  isHttpUrl, probeChat, probeCompletion, probeEmbedding, probeOpenRouterKey,
} from './probes.ts'
import type { FetchLike } from './probes.ts'
import { CHAT_PROVIDERS, deriveKeyRef } from './providers.ts'
import type { ConfigurableProvider, CredentialsFace, LlmFace, SetupServices } from './services.ts'
import {
  CHAT_CONNECT_ROUTE, CHAT_MODELS_ROUTE, CHAT_PROVIDERS_ROUTE, COMPLETE_ROUTE,
  IMAGE_CONNECT_ROUTE, IMAGE_KEY_REFS, MEMORY_TEST_ROUTE, STATE_ROUTE,
} from './wire.ts'
import type {
  ChatProviderOption, ChatProvidersResult, EndpointDraft, FailureResult, ImageProvider,
  MemoryTestResult, ModelsResult, OkResult, SetupState,
} from './wire.ts'

/** Tunables of the routes, resolved from the plugin config. */
export interface HandlerOptions {
  /** Deadline of each probe, in milliseconds. */
  timeoutMs: number
  /** OpenRouter API base the image key is checked against. */
  openrouterBaseUrl: string
  /** How long a newly configured chat route may take to register, in milliseconds. */
  routeWaitMs: number
  /** The fetch the probes call. */
  fetch: FetchLike
}

/** A route's answer: a status and a JSON body. */
type Answer = readonly [status: number, body: unknown]

/** Largest body a route reads; the largest request is two endpoint drafts. */
const MAX_BODY_BYTES = 64 * 1024

/**
 * Build a refusal answer.
 * @param status - the HTTP status.
 * @param message - the text the wizard shows.
 * @returns the answer.
 */
function fail(status: number, message: string): Answer {
  return [status, { ok: false, message } satisfies FailureResult]
}

/**
 * Write one JSON answer, never cached.
 * @param response - the response.
 * @param status - the HTTP status.
 * @param body - the body.
 */
function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': String(Buffer.byteLength(payload)),
  })
  response.end(payload)
}

/**
 * Read a bounded JSON object body.
 * @param request - the request.
 * @returns the object, `{}` for an empty body, or undefined when too large or malformed.
 */
async function readBody(request: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer
    size += buffer.byteLength
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  try {
    const value: unknown = JSON.parse(text)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Read one string field.
 * @param body - the request body.
 * @param key - the field.
 * @returns the trimmed string, or empty when absent or not a string.
 */
function text(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Follow a settings path inside a resolved section.
 * @param value - the section.
 * @param path - the path.
 * @returns the value at the path, or undefined.
 */
function atPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/**
 * Describe an error thrown by a service.
 * @param error - the rejection.
 * @returns its message.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** What the wizard needs to know about one chat route. */
interface ChatRoute {
  entry: ConfigurableProvider
  /** The reference the route's profile names, or undefined when it names none. */
  namedRef: string | undefined
  /** The reference a key for this route is stored under. */
  ref: string
}

/**
 * Resolve a chat route's settings address and credential reference.
 * @param services - the host services.
 * @param llm - the LLM runtime.
 * @param provider - the route id.
 * @returns the route, or undefined when no adapter declares it.
 */
function chatRoute(services: SetupServices, llm: LlmFace, provider: string): ChatRoute | undefined {
  const entry = llm.listConfigurableProviders().find(candidate => candidate.provider === provider)
  if (entry === undefined) return undefined
  const profile = atPath(services.settings()?.get(entry.settingsNs), entry.settingsPath)
  const named = typeof profile === 'object' && profile !== null
    ? (profile as { apiKeyEnv?: unknown }).apiKeyEnv
    : undefined
  const namedRef = typeof named === 'string' && named !== '' ? named : undefined
  return { entry, namedRef, ref: namedRef ?? deriveKeyRef(provider) }
}

/**
 * Whether a reference resolves, reading nothing but its description.
 * @param credentials - the credentials service.
 * @param ref - the reference.
 * @returns true when configured.
 */
async function configured(credentials: CredentialsFace, ref: string): Promise<boolean> {
  try {
    return (await credentials.describe(ref)).configured
  } catch {
    // The service refused to describe this reference; to the wizard that is
    // the same as a missing key, and the step offers the field to fix it.
    return false
  }
}

/**
 * Create the prefix handler serving every wizard route.
 * @param services - the host services, read per request.
 * @param options - the resolved tunables.
 * @returns the handler to register under `/setup/api`.
 */
export function createSetupHandler(
  services: SetupServices,
  options: HandlerOptions,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  /** Wait until a route the settings write just declared is registered. */
  const waitForRoute = async (llm: LlmFace, provider: string): Promise<boolean> => {
    const deadline = Date.now() + options.routeWaitMs
    for (;;) {
      if (llm.listProviders().some(candidate => candidate.id === provider)) return true
      if (Date.now() >= deadline) return false
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const state = async (): Promise<Answer> => {
    const credentials = services.credentials()
    const llm = services.llm()
    const selection = services.defaultModel()?.currentSelection()
    let ready = false
    if (llm !== undefined && selection !== undefined && credentials !== undefined) {
      const route = chatRoute(services, llm, selection.provider)
      const registered = llm.listProviders().some(candidate => candidate.id === selection.provider)
      // A route whose profile names no reference authenticates on its own
      // (ambient credentials); the Models page counts it usable the same way.
      ready = registered && route !== undefined
        && (route.namedRef === undefined || await configured(credentials, route.namedRef))
    }
    const marker = services.marker()?.get()
    return [200, {
      ok: true,
      chat: { ready, provider: selection?.provider ?? null, model: selection?.model ?? null },
      imageKeys: {
        openrouter: credentials === undefined ? false : await configured(credentials, IMAGE_KEY_REFS.openrouter),
        fal: credentials === undefined ? false : await configured(credentials, IMAGE_KEY_REFS.fal),
      },
      marker: {
        completedVersion: marker?.completedVersion ?? null,
        openviking: marker?.openviking ?? null,
      },
    } satisfies SetupState]
  }

  const chatProviders = async (): Promise<Answer> => {
    const llm = services.llm()
    const credentials = services.credentials()
    if (llm === undefined || credentials === undefined) {
      return fail(503, 'O serviço de modelos ainda está carregando. Tente de novo em instantes.')
    }
    const providers: ChatProviderOption[] = []
    for (const entry of CHAT_PROVIDERS) {
      const route = chatRoute(services, llm, entry.provider)
      if (route === undefined) continue
      providers.push({ ...entry, configured: await configured(credentials, route.ref) })
    }
    return [200, { ok: true, providers } satisfies ChatProvidersResult]
  }

  const chatModels = async (body: Record<string, unknown>): Promise<Answer> => {
    const llm = services.llm()
    if (llm === undefined) return fail(503, 'O serviço de modelos ainda está carregando.')
    const provider = text(body, 'provider')
    const route = chatRoute(services, llm, provider)
    if (route === undefined) return fail(404, `O provedor "${provider}" não está disponível nesta instalação.`)
    try {
      const models = await llm.discoverModels(route.entry.settingsNs, { provider })
      return [200, { ok: true, models: models.map(model => ({ id: model.id, name: model.name ?? model.id })) } satisfies ModelsResult]
    } catch {
      // No discovery for this namespace (the official DeepSeek adapter lists
      // through its registered route instead); fall through to that listing.
    }
    try {
      const models = await llm.listModels(provider)
      return [200, { ok: true, models: models.map(model => ({ id: model.id, name: model.name })) } satisfies ModelsResult]
    } catch {
      // An unregistered route has no listing; the wizard accepts a typed id.
      return [200, { ok: true, models: [] } satisfies ModelsResult]
    }
  }

  const chatConnect = async (body: Record<string, unknown>): Promise<Answer> => {
    const llm = services.llm()
    const credentials = services.credentials()
    const settings = services.settings()
    const defaultModel = services.defaultModel()
    if (llm === undefined || credentials === undefined || settings === undefined || defaultModel === undefined) {
      return fail(503, 'Os serviços de configuração ainda estão carregando. Tente de novo em instantes.')
    }
    const provider = text(body, 'provider')
    const model = text(body, 'model')
    const apiKey = text(body, 'apiKey')
    if (model === '') return fail(400, 'Escolha um modelo.')
    const route = chatRoute(services, llm, provider)
    if (route === undefined) return fail(404, `O provedor "${provider}" não está disponível nesta instalação.`)
    if (apiKey === '' && !await configured(credentials, route.ref)) return fail(400, 'Informe a chave de API.')

    // A profile that names no reference would authenticate from the process
    // environment and ignore the stored key, so it is pointed at the
    // reference before the key is stored — the same write the Models page makes.
    if (route.namedRef === undefined) {
      try {
        await settings.mutate(route.entry.settingsNs, [
          { op: 'set', path: [...route.entry.settingsPath, 'apiKeyEnv'], value: route.ref },
        ])
      } catch (error) {
        return fail(500, `Não foi possível salvar o provedor: ${messageOf(error)}`)
      }
    }

    const previous = apiKey === '' ? undefined : await credentials.resolve(route.ref)
    if (apiKey !== '') {
      try {
        await credentials.set(route.ref, apiKey)
      } catch (error) {
        return fail(409, `Não foi possível salvar a chave: ${messageOf(error)}`)
      }
    }

    const outcome = await waitForRoute(llm, provider)
      ? await probeChat(llm, provider, model, options.timeoutMs)
      : { ok: false as const, message: `O provedor "${provider}" não ficou disponível depois de configurado.` }
    if (!outcome.ok) {
      if (apiKey !== '') {
        // Put back what the reference held, so a rejected key never replaces a working one.
        await (previous === undefined
          ? credentials.unset(route.ref)
          : credentials.set(route.ref, previous.value)
        ).catch(() => undefined)
      }
      return fail(422, outcome.message)
    }

    try {
      await defaultModel.saveSelection({ provider, model })
    } catch (error) {
      return fail(500, `A chave funcionou, mas não foi possível salvar o modelo: ${messageOf(error)}`)
    }
    return [200, { ok: true } satisfies OkResult]
  }

  const imageConnect = async (body: Record<string, unknown>): Promise<Answer> => {
    const credentials = services.credentials()
    if (credentials === undefined) return fail(503, 'O serviço de credenciais ainda está carregando.')
    const provider = text(body, 'provider')
    if (provider !== 'openrouter' && provider !== 'fal') return fail(400, 'Provedor de imagem desconhecido.')
    const ref = IMAGE_KEY_REFS[provider as ImageProvider]
    const typed = text(body, 'apiKey')
    const key = typed !== '' ? typed : (await credentials.resolve(ref))?.value ?? ''
    if (key === '') return fail(400, 'Informe a chave de API.')

    // fal has no endpoint that checks a key without generating, so its key is
    // only required to be present; the first generation reports a bad one.
    if (provider === 'openrouter') {
      const outcome = await probeOpenRouterKey(options.fetch, options.openrouterBaseUrl, key, options.timeoutMs)
      if (!outcome.ok) return fail(422, outcome.message)
    }
    if (typed !== '') {
      try {
        await credentials.set(ref, typed)
      } catch (error) {
        return fail(409, `Não foi possível salvar a chave: ${messageOf(error)}`)
      }
    }
    return [200, { ok: true } satisfies OkResult]
  }

  /** Read one endpoint draft, filling a blank OpenRouter key from the stored one. */
  const endpoint = async (value: unknown, credentials: CredentialsFace | undefined): Promise<
    { ok: true, base: string, key: string, model: string } | { ok: false, message: string }
  > => {
    if (typeof value !== 'object' || value === null) return { ok: false, message: 'Configuração incompleta.' }
    const draft = value as Record<string, unknown> & Partial<EndpointDraft>
    const base = text(draft, 'api_base')
    const model = text(draft, 'model')
    if (!isHttpUrl(base)) return { ok: false, message: 'Informe um endereço http ou https válido.' }
    if (model === '') return { ok: false, message: 'Informe o modelo.' }
    let key = text(draft, 'api_key')
    if (key === '' && text(draft, 'provider') === 'openrouter') {
      key = (await credentials?.resolve(IMAGE_KEY_REFS.openrouter))?.value ?? ''
    }
    return { ok: true, base, key, model }
  }

  const memoryTest = async (body: Record<string, unknown>): Promise<Answer> => {
    const credentials = services.credentials()
    const embedding = await endpoint(body.embedding, credentials)
    if (!embedding.ok) return fail(400, `Embedding: ${embedding.message}`)
    const embedded = await probeEmbedding(options.fetch, embedding.base, embedding.key, embedding.model, options.timeoutMs)
    if (!embedded.ok) return fail(422, `Embedding: ${embedded.message}`)
    if (body.vlm !== undefined && body.vlm !== null) {
      const vlm = await endpoint(body.vlm, credentials)
      if (!vlm.ok) return fail(400, `VLM: ${vlm.message}`)
      const answered = await probeCompletion(options.fetch, vlm.base, vlm.key, vlm.model, options.timeoutMs)
      if (!answered.ok) return fail(422, `VLM: ${answered.message}`)
    }
    return [200, { ok: true, dimension: embedded.dimension } satisfies MemoryTestResult]
  }

  const complete = async (body: Record<string, unknown>): Promise<Answer> => {
    const marker = services.marker()
    if (marker === undefined) return fail(503, 'O serviço de configurações ainda está carregando.')
    const choice = body.openviking
    if (choice !== null && choice !== undefined && choice !== 'configured' && choice !== 'skipped') {
      return fail(400, 'Escolha de memória desconhecida.')
    }
    try {
      await marker.update({
        completedVersion: SETUP_VERSION,
        ...(choice === 'configured' || choice === 'skipped' ? { openviking: choice } : {}),
      })
    } catch (error) {
      return fail(500, `Não foi possível salvar a conclusão: ${messageOf(error)}`)
    }
    return [200, { ok: true } satisfies OkResult]
  }

  const routes: Record<string, (body: Record<string, unknown>) => Promise<Answer>> = {
    [STATE_ROUTE]: state,
    [CHAT_PROVIDERS_ROUTE]: chatProviders,
    [CHAT_MODELS_ROUTE]: chatModels,
    [CHAT_CONNECT_ROUTE]: chatConnect,
    [IMAGE_CONNECT_ROUTE]: imageConnect,
    [MEMORY_TEST_ROUTE]: memoryTest,
    [COMPLETE_ROUTE]: complete,
  }

  return async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://local').pathname
    const route = routes[path]
    if (route === undefined) return writeJson(response, 404, { ok: false, message: `rota desconhecida: ${path}` })
    if (request.method !== 'POST') return writeJson(response, 405, { ok: false, message: 'use POST' })
    if (!isSameOriginRequest(request)) return writeJson(response, 403, { ok: false, message: 'pedido de outra origem' })
    const body = await readBody(request)
    if (body === undefined) return writeJson(response, 400, { ok: false, message: 'corpo JSON inválido' })
    let answer: Answer
    try {
      answer = await route(body)
    } catch (error) {
      answer = fail(500, messageOf(error))
    }
    writeJson(response, answer[0], answer[1])
  }
}
