import { describe, expect, it } from 'vitest'
import { apply, Config, MARKER_NAMESPACE } from '../src/index.ts'

/** A context that runs effects immediately and records what they registered. */
function fakeContext(withSettings: boolean) {
  const disposers: Array<() => void> = []
  const routes = new Set<string>()
  const namespaces = new Set<string>()
  const scoped = {
    get: () => ({
      register: (ns: string) => {
        namespaces.add(ns)
        return { get: () => ({}), update: async () => {} }
      },
    }),
    effect: (effect: () => () => void) => { disposers.push(effect()) },
  }
  const ctx = {
    get: () => undefined,
    inject: (_services: string[], callback: (sctx: typeof scoped) => void) => {
      if (withSettings) callback(scoped)
    },
    effect: (effect: () => () => void) => { disposers.push(effect()) },
    webServer: {
      register: (route: { path: string }) => {
        routes.add(route.path)
        return () => { routes.delete(route.path) }
      },
    },
  }
  return { ctx, routes, namespaces, dispose: () => { for (const dispose of disposers.splice(0)) dispose() } }
}

describe('apply', () => {
  it('registers the marker section and the routes, and removes the routes on disposal', () => {
    const { ctx, routes, namespaces, dispose } = fakeContext(true)
    apply(ctx as never, Config({}))
    expect(namespaces).toEqual(new Set([MARKER_NAMESPACE]))
    expect(routes).toEqual(new Set(['/setup/api']))
    dispose()
    expect(routes.size).toBe(0)
  })

  it('refuses a non-https OpenRouter base at load', () => {
    const { ctx } = fakeContext(false)
    expect(() => apply(ctx as never, Config({ openrouterBaseUrl: 'http://openrouter.ai/api/v1' })))
      .toThrow('openrouterBaseUrl must be https')
  })

  it('refuses a non-positive timeout at load', () => {
    const { ctx } = fakeContext(false)
    expect(() => apply(ctx as never, Config({ timeoutMs: 0 }))).toThrow('timeoutMs must be a positive integer')
  })
})
