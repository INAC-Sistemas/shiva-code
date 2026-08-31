import { describe, expect, it } from 'vitest'
import { parseCatalog, parseSkill, SkillLibraryFormatError } from '../src/wire.ts'

const summary = {
  name: 'my-skill',
  description: 'Does a thing',
  invocation: { modelInvocable: true, userInvocable: true },
  revision: 3,
}

describe('parseCatalog', () => {
  it('reads every published entry', () => {
    const parsed = parseCatalog({ revision: 3, skills: [summary, { ...summary, name: 'other', whenToUse: 'later' }] })

    expect(parsed).toEqual([
      { name: 'my-skill', description: 'Does a thing', modelInvocable: true, userInvocable: true, revision: 3 },
      { name: 'other', description: 'Does a thing', whenToUse: 'later', modelInvocable: true, userInvocable: true, revision: 3 },
    ])
  })

  it('accepts an empty catalog', () => {
    expect(parseCatalog({ revision: 0, skills: [] })).toEqual([])
  })

  it('drops a blank whenToUse rather than carrying it', () => {
    expect(parseCatalog({ skills: [{ ...summary, whenToUse: '' }] })[0]).not.toHaveProperty('whenToUse')
  })

  it('rejects a body that is not an object', () => {
    expect(() => parseCatalog('nope')).toThrow(SkillLibraryFormatError)
  })

  it('rejects a body without a skills array', () => {
    expect(() => parseCatalog({ revision: 1 })).toThrow(/no "skills" array/)
  })

  // One bad entry fails the catalog: a silently skipped skill is indistinguishable
  // from one that was deliberately unpublished.
  it('rejects the whole catalog when one entry is unusable', () => {
    expect(() => parseCatalog({ skills: [summary, { ...summary, description: '' }] }))
      .toThrow(/entry 1 has no usable "description"/)
  })

  it('rejects a name that is not kebab-case', () => {
    expect(() => parseCatalog({ skills: [{ ...summary, name: 'Not_Kebab' }] }))
      .toThrow(/not kebab-case/)
  })

  it('rejects a missing invocation block', () => {
    const { invocation: _dropped, ...without } = summary

    expect(() => parseCatalog({ skills: [without] })).toThrow(/"invocation" is not an object/)
  })

  it('rejects a non-boolean invocation control', () => {
    expect(() => parseCatalog({ skills: [{ ...summary, invocation: { modelInvocable: 'yes', userInvocable: true } }] }))
      .toThrow(/no boolean "modelInvocable"/)
  })

  it('rejects a non-numeric revision', () => {
    expect(() => parseCatalog({ skills: [{ ...summary, revision: 'three' }] }))
      .toThrow(/no numeric "revision"/)
  })
})

describe('parseSkill', () => {
  it('reads the body', () => {
    expect(parseSkill({ ...summary, content: '# Body' }, 'my-skill')).toEqual({
      name: 'my-skill',
      description: 'Does a thing',
      modelInvocable: true,
      userInvocable: true,
      revision: 3,
      content: '# Body',
    })
  })

  // The registry rejects a mismatched name too, but a body reaching the model is
  // this plugin's product: catching it here names the endpoint in the error.
  it('rejects a body that names another skill', () => {
    expect(() => parseSkill({ ...summary, content: 'x' }, 'other-skill'))
      .toThrow(/was requested but the library answered with "my-skill"/)
  })

  it('rejects an empty body', () => {
    expect(() => parseSkill({ ...summary, content: '' }, 'my-skill'))
      .toThrow(/no usable "content"/)
  })
})
