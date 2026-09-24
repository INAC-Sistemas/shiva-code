import { describe, expect, it } from 'vitest'
import { CHAT_PROVIDERS, matchChatProviders, offeredChatProviders } from '../src/providers.ts'

describe('searching the chat providers', () => {
  it('matches the display name, the route id and the kind', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, 'deep').map(entry => entry.provider))
      .toEqual(['deepseek-official'])
    // The route id is what a person copies from documentation; the display
    // name ("Moonshot / Kimi") is what they remember.
    expect(matchChatProviders(CHAT_PROVIDERS, 'moonshotai').map(entry => entry.provider))
      .toEqual(['moonshotai-cn'])
    expect(matchChatProviders(CHAT_PROVIDERS, 'kimi').map(entry => entry.provider))
      .toEqual(['moonshotai-cn'])
    expect(matchChatProviders(CHAT_PROVIDERS, 'agregador').map(entry => entry.provider))
      .toEqual(['openrouter'])
  })

  it('ignores case and surrounding space, and an empty query shows everything', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, '  GROQ ').map(entry => entry.provider)).toEqual(['groq'])
    expect(matchChatProviders(CHAT_PROVIDERS, '   ')).toHaveLength(CHAT_PROVIDERS.length)
  })

  it('keeps the selected provider on screen, because the form below belongs to it', () => {
    const shown = matchChatProviders(CHAT_PROVIDERS, 'groq', 'deepseek-official')
    expect(shown.map(entry => entry.provider)).toEqual(['deepseek-official', 'groq'])
  })

  it('answers empty when nothing matches, rather than falling back to everything', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, 'zzz')).toEqual([])
  })
})

describe('which chat providers the step offers', () => {
  const curated = [
    { provider: 'deepseek-official', displayName: 'DeepSeek', kind: 'Fabricante' },
    { provider: 'openai', displayName: 'OpenAI', kind: 'Fabricante' },
  ] as const

  it('drops a curated route this installation cannot serve', () => {
    const offered = offeredChatProviders(curated, [{ provider: 'openai', displayName: 'OpenAI' }])
    expect(offered.map(entry => entry.provider)).toEqual(['openai'])
  })

  it('offers a route the runtime knows but the catalog does not, after the curated ones', () => {
    const offered = offeredChatProviders(curated, [
      { provider: 'ollama', displayName: 'Ollama', declared: true },
      { provider: 'openai', displayName: 'OpenAI' },
      { provider: 'deepseek-official', displayName: 'DeepSeek' },
    ])
    expect(offered.map(entry => entry.provider)).toEqual(['deepseek-official', 'openai', 'ollama'])
    // A hand-declared route says where it came from, so nobody hunts for it in
    // a vendor list it was never part of.
    expect(offered.at(-1)?.kind).toBe('Configurado aqui')
  })

  it('names an unnamed route by its id, and sorts the uncurated ones by name', () => {
    const offered = offeredChatProviders([], [
      { provider: 'zeta-gateway', displayName: '' },
      { provider: 'acme', displayName: 'Acme Gateway' },
    ])
    expect(offered.map(entry => entry.displayName)).toEqual(['Acme Gateway', 'zeta-gateway'])
  })

  it('finds an uncurated route through the search, which is the point of listing it', () => {
    const offered = offeredChatProviders(CHAT_PROVIDERS, [
      ...CHAT_PROVIDERS.map(entry => ({ provider: entry.provider, displayName: entry.displayName })),
      { provider: 'ollama', displayName: 'Ollama', declared: true },
    ])
    expect(matchChatProviders(offered, 'ollama').map(entry => entry.provider)).toEqual(['ollama'])
  })
})
