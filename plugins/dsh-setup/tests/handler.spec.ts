import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSetupHandler } from '../src/handler.ts'
import { SETUP_VERSION } from '../src/plan.ts'
import type { FetchLike } from '../src/probes.ts'
import type {
  CredentialsFace, DefaultModelFace, LlmFace, SettingsFace, SettingsScopeFace, StoredMarker,
} from '../src/services.ts'

/** In-memory stand-ins for the host services, wired the way the harness wires them. */
function fakeHost() {
  const refs = new Map<string, string>([['DEEPSEEK_API_KEY', 'good-deepseek']])
  const sections = new Map<string, Record<string, unknown>>([
    ['llm-deepseek', { apiKeyEnv: 'DEEPSEEK_API_KEY' }],
    ['llm-pi-ai', { providers: {} }],
  ])
  let selection = { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
  let stored: StoredMarker = {}
  const requests: Array<{ provider: string, model: string }> = []

  const credentials: CredentialsFace = {
    resolve: async ref => refs.has(ref) ? { value: refs.get(ref)!, source: 'file' } : undefined,
    describe: async ref => ({ configured: refs.has(ref), writable: true }),
    set: async (ref, value) => { refs.set(ref, value) },
    unset: async (ref) => { refs.delete(ref) },
  }
  const settings: SettingsFace = {
    get: ns => sections.get(ns),
    mutate: async (ns, ops) => {
      const section = structuredClone(sections.get(ns) ?? {})
      for (const op of ops) {
        let node = section
        for (const segment of op.path.slice(0, -1)) {
          node[segment] ??= {}
          node = node[segment] as Record<string, unknown>
        }
        if (op.op === 'set') node[op.path.at(-1)!] = op.value
      }
      sections.set(ns, section)
    },
  }
  const piAiProfiles = () => (sections.get('llm-pi-ai')!.providers ?? {}) as Record<string, { apiKeyEnv?: string }>
  const llm: LlmFace = {
    listProviders: () => [
      { id: 'deepseek-official', name: 'DeepSeek' },
      ...Object.keys(piAiProfiles()).map(id => ({ id, name: id })),
    ],
    listConfigurableProviders: () => [
      { provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [] },
      { provider: 'openai', displayName: 'openai', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'] },
    ],
    discoverModels: async (ns, request) => {
      if (ns !== 'llm-pi-ai') throw new Error('no discovery')
      return [{ id: `${request.provider}-model` }]
    },
    listModels: async provider => [{ id: `${provider}-listed`, name: 'Listed' }],
    async* stream(options) {
      requests.push({ provider: options.provider, model: options.model })
      const ref = options.provider === 'deepseek-official' ? 'DEEPSEEK_API_KEY' : piAiProfiles()[options.provider]?.apiKeyEnv
      const key = ref === undefined ? undefined : refs.get(ref)
      yield key?.startsWith('good') === true
        ? { type: 'finish', reason: { kind: 'stop' } }
        : { type: 'finish', reason: { kind: 'error', failure: { message: 'invalid api key' } } }
    },
  }
  const defaultModel: DefaultModelFace = {
    currentSelection: () => selection,
    saveSelection: async (next) => { selection = next },
  }
  const marker: SettingsScopeFace<StoredMarker> = {
    get: () => stored,
    update: async (patch) => { stored = { ...stored, ...patch } },
  }
  const fetchCalls: string[] = []
  const fetch: FetchLike = async (url, init) => {
    fetchCalls.push(url)
    const auth = (init.headers as Record<string, string>).authorization
    if (url.endsWith('/key')) return Response.json({}, { status: auth === 'Bearer good-or' ? 200 : 401 })
    if (url.endsWith('/embeddings')) return Response.json({ data: [{ embedding: [1, 2, 3, 4] }] }, { status: auth === 'Bearer good-or' ? 200 : 401 })
    return Response.json({}, { status: 404 })
  }
  return {
    refs, sections, requests, fetchCalls,
    selection: () => selection,
    services: {
      settings: () => settings,
      credentials: () => credentials,
      llm: () => llm,
      defaultModel: () => defaultModel,
      marker: () => marker,
    },
    fetch,
  }
}

let host: ReturnType<typeof fakeHost>
let base: string
let close: () => Promise<void>

beforeEach(async () => {
  host = fakeHost()
  const handler = createSetupHandler(host.services, {
    timeoutMs: 1_000,
    routeWaitMs: 200,
    openrouterBaseUrl: 'https://openrouter.test/api/v1',
    fetch: host.fetch,
  })
  const server = createServer((request, response) => { void handler(request, response) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  close = () => new Promise(resolve => server.close(() => resolve()))
})

afterEach(async () => { await close() })

/** POST one wizard route. */
async function call(path: string, body: unknown = {}, headers: Record<string, string> = {}) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

describe('state', () => {
  it('reports a working default chat route and an unfinished marker', async () => {
    const { body } = await call('/setup/api/state')
    expect(body).toEqual({
      ok: true,
      chat: { ready: true, provider: 'deepseek-official', model: 'deepseek-v4-pro' },
      imageKeys: { openrouter: false, fal: false },
      marker: { completedVersion: null, openviking: null },
    })
  })

  it('reports chat as not ready when the named credential is missing', async () => {
    host.refs.delete('DEEPSEEK_API_KEY')
    expect((await call('/setup/api/state')).body.chat).toMatchObject({ ready: false })
  })
})

describe('chat', () => {
  it('lists only the providers an adapter declares, with their key state', async () => {
    const { body } = await call('/setup/api/chat/providers')
    expect(body.providers).toEqual([
      { provider: 'deepseek-official', displayName: 'DeepSeek', kind: 'Fabricante', configured: true },
      { provider: 'openai', displayName: 'OpenAI', kind: 'Fabricante', configured: false },
    ])
  })

  it('lists models through discovery, falling back to the registered route', async () => {
    expect((await call('/setup/api/chat/models', { provider: 'openai' })).body.models).toEqual([{ id: 'openai-model', name: 'openai-model' }])
    expect((await call('/setup/api/chat/models', { provider: 'deepseek-official' })).body.models).toEqual([{ id: 'deepseek-official-listed', name: 'Listed' }])
  })

  it('declares the route, stores the key, tests it and saves the selection', async () => {
    const { status } = await call('/setup/api/chat/connect', { provider: 'openai', model: 'gpt-5', apiKey: 'good-openai' })
    expect(status).toBe(200)
    expect(host.sections.get('llm-pi-ai')).toEqual({ providers: { openai: { apiKeyEnv: 'OPENAI_API_KEY' } } })
    expect(host.refs.get('OPENAI_API_KEY')).toBe('good-openai')
    expect(host.requests).toEqual([{ provider: 'openai', model: 'gpt-5' }])
    expect(host.selection()).toEqual({ provider: 'openai', model: 'gpt-5' })
  })

  it('puts the previous key back and keeps the selection when the test fails', async () => {
    const { status, body } = await call('/setup/api/chat/connect', { provider: 'deepseek-official', model: 'deepseek-v4-flash', apiKey: 'bad' })
    expect(status).toBe(422)
    expect(body).toEqual({ ok: false, message: 'invalid api key' })
    expect(host.refs.get('DEEPSEEK_API_KEY')).toBe('good-deepseek')
    expect(host.selection()).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
  })

  it('removes a rejected key that had nothing to replace', async () => {
    expect((await call('/setup/api/chat/connect', { provider: 'openai', model: 'gpt-5', apiKey: 'bad' })).status).toBe(422)
    expect(host.refs.has('OPENAI_API_KEY')).toBe(false)
  })

  it('requires a key when none is stored', async () => {
    const { status, body } = await call('/setup/api/chat/connect', { provider: 'openai', model: 'gpt-5' })
    expect(status).toBe(400)
    expect(body.message).toBe('Informe a chave de API.')
    expect(host.requests).toEqual([])
  })
})

describe('image', () => {
  it('stores an OpenRouter key only after OpenRouter accepts it', async () => {
    expect((await call('/setup/api/image/connect', { provider: 'openrouter', apiKey: 'bad-or' })).status).toBe(422)
    expect(host.refs.has('OPENROUTER_API_KEY')).toBe(false)
    expect((await call('/setup/api/image/connect', { provider: 'openrouter', apiKey: 'good-or' })).status).toBe(200)
    expect(host.refs.get('OPENROUTER_API_KEY')).toBe('good-or')
  })

  it('stores a fal key without a network test', async () => {
    expect((await call('/setup/api/image/connect', { provider: 'fal', apiKey: 'fal-key' })).status).toBe(200)
    expect(host.refs.get('FAL_KEY')).toBe('fal-key')
    expect(host.fetchCalls).toEqual([])
  })

  it('writes no reference outside the two image keys', async () => {
    expect((await call('/setup/api/image/connect', { provider: 'DEEPSEEK', apiKey: 'x' })).status).toBe(400)
    expect(host.refs.get('DEEPSEEK_API_KEY')).toBe('good-deepseek')
  })
})

describe('memory', () => {
  it('fills a blank OpenRouter key from the stored one and reports the width', async () => {
    host.refs.set('OPENROUTER_API_KEY', 'good-or')
    const { body } = await call('/setup/api/memory/test', {
      embedding: { provider: 'openrouter', api_base: 'https://openrouter.test/api/v1', api_key: '', model: 'openai/text-embedding-3-small' },
    })
    expect(body).toEqual({ ok: true, dimension: 4 })
  })

  it('refuses a non-http endpoint before calling it', async () => {
    const { status } = await call('/setup/api/memory/test', {
      embedding: { provider: 'custom', api_base: 'file:///etc', api_key: '', model: 'm' },
    })
    expect(status).toBe(400)
    expect(host.fetchCalls).toEqual([])
  })
})

describe('complete', () => {
  it('records the current wizard version and the memory choice', async () => {
    expect((await call('/setup/api/complete', { openviking: 'skipped' })).status).toBe(200)
    expect((await call('/setup/api/state')).body.marker).toEqual({ completedVersion: SETUP_VERSION, openviking: 'skipped' })
  })
})

describe('request fence', () => {
  it('refuses a cross-site browser request', async () => {
    expect((await call('/setup/api/complete', {}, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
  })

  it('answers unknown routes and other methods', async () => {
    expect((await call('/setup/api/nope')).status).toBe(404)
    expect((await fetch(`${base}/setup/api/state`)).status).toBe(405)
  })
})
