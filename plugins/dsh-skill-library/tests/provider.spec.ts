import type { SkillCandidate } from '@deepseek-ai/dsh-skill'
import type { LoginAuthorization, LoginCredentialStore } from 'dsh-login/vps-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LibrarySkillProvider, type ProviderOptions } from '../src/provider.ts'

const CATALOG = {
  revision: 6,
  skills: [
    {
      name: '07-build',
      description: 'Execute tickets',
      whenToUse: 'After the plan',
      invocation: { modelInvocable: true, userInvocable: true },
      revision: 3,
    },
    {
      name: 'find-skills',
      description: 'Locate a skill',
      invocation: { modelInvocable: true, userInvocable: false },
      revision: 3,
    },
  ],
}

const SIGNED_IN: LoginAuthorization = { ok: true, authorization: 'Bearer t0ken', expiresAt: null }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A provider whose network, credential and clock are all supplied by the test. */
function makeProvider(overrides: Partial<ProviderOptions> = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => json(CATALOG))
  const warn = vi.fn<(message: string) => void>()
  const options: ProviderOptions = {
    endpoint: new URL('https://vps/api/plugins/skill-library/'),
    providerName: 'library',
    source: 'library',
    rank: 50,
    listTimeoutMs: 2_000,
    getTimeoutMs: 10_000,
    maxBodyBytes: 512 * 1024,
    headers: {},
    authorize: async () => SIGNED_IN,
    store: () => ({}) as LoginCredentialStore,
    fetch,
    warn,
    ...overrides,
  }

  return { provider: new LibrarySkillProvider(options), fetch, warn }
}

/** A candidate as `list()` would have produced it. */
function candidate(name = '07-build'): SkillCandidate {
  return {
    name,
    description: 'Execute tickets',
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'library',
    provider: 'library',
    rank: 50,
    locator: { name, revision: 3 },
  }
}

