/**
 * Parsing of what the skill library answers.
 *
 * The registry revalidates a definition it receives, and rejects one whose name
 * does not match the candidate it asked for. That is a backstop, not this
 * module's excuse: a body reaching the model is the product of this plugin, and
 * a field silently missing here would surface as an empty instruction block
 * rather than as an error naming the endpoint.
 * @module
 */

/** A catalog entry as the library serves it, before it becomes a candidate. */
export interface WireSummary {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly modelInvocable: boolean
  readonly userInvocable: boolean
  readonly revision: number
}

/** One skill with its instructions. */
export interface WireSkill extends WireSummary {
  readonly content: string
}

/** The library answered something this plugin cannot use. */
export class SkillLibraryFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkillLibraryFormatError'
  }
}

/** Kebab-case, the only shape `ctx.skills` accepts as a name. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SkillLibraryFormatError(`${what} is not an object`)
  }
  return value as Record<string, unknown>
}

function text(fields: Record<string, unknown>, key: string, what: string): string {
  const value = fields[key]
  if (typeof value !== 'string' || value === '') {
    throw new SkillLibraryFormatError(`${what} has no usable "${key}"`)
  }
  return value
}

function flag(fields: Record<string, unknown>, key: string, what: string): boolean {
  const value = fields[key]
  if (typeof value !== 'boolean') {
    throw new SkillLibraryFormatError(`${what} has no boolean "${key}"`)
  }
  return value
}

/**
 * Read the two invocation controls, which the library nests under `invocation`.
 * @param fields - the summary object being parsed.
 * @param what - what to call this entry in an error message.
 * @returns the pair of controls.
 * @throws SkillLibraryFormatError when `invocation` is missing or not a pair of booleans.
 */
function invocation(
  fields: Record<string, unknown>,
  what: string,
): { modelInvocable: boolean, userInvocable: boolean } {
  const nested = asRecord(fields.invocation, `${what} "invocation"`)
  return {
    modelInvocable: flag(nested, 'modelInvocable', what),
    userInvocable: flag(nested, 'userInvocable', what),
  }
}

function summaryOf(value: unknown, what: string): WireSummary {
  const fields = asRecord(value, what)
  const name = text(fields, 'name', what)
  if (!SKILL_NAME.test(name)) {
    throw new SkillLibraryFormatError(`${what} has a name that is not kebab-case: "${name}"`)
  }
  const revision = fields.revision
  if (typeof revision !== 'number' || !Number.isFinite(revision)) {
    throw new SkillLibraryFormatError(`${what} has no numeric "revision"`)
  }
  const whenToUse = fields.whenToUse
  if (whenToUse !== undefined && typeof whenToUse !== 'string') {
    throw new SkillLibraryFormatError(`${what} has a non-string "whenToUse"`)
  }
  return {
    name,
    description: text(fields, 'description', what),
    ...whenToUse === undefined || whenToUse === '' ? {} : { whenToUse },
    ...invocation(fields, what),
    revision,
  }
}

/**
 * Parse the catalog response.
 * @param body - the decoded JSON body of the list request.
 * @returns every entry the library published.
 * @throws SkillLibraryFormatError when the body or any entry is unusable.
 */
export function parseCatalog(body: unknown): WireSummary[] {
  const fields = asRecord(body, 'the skill catalog')
  if (!Array.isArray(fields.skills)) {
    throw new SkillLibraryFormatError('the skill catalog has no "skills" array')
  }
  // One bad entry fails the whole catalog rather than being skipped: a catalog
  // silently missing a skill looks to the model exactly like a skill that was
  // deliberately unpublished, and it would keep working with a hole in it.
  return fields.skills.map((entry, index) => summaryOf(entry, `skill catalog entry ${index}`))
}

/**
 * Parse one loaded skill and confirm it is the one that was asked for.
 * @param body - the decoded JSON body of the get request.
 * @param expected - the candidate name the request was made for.
 * @returns the skill with its instructions.
 * @throws SkillLibraryFormatError when the body is unusable or names another skill.
 */
export function parseSkill(body: unknown, expected: string): WireSkill {
  const what = `skill "${expected}"`
  const summary = summaryOf(body, what)
  if (summary.name !== expected) {
    throw new SkillLibraryFormatError(
      `${what} was requested but the library answered with "${summary.name}"`,
    )
  }
  return { ...summary, content: text(asRecord(body, what), 'content', what) }
}
