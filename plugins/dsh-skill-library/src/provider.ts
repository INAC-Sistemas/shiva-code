/**
 * The skill provider that reads the shared library over HTTP.
 *
 * Everything the class needs is passed in — the credential store, the fetch, the
 * clock — so its failure paths are reachable from a test without a network or a
 * mounted harness. The plugin's `apply()` is what binds them to the real context.
 * @module
 */
import type {
  SkillCandidate,
  SkillDefinition,
  SkillLookupOptions,
  SkillProvider,
  SkillProviderObservation,
} from '@deepseek-ai/dsh-skill'
import type { LoginAuthorization, LoginCredentialStore } from 'dsh-login/vps-auth'
import { parseCatalog, parseSkill, SkillLibraryFormatError, type WireSummary } from './wire.ts'

/** How the provider reaches the library and how it identifies its skills. */
export interface ProviderOptions {
  /** Validated base URL, with a trailing slash. */
  readonly endpoint: URL
  /** Provider name in the `ctx.skills` registry. */
  readonly providerName: string
  /** `source` reported on every candidate; prompt-visible metadata. */
  readonly source: string
  /** Rank of every candidate; lower wins a duplicate name within a layer. */
  readonly rank: number
  /** Deadline for the catalog request. */
  readonly listTimeoutMs: number
  /** Deadline for loading one body. */
  readonly getTimeoutMs: number
  /** Largest body accepted, in bytes. */
  readonly maxBodyBytes: number
  /** Static headers added to every request. */
  readonly headers: Readonly<Record<string, string>>
  /** Resolves the signed-in session, per call. */
  readonly authorize: (store: LoginCredentialStore | undefined) => Promise<LoginAuthorization>
  /** The credential store, read fresh each call because the seam may mount late. */
  readonly store: () => LoginCredentialStore | undefined
  /** Injected for tests; defaults to the global fetch. */
  readonly fetch?: typeof globalThis.fetch
  /** Reports a transient failure. */
  readonly warn: (message: string) => void
}

/** What the model is told when the library cannot answer. Written for its reader. */
const NO_SESSION_TEXT: Record<'no-store' | 'absent' | 'expired' | 'malformed', string> = {
  'absent': 'No one is signed in, so the skill library cannot be read. '
    + 'Tell the user to sign in in the app, then try again. Do not retry until they have.',
  'expired': 'The signed-in session expired, so the skill library cannot be read. '
    + 'Tell the user to sign in again and do not retry until they have.',
  'no-store': 'This harness mounts no credential store, so a sign-in has nowhere to be recorded. '
    + 'Tell the user to mount dsh-credentials-local and do not retry.',
  'malformed': 'The stored session record could not be read. '
    + 'Tell the user to sign out and in again and do not retry.',
}

/** An empty catalog that the registry may cache. */
const AUTHORITATIVELY_EMPTY: readonly SkillCandidate[] = []

/** An empty catalog the registry must not cache. */
const TRANSIENTLY_EMPTY: SkillProviderObservation = { candidates: [], complete: false }

/** The library's own handle for a candidate, given back to `get()`. */
interface LibraryLocator {
  readonly name: string
  readonly revision: number
}

/**
 * Contributes the shared skill library to `ctx.skills`.
 *
 * The authorization gate that matters is in {@link LibrarySkillProvider.get}:
 * the registry caches candidates but never a definition, so every body load is a
 * fresh request with a freshly resolved credential. A candidate discovered while
 * signed in cannot produce instructions after a sign-out.
 */
export class LibrarySkillProvider implements SkillProvider {
  readonly name: string

  constructor(private readonly options: ProviderOptions) {
    this.name = options.providerName
  }

  /**
   * Discover the published catalog.
   *
   * The split between the two empty answers is whether the fact is decidable
   * without leaving the machine. Nobody signed in is authoritative — the library
   * genuinely offers this session nothing — so it is a complete, cacheable empty
   * catalog. A library that cannot be reached is not authoritative, so it is an
   * incomplete observation: the registry does not cache it, the consumer keeps
   * its last good catalog instead of telling the model the skills vanished, and
   * the next step tries again.
   * @param options - lookup options; only `signal` is used, since the library is
   *   not workspace-sensitive.
   * @returns the candidates, or an incomplete observation on a transient failure.
   */
  async list(options: SkillLookupOptions): Promise<readonly SkillCandidate[] | SkillProviderObservation> {
    const authorization = await this.options.authorize(this.options.store())
    if (!authorization.ok) return AUTHORITATIVELY_EMPTY

    let body: unknown
    try {
      body = await this.request('skills', authorization.authorization, options.signal, this.options.listTimeoutMs)
    } catch (error) {
      if (options.signal?.aborted) throw error
      this.options.warn(`skill catalog unavailable: ${(error as Error).message}`)
      return TRANSIENTLY_EMPTY
    }

    try {
      return parseCatalog(body).map(summary => this.candidateOf(summary))
    } catch (error) {
      // A malformed catalog is the library's fault and may be fixed by a deploy
      // while this process lives, so it is transient too — but it is loud,
      // because nothing else would report a server that changed its format.
      this.options.warn(`skill catalog rejected: ${(error as Error).message}`)
      return TRANSIENTLY_EMPTY
    }
  }

