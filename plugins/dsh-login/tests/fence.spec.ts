import { describe, expect, it } from 'vitest'
import { isSameOriginRequest } from '../src/fence.ts'

describe('isSameOriginRequest', () => {
  it('accepts the app\'s own page', () => {
    expect(isSameOriginRequest({ headers: { 'sec-fetch-site': 'same-origin' } })).toBe(true)
  })

  it('accepts a navigation with no origin of its own', () => {
    expect(isSameOriginRequest({ headers: { 'sec-fetch-site': 'none' } })).toBe(true)
  })

  it('refuses another site driving the route through a browser', () => {
    expect(isSameOriginRequest({ headers: { 'sec-fetch-site': 'cross-site' } })).toBe(false)
    expect(isSameOriginRequest({ headers: { 'sec-fetch-site': 'same-site' } })).toBe(false)
  })

  it('compares Origin against Host when the browser sends no fetch metadata', () => {
    expect(isSameOriginRequest({ headers: { origin: 'http://localhost:5173', host: 'localhost:5173' } })).toBe(true)
    expect(isSameOriginRequest({ headers: { origin: 'https://evil.example', host: 'localhost:5173' } })).toBe(false)
  })

  it('refuses an Origin it cannot compare', () => {
    expect(isSameOriginRequest({ headers: { origin: 'null', host: 'localhost:5173' } })).toBe(false)
    expect(isSameOriginRequest({ headers: { origin: 'http://localhost:5173' } })).toBe(false)
  })

  it('lets a non-browser caller through — this is a cross-site defense, not authentication', () => {
    expect(isSameOriginRequest({ headers: {} })).toBe(true)
  })
})