describe('list', () => {
  it('projects the catalog into candidates at the configured rank', async () => {
    const { provider } = makeProvider()

    const listed = await provider.list({})

    expect(listed).toEqual([
      {
        name: '07-build',
        description: 'Execute tickets',
        whenToUse: 'After the plan',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'library',
        provider: 'library',
        rank: 50,
        locator: { name: '07-build', revision: 3 },
      },
      {
        name: 'find-skills',
        description: 'Locate a skill',
        invocation: { modelInvocable: true, userInvocable: false },
        source: 'library',
        provider: 'library',
        rank: 50,
        locator: { name: 'find-skills', revision: 3 },
      },
    ])
  })

  it('sends the session credential and the plugin accept, config headers first', async () => {
    const { provider, fetch } = makeProvider({ headers: { 'x-tenant': 'acme' } })

    await provider.list({})

    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe('https://vps/api/plugins/skill-library/skills')
    expect(init!.headers).toEqual({
      'x-tenant': 'acme',
      authorization: 'Bearer t0ken',
      accept: 'application/json',
    })
  })

  // Nobody signed in is decidable without leaving the machine, so it is an
  // authoritative empty catalog the registry may cache. Returning an incomplete
  // observation instead would keep `snapshot.complete` false on every read and
  // disable the registry's cache for the other providers too.
  it.each([
    ['no-store' as const],
    ['absent' as const],
    ['expired' as const],
    ['malformed' as const],
  ])('answers a complete empty catalog and never calls the network when the session is %s', async (reason) => {
    const { provider, fetch } = makeProvider({
      authorize: async () => ({ ok: false, reason, message: 'no session' }),
    })

    await expect(provider.list({})).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads the credential store per call, so a later sign-in is seen', async () => {
    const authorize = vi.fn<ProviderOptions['authorize']>()
      .mockResolvedValueOnce({ ok: false, reason: 'absent', message: 'no session' })
      .mockResolvedValueOnce(SIGNED_IN)
    const { provider } = makeProvider({ authorize })

    await expect(provider.list({})).resolves.toEqual([])
    await expect(provider.list({})).resolves.toHaveLength(2)
  })

  // An unreachable library is not authoritative: an incomplete observation is
  // not cached, so the consumer keeps its last good catalog and the next step
  // retries, instead of telling the model the skills vanished.
  it('answers an incomplete observation when the library cannot be reached', async () => {
    const { provider, warn } = makeProvider({
      fetch: vi.fn(async () => { throw new Error('ECONNREFUSED') }),
    })

    await expect(provider.list({})).resolves.toEqual({ candidates: [], complete: false })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skill catalog unavailable'))
  })

  it('answers an incomplete observation on a server error', async () => {
    const { provider } = makeProvider({ fetch: vi.fn(async () => json({}, 500)) })

    await expect(provider.list({})).resolves.toEqual({ candidates: [], complete: false })
  })

  it('answers an incomplete observation, loudly, on a malformed catalog', async () => {
    const { provider, warn } = makeProvider({ fetch: vi.fn(async () => json({ skills: [{}] })) })

    await expect(provider.list({})).resolves.toEqual({ candidates: [], complete: false })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skill catalog rejected'))
  })

  it('propagates the caller abort instead of reporting it as a library failure', async () => {
    const controller = new AbortController()
    const { provider, warn } = makeProvider({
      fetch: vi.fn(async () => { controller.abort(); throw new Error('aborted') }),
    })

    await expect(provider.list({ signal: controller.signal })).rejects.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('get', () => {
  let body: Record<string, unknown>

  beforeEach(() => {
    body = { ...CATALOG.skills[0]!, content: '# Build\n\nInstructions.' }
  })

  it('returns the definition with no path and an opaque resource base', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(body))
    const { provider } = makeProvider({ fetch })

    const definition = await provider.get(candidate(), {})

    expect(definition).toEqual({
      name: '07-build',
      description: 'Execute tickets',
      whenToUse: 'After the plan',
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'library',
      provider: 'library',
      resourceBase: {
        kind: 'opaque',
        description: 'the shared skill library on the server; it serves no companion files',
      },
      content: '# Build\n\nInstructions.',
    })
    // No `path`: there is no file behind a library skill, and a path would tell
    // every consumer to look for one.
    expect(definition).not.toHaveProperty('path')
    expect(String(fetch.mock.calls[0]![0])).toBe(
      'https://vps/api/plugins/skill-library/skills/07-build',
    )
  })

  // The gate. The registry caches candidates but never a definition, so a
  // candidate discovered while signed in still has to pass this check.
  it.each([
    ['absent' as const, /Tell the user to sign in in the app/],
    ['expired' as const, /Tell the user to sign in again/],
    ['no-store' as const, /mount dsh-credentials-local/],
    ['malformed' as const, /sign out and in again/],
  ])('refuses to load a body when the session is %s, without asking the library', async (reason, text) => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const { provider } = makeProvider({
      authorize: async () => ({ ok: false, reason, message: 'no session' }),
      fetch,
    })

    await expect(provider.get(candidate(), {})).rejects.toThrow(text)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers undefined when the library no longer has the skill', async () => {
    const { provider } = makeProvider({ fetch: vi.fn(async () => json({ error: 'x' }, 404)) })

    await expect(provider.get(candidate(), {})).resolves.toBeUndefined()
  })

  // A tool call is the wrong place to retire a session: a transient upstream
  // fault would wipe a good one. The browser's revalidation owns that.
  it('reports a rejected session without touching the stored credential', async () => {
    const store = { readRecord: vi.fn(), modifyRecord: vi.fn(), deleteRecord: vi.fn() }
    const { provider } = makeProvider({
      fetch: vi.fn(async () => json({ error: 'x' }, 401)),
      store: () => store as unknown as LoginCredentialStore,
    })

    await expect(provider.get(candidate(), {})).rejects.toThrow(/rejected the signed-in session \(401\)/)
    expect(store.deleteRecord).not.toHaveBeenCalled()
  })

  it('reports an unreachable library with text that tells the model not to retry', async () => {
    const { provider } = makeProvider({
      fetch: vi.fn(async () => { throw new Error('ECONNREFUSED') }),
    })

    await expect(provider.get(candidate(), {})).rejects.toThrow(/do not retry/)
  })

  it('rejects a body that names another skill', async () => {
    const { provider } = makeProvider({ fetch: vi.fn(async () => json(body)) })

    await expect(provider.get(candidate('find-skills'), {}))
      .rejects.toThrow(/misconfigured and do not retry/)
  })

  it('refuses a declared body over the cap before reading it', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('{}', {
      headers: { 'content-length': '999999' },
    }))
    const { provider } = makeProvider({ fetch, maxBodyBytes: 1_000 })

    await expect(provider.get(candidate(), {})).rejects.toThrow(/over the 1000 byte cap/)
  })

  it('refuses an undeclared body over the cap', async () => {
    const { provider } = makeProvider({
      fetch: vi.fn(async () => new Response('x'.repeat(50))),
      maxBodyBytes: 10,
    })

    await expect(provider.get(candidate(), {})).rejects.toThrow(/more than the 10 byte cap/)
  })

  it('reports a non-JSON answer', async () => {
    const { provider } = makeProvider({ fetch: vi.fn(async () => new Response('<html>')) })

    await expect(provider.get(candidate(), {})).rejects.toThrow(/did not answer JSON/)
  })

  it('races the caller signal against its own deadline', async () => {
    const controller = new AbortController()
    const { provider } = makeProvider({
      fetch: vi.fn(async (_url, init) => {
        expect((init as RequestInit).signal!.aborted).toBe(false)
        controller.abort()
        throw new Error('aborted')
      }),
    })

    await expect(provider.get(candidate(), { signal: controller.signal })).rejects.toThrow()
  })
})
