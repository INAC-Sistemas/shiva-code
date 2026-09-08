import { describe, expect, it } from 'vitest'
import { assertTimeout, resolveEndpoint } from '../src/config.ts'

describe('resolveEndpoint', () => {
  it('accepts an https endpoint', () => {
    expect(resolveEndpoint('profilesEndpoint', 'https://vps.example/api/profiles').href)
      .toBe('https://vps.example/api/profiles')
  })

  it('accepts plain http on loopback, where the plugin manager runs in development', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(() => resolveEndpoint('activeEndpoint', `http://${host}:3000/api/profiles/active`))
        .not.toThrow()
    }
  })

  it('refuses plain http off loopback', () => {
    // The signed-in bearer token travels on this request, and the answer decides
    // which plugins this machine composes.
    expect(() => resolveEndpoint('profilesEndpoint', 'http://vps.example/api/profiles'))
      .toThrow(/must be https off loopback/)
  })

  it('refuses a relative or non-http URL, naming the field', () => {
    expect(() => resolveEndpoint('specEndpoint', '/api/profiles'))
      .toThrow(/specEndpoint is not an absolute URL/)
    expect(() => resolveEndpoint('specEndpoint', 'ftp://vps.example/x'))
      .toThrow(/specEndpoint must be http\(s\)/)
  })
})

describe('assertTimeout', () => {
  it('accepts a positive integer', () => {
    expect(assertTimeout('timeoutMs', 5_000)).toBe(5_000)
  })

  it('refuses zero, negatives and fractions', () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      expect(() => assertTimeout('timeoutMs', value), String(value)).toThrow(/positive integer/)
    }
  })
})
