import { describe, expect, it } from 'vitest'
import { displayName, initials, UNKNOWN_INITIALS } from '../src/client/identity.ts'

describe('displayName', () => {
  it('reads the name the login service returned', () => {
    expect(displayName({ name: 'admin', email: 'admin@inacsistemas.com' })).toBe('admin')
  })

  it('trims surrounding whitespace', () => {
    expect(displayName({ name: '  Ana Silva  ' })).toBe('Ana Silva')
  })

  it('reads a name nested under a container, as `{ token, user }` leaves behind', () => {
    // dsh-login stores the answer MINUS the token, so a service answering
    // `{ token, user: {…} }` leaves `{ user: {…} }` here.
    expect(displayName({ user: { name: 'admin', email: 'admin@inacsistemas.com' } })).toBe('admin')
  })

  it('reads a nested name whatever the container is called', () => {
    expect(displayName({ data: { name: 'Ana' } })).toBe('Ana')
    expect(displayName({ profile: { name: 'Ana' } })).toBe('Ana')
  })

  it('prefers a name at the top level over a nested one', () => {
    expect(displayName({ name: 'topo', user: { name: 'aninhado' } })).toBe('topo')
  })

  it('falls back to a nested e-mail', () => {
    expect(displayName({ user: { email: 'ana@example.com' } })).toBe('ana')
  })

  it('does not descend past one level', () => {
    expect(displayName({ a: { b: { name: 'fundo demais' } } })).toBeNull()
  })

  it('ignores arrays while descending', () => {
    expect(displayName({ roles: [{ name: 'ADMIN' }] })).toBeNull()
  })

  it('falls back to the e-mail local part, so the badge shows the person not the domain', () => {
    expect(displayName({ email: 'ana.silva@example.com' })).toBe('ana.silva')
  })

  it('ignores a blank name in favour of the e-mail', () => {
    expect(displayName({ name: '   ', email: 'ana@example.com' })).toBe('ana')
  })

  // The value is whatever the login service returned: every shape is possible.
  it.each([
    ['null', null],
    ['a string', 'admin'],
    ['a number', 7],
    ['an empty object', {}],
    ['a wrong-typed name', { name: 42 }],
    ['a blank e-mail', { email: '   ' }],
    ['an e-mail that is only a domain', { email: '@example.com' }],
  ])('returns null for %s', (_label, user) => {
    expect(displayName(user)).toBeNull()
  })
})

describe('initials', () => {
  it('takes the first two letters, upper-cased', () => {
    expect(initials('admin')).toBe('AD')
  })

  it('keeps them from the first word when the name has several', () => {
    expect(initials('Ana Silva')).toBe('AN')
  })

  it('upper-cases an already upper-case name unchanged', () => {
    expect(initials('AD')).toBe('AD')
  })

  it('yields one letter for a one-character name', () => {
    expect(initials('a')).toBe('A')
  })

  it('counts an accented letter as one character', () => {
    expect(initials('ácido')).toBe('ÁC')
  })

  it('counts a non-Latin letter as one character, not half a surrogate pair', () => {
    // Two code points that are four UTF-16 units: a naive slice(0, 2) would
    // cut the first one in half and render a replacement glyph.
    expect(initials('𝒜𝓁ice')).toBe('𝒜𝓁')
  })

  it('falls back to a placeholder with no name', () => {
    expect(initials(null)).toBe(UNKNOWN_INITIALS)
    expect(initials('   ')).toBe(UNKNOWN_INITIALS)
  })
})
