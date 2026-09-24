/**
 * Load-order rules for library skills, enforced at the `skill` tool.
 *
 * A rule names the skills that must have been loaded earlier in the same
 * session before a skill may load. What "loaded" means is read from the session
 * log — a `tool/call` of the `skill` tool whose `tool/result` did not fail — so
 * the rule holds across a harness restart and needs no state of its own.
 * @module dsh-skill-library/prerequisites
 */
import type { SessionFace } from './tool-events.ts'

/** Skill name → the skills that must be loaded before it in the same session. */
export type Prerequisites = Readonly<Record<string, readonly string[]>>

/** Kebab-case skill name, the form the `skill` tool accepts. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Validate the configured rules at load.
 * @param rules - the `prerequisites` config field.
 * @returns the rules unchanged.
 * @throws Error naming the first malformed skill name, or a skill that requires itself.
 */
export function assertPrerequisites(rules: Prerequisites): Prerequisites {
  for (const [skill, required] of Object.entries(rules)) {
    if (!SKILL_NAME.test(skill)) {
      throw new Error(`dsh-skill-library: prerequisites key "${skill}" is not a skill name`)
    }
    for (const name of required) {
      if (!SKILL_NAME.test(name)) {
        throw new Error(`dsh-skill-library: prerequisite "${name}" of "${skill}" is not a skill name`)
      }
      if (name === skill) {
        throw new Error(`dsh-skill-library: "${skill}" lists itself as a prerequisite`)
      }
    }
  }
  return rules
}

interface LoggedEvent {
  type?: unknown
  data?: {
    callId?: unknown
    name?: unknown
    arguments?: unknown
    message?: { content?: ReadonlyArray<{ toolCallId?: unknown, isError?: unknown }> }
  }
}

/** The `name` argument of a logged `skill` call; arguments are stored as JSON text. */
function loggedSkillName(args: unknown): string | undefined {
  let parsed: unknown = args
  if (typeof args === 'string') {
    try {
      parsed = JSON.parse(args)
    } catch {
      // A call whose arguments are not JSON never dispatched; it loaded nothing.
      return undefined
    }
  }
  const name = typeof parsed === 'object' && parsed !== null ? (parsed as { name?: unknown }).name : undefined
  return typeof name === 'string' ? name : undefined
}

/**
 * The skills a session has loaded successfully through the `skill` tool.
 * @param session - the calling agent's session.
 * @param skillTool - the name of the skill tool.
 * @returns the loaded skill names.
 */
export function loadedSkills(session: SessionFace | undefined, skillTool: string): Set<string> {
  const events = (session?.events ?? session?.snapshotEvents?.() ?? []) as readonly LoggedEvent[]
  const requested = new Map<string, string>()
  const loaded = new Set<string>()
  for (const event of events) {
    if (event.type === 'tool/call' && event.data?.name === skillTool && typeof event.data.callId === 'string') {
      const name = loggedSkillName(event.data.arguments)
      if (name !== undefined) requested.set(event.data.callId, name)
    } else if (event.type === 'tool/result') {
      for (const part of event.data?.message?.content ?? []) {
        if (typeof part.toolCallId !== 'string' || part.isError === true) continue
        const name = requested.get(part.toolCallId)
        if (name !== undefined) loaded.add(name)
      }
    }
  }
  return loaded
}

/**
 * The prerequisites of a skill not yet loaded, in configured order.
 * @param rules - the configured rules.
 * @param skill - the skill being loaded.
 * @param loaded - the skills already loaded in this session.
 * @returns the missing names; empty when the skill may load.
 */
export function missingPrerequisites(rules: Prerequisites, skill: string, loaded: ReadonlySet<string>): string[] {
  return (rules[skill] ?? []).filter(name => !loaded.has(name))
}

/**
 * What the model is told when a skill is refused for load order.
 * @param skill - the refused skill.
 * @param missing - its prerequisites not yet loaded.
 * @returns the model-facing text.
 */
export function prerequisiteText(skill: string, missing: readonly string[]): string {
  const list = missing.map(name => `"${name}"`).join(', then ')
  return `The skill "${skill}" cannot load yet: it requires ${list} to be loaded earlier in this session. `
    + `Load ${list} with the skill tool, in that order, then load "${skill}" again.`
}
