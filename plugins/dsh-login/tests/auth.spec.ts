import { describe, expect, it } from 'vitest'
import {
  buildUpstreamPayload,
  interpretUpstream,
  LoginRequestError,
  parseCredentials,
  pickToken,
  withoutPath,
} from '../src/auth.ts'

/** The default reading: a top-level `token` and a session without expiry. */
const READING = { tokenPath: 'token', lifetimeMs: null }

describe('parseCredentials', () => {
  it('trims the identifier and keeps the secret byte for byte', () => {
    expect(parseCredentials({ identifier: '  me@example.com ', password: ' pa ss ' }))
      .toEqual({ identifier: 'me@example.com', password: ' pa ss ' })
  })

  it('refuses a blank identifier before a request is spent on it', () => {
    expect(() => parseCredentials({ identifier: '   ', password: 'x' })).toThrow(LoginRequestError)
  })

  it('refuses an empty password', () => {
    expect(() => parseCredentials({ identifier: 'me', password: '' })).toThrow(/`password`/)
  })

  it('refuses a body that is not a JSON object', () => {
    expect(() => parseCredentials('me:secret')).toThrow(LoginRequestError)
  })
})

describe('buildUpstreamPayload', () => {
  it('maps the pair onto the configured field names', () => {
    expect(buildUpstreamPayload(
      { identifier: 'me@example.com', password: 'secret' },
      { identifierField: 'username', passwordField: 'pass' },
    )).toEqual({ username: 'me@example.com', pass: 'secret' })
  })
})

describe('pickToken', () => {
  it('reads a nested path', () => {
    expect(pickToken({ data: { accessToken: 'abc' } }, 'data.accessToken')).toBe('abc')
  })

  it('reads nothing through the prototype chain', () => {
    expect(pickToken({}, 'constructor.name')).toBeUndefined()
  })

  it('treats an empty or non-string value as no token', () => {
    expect(pickToken({ token: '' }, 'token')).toBeUndefined()
    expect(pickToken({ token: 42 }, 'token')).toBeUndefined()
  })
})

describe('withoutPath', () => {
  it('drops the leaf and leaves the rest of the answer alone', () => {
    expect(withoutPath({ token: 'abc', user: { id: 7 } }, 'token')).toEqual({ user: { id: 7 } })
  })

  it('drops a nested leaf without losing its siblings', () => {
    expect(withoutPath({ data: { accessToken: 'abc', id: 7 } }, 'data.accessToken'))
      .toEqual({ data: { id: 7 } })
  })

  it('returns the answer untouched when the path is absent', () => {
    const answer = { user: { id: 7 } }
    expect(withoutPath(answer, 'token')).toBe(answer)
  })
})

describe('interpretUpstream', () => {
  it('grants a session carrying the token, the rest of the answer, and the lifetime', () => {
    const result = interpretUpstream(
      { status: 200, body: { token: 'abc', user: { id: 7 } } },
      { tokenPath: 'token', lifetimeMs: 60_000 },
    )
    expect(result).toEqual({
      ok: true,
      session: { token: 'abc', user: { user: { id: 7 } }, expiresInMs: 60_000 },
    })
  })

  it('reads a refusal message out of the answer', () => {
    expect(interpretUpstream({ status: 401, body: { message: 'Senha inválida' } }, READING))
      .toEqual({ ok: false, error: { code: 'invalid-credentials', message: 'Senha inválida' } })
  })

  it('names the wrong credentials on 403 as well', () => {
    const result = interpretUpstream({ status: 403, body: undefined }, READING)
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-credentials' } })
  })

  it('refuses a success that carries no token at the configured path', () => {
    const result = interpretUpstream({ status: 200, body: { accessToken: 'abc' } }, READING)
    expect(result).toMatchObject({ ok: false, error: { code: 'malformed' } })
    expect(result.ok ? '' : result.error.message).toContain('`token`')
  })

  it('reports any other status as an upstream failure, with its number', () => {
    const result = interpretUpstream({ status: 500, body: undefined }, READING)
    expect(result).toMatchObject({ ok: false, error: { code: 'upstream' } })
    expect(result.ok ? '' : result.error.message).toContain('500')
  })

  it('keeps a null user when the answer was not a JSON object', () => {
    expect(interpretUpstream({ status: 200, body: 'abc' }, { tokenPath: '', lifetimeMs: null }))
      .toEqual({ ok: true, session: { token: 'abc', user: null, expiresInMs: null } })
  })
})
