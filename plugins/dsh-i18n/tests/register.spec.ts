import { describe, expect, it } from 'vitest'
import { apply } from '../src/client/index.ts'
import { BUNDLES } from '../src/locales/index.ts'
import type {
  ClientContext, LocaleDefinition, SidebarService, SidebarTabDescriptor,
} from '../src/context-types.ts'

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
function harness(options: { sidebar?: SidebarService; active?: string } = {}): {
  ctx: ClientContext
  locales: LocaleDefinition[]
  registrations: Registration[]
  setActive: (id: string) => void
  dispose: () => void
} {
  const locales: LocaleDefinition[] = []
  const registrations: Registration[] = []
  const disposers: (() => void)[] = []
  let active = options.active ?? 'pt-BR'

  const ctx: ClientContext = {
    locale: {
      getSnapshot: () => ({ active }),
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
    get: name => (name === 'betterSidebar' ? options.sidebar : undefined),
    inject(services, callback) {
      // The double runs the callback only when every named service is present,
      // which is the part of `inject` this plugin depends on.
      if (services.every(name => ctx.get(name) !== undefined)) callback(ctx)
      return () => {}
    },
  }

  return {
    ctx,
    locales,
    registrations,
    setActive: (id) => { active = id },
    dispose: () => { for (const dispose of disposers.reverse()) dispose() },
  }
}

/**
 * A sidebar tab registry standing in for `dsh-better-sidebar`.
 * @param descriptors - the tabs already registered when the plugin activates.
 * @returns the service double plus a way to register one later.
 */
function sidebarDouble(descriptors: SidebarTabDescriptor[]): {
  service: SidebarService
  add: (descriptor: SidebarTabDescriptor) => void
} {
  const tabs = new Map(descriptors.map(d => [d.id, d]))
  const listeners = new Set<() => void>()

  return {
    service: {
      getTab: id => tabs.get(id),
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
    add(descriptor) {
      tabs.set(descriptor.id, descriptor)
      for (const listener of [...listeners]) listener()
    },
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

describe('sidebar tab relabelling', () => {
  const docs = (): SidebarTabDescriptor => ({
    id: 'dsh-docs-panel:docs',
    title: () => '全局文档',
  })

  it('relabels a tab whose plugin hardcodes one language', () => {
    const sidebar = sidebarDouble([docs()])
    const { ctx } = harness({ sidebar: sidebar.service, active: 'pt-BR' })

    apply(ctx)

    expect(sidebar.service.getTab('dsh-docs-panel:docs')?.title).toBeTypeOf('function')
    expect((sidebar.service.getTab('dsh-docs-panel:docs')!.title as () => string)())
      .toBe('Documentos globais')
  })

  it('follows a locale switch without re-registering', () => {
    const sidebar = sidebarDouble([docs()])
    const { ctx, setActive } = harness({ sidebar: sidebar.service, active: 'pt-BR' })

    apply(ctx)
    const title = sidebar.service.getTab('dsh-docs-panel:docs')!.title as () => string

    // The sidebar calls the title on every paint, so the same function must
    // answer differently after a switch.
    setActive('es')
    expect(title()).toBe('Documentos globales')
    setActive('en')
    expect(title()).toBe('Global docs')
  })

  it('falls back to the plugin copy for a locale it does not cover', () => {
    const sidebar = sidebarDouble([docs()])
    const { ctx, setActive } = harness({ sidebar: sidebar.service, active: 'pt-BR' })

    apply(ctx)
    const title = sidebar.service.getTab('dsh-docs-panel:docs')!.title as () => string

    // Chinese is what those plugins ship; a reader in it keeps their wording.
    setActive('zh')
    expect(title()).toBe('全局文档')
  })

  it('relabels a tab registered after activation', () => {
    const sidebar = sidebarDouble([])
    const { ctx } = harness({ sidebar: sidebar.service, active: 'pt-BR' })

    apply(ctx)
    // Plugin activation order is not fixed: the tab may arrive later.
    sidebar.add(docs())

    expect((sidebar.service.getTab('dsh-docs-panel:docs')!.title as () => string)())
      .toBe('Documentos globais')
  })

  it('restores the plugin title on dispose', () => {
    const sidebar = sidebarDouble([docs()])
    const { ctx, dispose } = harness({ sidebar: sidebar.service, active: 'pt-BR' })

    apply(ctx)
    dispose()

    // Nothing of this package is left in another plugin's registry.
    expect((sidebar.service.getTab('dsh-docs-panel:docs')!.title as () => string)())
      .toBe('全局文档')
  })

  it('registers the languages with no sidebar present', () => {
    const { ctx, locales } = harness()

    apply(ctx)

    expect(locales.map(l => l.id)).toEqual(['pt-BR', 'es'])
  })
})
