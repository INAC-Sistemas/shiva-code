import { describe, expect, it } from 'vitest'
import {
  assertHeaders,
  assertMaxBodyBytes,
  assertRank,
  assertTimeout,
  resolveEndpoint,
} from '../src/config.ts'

describe('resolveEndpoint', () => {
  it('accepts https and appends a trailing slash so sub-paths append', () => {
    expect(resolveEndpoint('https://vps/api/plugins/skill-library').href)
      .toBe('https://vps/api/plugins/skill-library/')
    expect(new URL('skills', resolveEndpoint('https://vps/api/plugins/skill-library')).href)
      .toBe('https://vps/api/plugins/skill-library/skills')
  })

  it('keeps a trailing slash that is already there', () => {
    expect(resolveEndpoint('https://vps/api/x/').href).toBe('https://vps/api/x/')
  })

  it.each(['localhost', '127.0.0.1'])('allows plain http on %s, where the dev server runs', (host) => {
    expect(resolveEndpoint(`http://${host}:3000/api`).protocol).toBe('http:')
  })

  // Bodies and the bearer token share this request; off loopback both would be
  // readable by anything on the path.
  it('refuses plain http off loopback', () => {
    expect(() => resolveEndpoint('http://vps.example.com/api'))
      .toThrow(/must be https off loopback/)
  })

  it('refuses a relative value', () => {
    expect(() => resolveEndpoint('/api/plugins')).toThrow(/not an absolute URL/)
  })

  it('refuses a non-http scheme', () => {
    expect(() => resolveEndpoint('ftp://vps/api')).toThrow(/must be http\(s\)/)
  })
})

describe('assertTimeout', () => {
  it('accepts a positive deadline', () => {
    expect(() => assertTimeout(1, 'listTimeoutMs')).not.toThrow()
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('refuses %s', (value) => {
    expect(() => assertTimeout(value, 'getTimeoutMs')).toThrow(/getTimeoutMs must be a positive finite number/)
  })
})

describe('assertRank', () => {
  it('accepts a finite rank, including a negative one', () => {
    expect(() => assertRank(-10)).not.toThrow()
  })

  it('refuses a non-finite rank', () => {
    expect(() => assertRank(Number.NaN)).toThrow(/rank must be a finite number/)
  })
})

describe('assertMaxBodyBytes', () => {
  it('refuses a cap that would reject every skill', () => {
    expect(() => assertMaxBodyBytes(0)).toThrow(/positive finite number/)
  })
})

describe('assertHeaders', () => {
  it('accepts ordinary headers', () => {
    expect(() => assertHeaders({ 'x-tenant': 'acme' })).not.toThrow()
  })

  // A static token would sit in front of the session credential and silently
  // shadow whoever is signed in.
  it('refuses a configured authorization', () => {
    expect(() => assertHeaders({ Authorization: 'Bearer x' }))
      .toThrow(/must not set "authorization"/)
  })

  it('refuses a name that is not a field name', () => {
    expect(() => assertHeaders({ 'bad name': 'v' })).toThrow(/is not a valid header name/)
  })

  it('refuses a blank value', () => {
    expect(() => assertHeaders({ 'x-tenant': '  ' })).toThrow(/has a blank value/)
  })
})
