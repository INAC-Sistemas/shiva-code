import { describe, expect, it } from 'vitest'
import { apply } from '../src/client/index.ts'
import { BUNDLES } from '../src/locales/index.ts'
import type { ClientContext, LocaleDefinition } from '../src/context-types.ts'

/** What one `register` call recorded. */
interface Registration {
  namespace: string
  locale: string
  dictionary: Record<string, string>
}

/**
 * A locale service that records what the plugin does to it, standing in for
 * the shipped `LocaleRuntime`. The plugin sees the service only through the
 * structural face it declares, so the double implements exactly that face.
 * @returns the fake context plus the recorded calls and the effect disposers.
 */
function harness(): {
  ctx: ClientContext
  locales: LocaleDefinition[]
  registrations: Registration[]
  dispose: () => void
} {
  const locales: LocaleDefinition[] = []
  const registrations: Registration[] = []
  const disposers: (() => void)[] = []

  const ctx: ClientContext = {
    locale: {
      registerLocale(definition) {
        if (locales.some(l => l.id === definition.id)) {
          throw new Error(`locale "${definition.id}" is already registered`)
        }
        locales.push(definition)
        return () => {
          const at = locales.indexOf(definition)
          if (at !== -1) locales.splice(at, 1)
        }
      },
      register(namespace, locale, dictionary) {
        const entry: Registration = { namespace, locale, dictionary }
        registrations.push(entry)
        return () => {
          const at = registrations.indexOf(entry)
          if (at !== -1) registrations.splice(at, 1)
        }
      },
    },
    effect(callback) {
      const dispose = callback()
      disposers.push(dispose)
      return dispose
    },
  }

  return {
    ctx,
    locales,
    registrations,
    dispose: () => { for (const dispose of disposers.reverse()) dispose() },
  }
}

describe('dsh-i18n client half', () => {
  it('registers every shipped language with all of its namespaces', () => {
    const { ctx, locales, registrations } = harness()

    apply(ctx)

    expect(locales.map(l => l.id)).toEqual(['pt-BR', 'es'])
    expect(locales.map(l => l.documentLanguage)).toEqual(['pt-BR', 'es'])

    for (const bundle of BUNDLES) {
      const namespaces = Object.keys(bundle.dictionaries)
      const registered = registrations
        .filter(entry => entry.locale === bundle.definition.id)
        .map(entry => entry.namespace)

      expect(registered.sort()).toEqual(namespaces.sort())
    }
  })

  it('removes the language and its copy together on dispose', () => {
    const { ctx, locales, registrations, dispose } = harness()

    apply(ctx)
    expect(locales.length).toBeGreaterThan(0)
    expect(registrations.length).toBeGreaterThan(0)

    dispose()

    // A language left selectable with no dictionary would render the shipped
    // English through the fallback chain while the picker claimed otherwise.
    expect(locales).toEqual([])
    expect(registrations).toEqual([])
  })

  it('carries a self-described label for each language', () => {
    // A language names itself: a picker that labelled Português in English
    // would be unreadable to the reader who needs it.
    expect(BUNDLES.map(bundle => bundle.definition.label))
      .toEqual(['Português (Brasil)', 'Español'])
  })
})
