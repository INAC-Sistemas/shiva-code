import { describe, expect, it } from 'vitest'
import {
  isHttpUrl, joinUrl, probeChat, probeCompletion, probeEmbedding, probeOpenRouterKey,
} from '../src/probes.ts'
import type { FetchLike } from '../src/probes.ts'
import type { LlmFace } from '../src/services.ts'

/** A fetch that records its calls and answers one JSON response. */
function fakeFetch(status: number, body: unknown): FetchLike & { calls: Array<{ url: string, init: RequestInit }> } {
  const calls: Array<{ url: string, init: RequestInit }> = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as FetchLike & { calls: typeof calls }
  impl.calls = calls
  return impl
}

/** An LLM face whose stream yields the given chunks. */
function llmStreaming(chunks: Array<{ type: string }>): LlmFace {
  return {
    listProviders: () => [],
    listConfigurableProviders: () => [],
    discoverModels: async () => [],
    listModels: async () => [],
    async* stream() { yield* chunks },
  }
}

describe('url helpers', () => {
  it('joins a base with or without a trailing slash', () => {
    expect(joinUrl('https://a.test/v1/', '/embeddings')).toBe('https://a.test/v1/embeddings')
    expect(joinUrl('https://a.test/v1', '/embeddings')).toBe('https://a.test/v1/embeddings')
  })

  it('accepts only http and https bases', () => {
    expect(isHttpUrl('http://127.0.0.1:11434/v1')).toBe(true)
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
  })
})

describe('probeChat', () => {
  it('passes on a stop or max-tokens finish', async () => {
    expect(await probeChat(llmStreaming([{ type: 'text-delta' }, { type: 'finish', reason: { kind: 'stop' } } as never]), 'p', 'm', 1000))
      .toEqual({ ok: true })
    expect(await probeChat(llmStreaming([{ type: 'finish', reason: { kind: 'max-tokens' } } as never]), 'p', 'm', 1000))
      .toEqual({ ok: true })
  })

  it('reports the provider failure of an error finish', async () => {
    const failure = { type: 'finish', reason: { kind: 'error', failure: { message: '401 invalid api key' } } }
    expect(await probeChat(llmStreaming([failure as never]), 'p', 'm', 1000))
      .toEqual({ ok: false, message: '401 invalid api key' })
  })

  it('fails a stream that ends without a finish', async () => {
    expect((await probeChat(llmStreaming([]), 'p', 'm', 1000)).ok).toBe(false)
  })
})

describe('probeOpenRouterKey', () => {
  it('sends the key as a bearer token to the key endpoint', async () => {
    const fetch = fakeFetch(200, { data: {} })
    expect(await probeOpenRouterKey(fetch, 'https://openrouter.test/api/v1', 'sk-or', 1000)).toEqual({ ok: true })
    expect(fetch.calls[0]?.url).toBe('https://openrouter.test/api/v1/key')
    expect((fetch.calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer sk-or')
  })

  it('names a rejected key', async () => {
    const result = await probeOpenRouterKey(fakeFetch(401, { error: { message: 'No auth credentials found' } }), 'https://o.test', 'bad', 1000)
    expect(result).toEqual({ ok: false, message: 'O provedor respondeu 401: No auth credentials found. Confira a chave.' })
  })
})

describe('probeEmbedding', () => {
  it('reports the width of the returned vector', async () => {
    const fetch = fakeFetch(200, { data: [{ embedding: [0.1, 0.2, 0.3] }] })
    expect(await probeEmbedding(fetch, 'http://127.0.0.1:11434/v1', '', 'nomic-embed-text', 1000))
      .toEqual({ ok: true, dimension: 3 })
    expect((fetch.calls[0]?.init.headers as Record<string, string>).authorization).toBeUndefined()
  })

  it('refuses an answer without an embedding', async () => {
    expect((await probeEmbedding(fakeFetch(200, { data: [] }), 'https://a.test', 'k', 'gpt-4o', 1000)).ok).toBe(false)
  })

  it('reports an unreachable endpoint', async () => {
    const refused: FetchLike = async () => { throw new TypeError('fetch failed') }
    const result = await probeEmbedding(refused, 'http://127.0.0.1:9/v1', '', 'm', 1000)
    expect(result).toEqual({ ok: false, message: 'Não foi possível acessar http://127.0.0.1:9/v1/embeddings: fetch failed.' })
  })
})

describe('probeCompletion', () => {
  it('posts one short completion to the chat endpoint', async () => {
    const fetch = fakeFetch(200, { choices: [] })
    expect(await probeCompletion(fetch, 'https://a.test/v1', 'k', 'vlm', 1000)).toEqual({ ok: true })
    expect(fetch.calls[0]?.url).toBe('https://a.test/v1/chat/completions')
    expect(JSON.parse(String(fetch.calls[0]?.init.body)).model).toBe('vlm')
  })
})