  /**
   * Load one skill body.
   *
   * `undefined` means the library authoritatively has no such skill for this
   * session — unknown, unpublished, or nobody signed in. A throw means the
   * question could not be answered, and its text is written for the model.
   * @param candidate - the winning candidate this provider listed.
   * @param options - lookup options; `signal` cancels the request.
   * @returns the definition, or `undefined` when it is no longer loadable.
   * @throws Error when the library cannot be reached, rejects the session, or answers unusably.
   */
  async get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
    const locator = candidate.locator as LibraryLocator
    const authorization = await this.options.authorize(this.options.store())
    if (!authorization.ok) throw new Error(NO_SESSION_TEXT[authorization.reason])

    let body: unknown
    try {
      body = await this.request(
        `skills/${encodeURIComponent(locator.name)}`,
        authorization.authorization,
        options.signal,
        this.options.getTimeoutMs,
      )
    } catch (error) {
      if (options.signal?.aborted) throw error
      if (error instanceof SkillNotFound) return undefined
      throw error
    }

    let skill
    try {
      skill = parseSkill(body, locator.name)
    } catch (error) {
      if (error instanceof SkillLibraryFormatError) {
        throw new Error(
          `${(error as Error).message}. Tell the user the skill library is misconfigured and do not retry.`,
        )
      }
      throw error
    }

    // The body is returned and never kept: a copy on this instance would outlive
    // the session that was allowed to read it, and a sign-out would stop
    // mattering. No `path` either — there is no file behind this skill.
    return {
      name: skill.name,
      description: skill.description,
      ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
      invocation: {
        modelInvocable: skill.modelInvocable,
        userInvocable: skill.userInvocable,
      },
      source: this.options.source,
      provider: this.name,
      // Opaque rather than a URL: these skills carry no companion files, and a
      // URL base would invite the model to fetch paths against an endpoint that
      // answers 401 to anything without the bearer this plugin holds.
      resourceBase: {
        kind: 'opaque',
        description: 'the shared skill library on the server; it serves no companion files',
      },
      content: skill.content,
    }
  }

  /** Project one catalog entry into a registry candidate. */
  private candidateOf(summary: WireSummary): SkillCandidate {
    return {
      name: summary.name,
      description: summary.description,
      ...summary.whenToUse === undefined ? {} : { whenToUse: summary.whenToUse },
      invocation: {
        modelInvocable: summary.modelInvocable,
        userInvocable: summary.userInvocable,
      },
      source: this.options.source,
      provider: this.name,
      rank: this.options.rank,
      // The locator is inert on purpose: it is cached with the candidate, so a
      // credential stored here would be a stale token waiting to be replayed.
      locator: { name: summary.name, revision: summary.revision } satisfies LibraryLocator,
    }
  }

  /**
   * One authenticated GET, with the body decoded.
   * @param path - sub-path appended to the endpoint.
   * @param authorization - the `Bearer …` header value for this call.
   * @param signal - the caller's signal, raced against this plugin's deadline.
   * @param timeoutMs - this plugin's own deadline.
   * @returns the decoded JSON body.
   * @throws SkillNotFound on 404; Error with model-facing text otherwise.
   */
  private async request(
    path: string,
    authorization: string,
    signal: AbortSignal | undefined,
    timeoutMs: number,
  ): Promise<unknown> {
    const call = this.options.fetch ?? globalThis.fetch
    // The caller's signal carries stop and cancellation; the deadline is this
    // plugin's own. Dropping either would hang the step or leak a request the
    // harness already abandoned.
    const deadline = AbortSignal.timeout(timeoutMs)
    const combined = signal === undefined ? deadline : AbortSignal.any([signal, deadline])

    let response: Response
    try {
      response = await call(new URL(path, this.options.endpoint), {
        signal: combined,
        headers: {
          // Config first, the session credential next, this plugin's `accept`
          // last: config may add headers but may not replace the credential or
          // the format the parser depends on.
          ...this.options.headers,
          authorization,
          accept: 'application/json',
        },
      })
    } catch (error) {
      throw new Error(
        `Could not reach the skill library (${(error as Error).message}). `
        + 'Tell the user the server is unreachable and do not retry.',
      )
    }

    if (response.status === 404) throw new SkillNotFound()
    if (response.status === 401 || response.status === 403) {
      // The session is dead at the library, but this is the wrong place to act
      // on that: a transient upstream fault would wipe a good session. The
      // browser's own revalidation retires it.
      throw new Error(
        `The skill library rejected the signed-in session (${response.status}). `
        + 'Tell the user to sign in again and do not retry.',
      )
    }
    if (!response.ok) {
      throw new Error(
        `The skill library answered ${response.status}. Tell the user and do not retry.`,
      )
    }

    // Checked before reading: a body this large is a misconfigured endpoint, and
    // reading it to find out would be the damage the cap exists to prevent.
    const declared = Number(response.headers.get('content-length') ?? Number.NaN)
    if (Number.isFinite(declared) && declared > this.options.maxBodyBytes) {
      throw new Error(
        `The skill library answered ${declared} bytes, over the ${this.options.maxBodyBytes} byte cap. `
        + 'Tell the user the library is misconfigured and do not retry.',
      )
    }

    const text = await response.text()
    if (text.length > this.options.maxBodyBytes) {
      throw new Error(
        `The skill library answered more than the ${this.options.maxBodyBytes} byte cap. `
        + 'Tell the user the library is misconfigured and do not retry.',
      )
    }

    try {
      return JSON.parse(text)
    } catch {
      throw new Error('The skill library did not answer JSON. Tell the user and do not retry.')
    }
  }
}

/** The library has no such skill for this session. Never reaches the model. */
class SkillNotFound extends Error {
  constructor() {
    super('skill not found')
    this.name = 'SkillNotFound'
  }
}
