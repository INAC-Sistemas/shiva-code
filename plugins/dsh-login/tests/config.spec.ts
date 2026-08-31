import { describe, expect, it } from 'vitest'
import { assertSessionTtl, assertTimeout, resolveEndpoint, sessionLifetime } from '../src/config.ts'

/** The shipped fallback: the endpoint used when the environment says nothing. */
const SOURCE = { endpoint: 'http://localhost:3000/api/auth/login', endpointEnv: 'DSH_LOGIN_ENDPOINT' }

describe('resolveEndpoint', () => {
  it('falls back to the configured URL when the variable is unset', () => {
    const { url, from } = resolveEndpoint({}, SOURCE)
    expect(url.href).toBe('http://localhost:3000/api/auth/login')
    expect(from).toBe('config')
  })

  it('lets the environment override the profile', () => {
    const { url, from } = resolveEndpoint({ DSH_LOGIN_ENDPOINT: 'https://auth.example.com/login' }, SOURCE)
    expect(url.href).toBe('https://auth.example.com/login')
    expect(from).toBe('env')
  })

  it('treats a blank variable as unset rather than as an empty URL', () => {
    expect(resolveEndpoint({ DSH_LOGIN_ENDPOINT: '   ' }, SOURCE).from).toBe('config')
  })

  it('names the source in the failure when the value is not a URL', () => {
    expect(() => resolveEndpoint({ DSH_LOGIN_ENDPOINT: 'not a url' }, SOURCE))
      .toThrow(/\$DSH_LOGIN_ENDPOINT/)
    expect(() => resolveEndpoint({}, { ...SOURCE, endpoint: 'not a url' }))
      .toThrow(/config\.endpoint/)
  })

  it('refuses a scheme the credentials cannot be posted over', () => {
    expect(() => resolveEndpoint({}, { ...SOURCE, endpoint: 'file:///tmp/login' })).toThrow(/http\(s\)/)
  })
})

describe('assertTimeout', () => {
  it('accepts a positive deadline', () => {
    expect(() => assertTimeout(10_000)).not.toThrow()
  })

  it('refuses a deadline that would abort every request before it is sent', () => {
    expect(() => assertTimeout(0)).toThrow(/positive/)
    expect(() => assertTimeout(Number.NaN)).toThrow(/positive/)
  })
})

describe('assertSessionTtl', () => {
  it('accepts zero as the documented no-expiry value', () => {
    expect(() => assertSessionTtl(0)).not.toThrow()
  })

  it('refuses a negative lifetime', () => {
    expect(() => assertSessionTtl(-1)).toThrow(/zero or a positive/)
  })
})

describe('sessionLifetime', () => {
  it('turns zero into a session with no expiry', () => {
    expect(sessionLifetime(0)).toBeNull()
  })

  it('passes a real lifetime through', () => {
    expect(sessionLifetime(43_200_000)).toBe(43_200_000)
  })
})
