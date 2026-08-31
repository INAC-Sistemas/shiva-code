// The provider against the real `SkillRegistry`, not a stand-in.
//
// Two properties only show up here, because both are about how the registry
// treats what the provider returns: a library skill wins a name a local file
// also claims, and a cached candidate still cannot produce a body after the
// session goes away.

import { Context } from '@deepseek-ai/cordis'
import SkillRegistry, {
  type SkillCandidate,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'
import type { LoginAuthorization, LoginCredentialStore } from 'dsh-login/vps-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LibrarySkillProvider } from '../src/provider.ts'

const LIBRARY_BODY = '# Build\n\nThe audited instructions.'

const CATALOG = {
  revision: 3,
  skills: [{
    name: '07-build',
    description: 'The library version',
    invocation: { modelInvocable: true, userInvocable: true },
    revision: 3,
  }],
}

/** A stand-in for the local filesystem provider, at its strongest root rank. */
const PROJECT_DSH_RANK = 100

function localProvider(): SkillProvider {
  const candidate: SkillCandidate = {
    name: '07-build',
    description: 'A local file claiming the same name',
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'project-dsh',
    provider: 'filesystem',
    rank: PROJECT_DSH_RANK,
    locator: null,
    path: '/repo/.dsh/skills/07-build.md',
  }

  return {
    name: 'filesystem',
    list: async () => [candidate],
    get: async () => ({
      name: '07-build',
      description: 'A local file claiming the same name',
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'project-dsh',
      provider: 'filesystem',
      content: '# Not the audited instructions',
    }),
  }
}

describe('against the real registry', () => {
  let signedIn: boolean
  let ctx: Context
  let skills: SkillRegistry

  beforeEach(async () => {
    signedIn = true
    ctx = new Context()
    await ctx.plugin(SkillRegistry)
    skills = ctx.skills

    skills.registerProvider(() => localProvider())
    skills.registerProvider(() => new LibrarySkillProvider({
      endpoint: new URL('https://vps/api/plugins/skill-library/'),
      providerName: 'library',
      source: 'library',
      rank: 50,
      listTimeoutMs: 2_000,
      getTimeoutMs: 10_000,
      maxBodyBytes: 512 * 1024,
      headers: {},
      // The whole session state of this test: flipping it is signing out.
      authorize: async (): Promise<LoginAuthorization> => signedIn
        ? { ok: true, authorization: 'Bearer t0ken', expiresAt: null }
        : { ok: false, reason: 'absent', message: 'no session' },
      store: () => ({}) as LoginCredentialStore,
      fetch: vi.fn(async (url) => new Response(
        JSON.stringify(
          String(url).endsWith('/skills')
            ? CATALOG
            : { ...CATALOG.skills[0]!, content: LIBRARY_BODY },
        ),
        { headers: { 'content-type': 'application/json' } },
      )),
      warn: () => {},
    }))
  })

  it('wins a name a local file also claims, at rank 50', async () => {
    const listed = await skills.list()

    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({ name: '07-build', provider: 'library' })
    await expect(skills.get('07-build')).resolves.toMatchObject({ content: LIBRARY_BODY })
  })

  // The property the whole design rests on. The registry caches candidates but
  // never a definition, so the body is fetched fresh — with the credential
  // resolved fresh — every single time.
  it('cannot produce a body once the session is gone, even from a cached candidate', async () => {
    // Warm the catalog cache while signed in.
    await expect(skills.list()).resolves.toHaveLength(1)
    await expect(skills.get('07-build')).resolves.toMatchObject({ content: LIBRARY_BODY })

    signedIn = false

    // The candidate is still cached — the catalog has not been invalidated — so
    // this is exactly the situation a cache could have leaked through.
    await expect(skills.get('07-build')).rejects.toThrow(/Tell the user to sign in/)
  })

  it('yields the name back to the local file once the library contributes nothing', async () => {
    signedIn = false

    const listed = await skills.list()

    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({ name: '07-build', provider: 'filesystem' })
  })
})
