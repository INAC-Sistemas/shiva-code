import { describe, expect, it } from 'vitest'
import {
  assertPrerequisites,
  loadedSkills,
  missingPrerequisites,
  prerequisiteText,
} from '../src/prerequisites.ts'

const RULES = {
  '01-arquitetura': ['00-start-here'],
  '02-frontend': ['00-start-here', '01-arquitetura'],
}

/** A logged `skill` call and its result, as the session log stores them. */
function load(callId: string, name: string, isError = false) {
  return [
    { type: 'tool/call', data: { callId, name: 'skill', arguments: JSON.stringify({ name }) } },
    {
      type: 'tool/result',
      data: { message: { content: [{ type: 'tool-result', toolCallId: callId, isError, content: [] }] } },
    },
  ]
}

describe('which skills a session has loaded', () => {
  it('counts a skill call whose result succeeded', () => {
    expect(loadedSkills({ events: load('c1', '00-start-here') }, 'skill')).toEqual(new Set(['00-start-here']))
  })

  it('does not count a call that failed, such as one refused for load order', () => {
    expect(loadedSkills({ events: load('c1', '01-arquitetura', true) }, 'skill').size).toBe(0)
  })

  it('reads the packaged harness session through snapshotEvents()', () => {
    const session = { snapshotEvents: () => load('c1', '00-start-here') }
    expect(loadedSkills(session, 'skill').has('00-start-here')).toBe(true)
  })

  it('ignores other tools and a session with no events', () => {
    const events = [
      { type: 'tool/call', data: { callId: 'c1', name: 'read', arguments: '{"name":"00-start-here"}' } },
      { type: 'tool/result', data: { message: { content: [{ toolCallId: 'c1', isError: false }] } } },
    ]
    expect(loadedSkills({ events }, 'skill').size).toBe(0)
    expect(loadedSkills(undefined, 'skill').size).toBe(0)
  })
})

describe('the load-order rule', () => {
  it('requires 00 and the previous stage, reporting what is missing in order', () => {
    expect(missingPrerequisites(RULES, '02-frontend', new Set())).toEqual(['00-start-here', '01-arquitetura'])
    expect(missingPrerequisites(RULES, '02-frontend', new Set(['00-start-here']))).toEqual(['01-arquitetura'])
    expect(missingPrerequisites(RULES, '02-frontend', new Set(['00-start-here', '01-arquitetura']))).toEqual([])
  })

  it('leaves a skill without a rule free', () => {
    expect(missingPrerequisites(RULES, 'frontend-design', new Set())).toEqual([])
  })

  it('tells the model what to load first', () => {
    expect(prerequisiteText('02-frontend', ['00-start-here', '01-arquitetura']))
      .toMatch(/requires "00-start-here", then "01-arquitetura" to be loaded earlier in this session/)
  })

  it('refuses malformed rules at load', () => {
    expect(() => assertPrerequisites({ 'Bad Name': [] })).toThrow(/is not a skill name/)
    expect(() => assertPrerequisites({ '01-x': ['01-x'] })).toThrow(/lists itself/)
    expect(assertPrerequisites(RULES)).toBe(RULES)
  })
})
