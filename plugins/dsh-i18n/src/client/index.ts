/**
 * Client half of dsh-i18n: two languages added to the shipped locale service.
 *
 * Each language is one effect that registers the locale and then every
 * namespace dictionary it carries, so unloading the plugin removes the
 * language and its copy together — a locale left selectable with no
 * dictionary would render the shipped English through the fallback chain
 * while the picker claimed otherwise.
 *
 * Registering a language does not switch anyone to it. The service re-resolves
 * the active locale against what is registered, so a reader whose stored
 * preference or browser already asks for one of these lands on it the moment
 * the plugin loads, and everyone else stays where they were.
 */
import { BUNDLES } from '../locales/index.ts'
import { installTabTitles } from './tab-titles.ts'
import type { ClientContext } from '../context-types.ts'

/**
 * Services required before mounting; provided by the shipped locale plugin.
 *
 * `betterSidebar` is deliberately absent: the tab relabelling waits for it
 * through `ctx.inject`, so a composition without that sidebar still gets the
 * languages.
 */
export const inject = ['locale']

/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the locale service.
 */
export function apply(ctx: ClientContext): void {
  for (const bundle of BUNDLES) {
    ctx.effect(() => {
      const disposers = [ctx.locale.registerLocale(bundle.definition)]

      for (const [namespace, dictionary] of Object.entries(bundle.dictionaries)) {
        disposers.push(ctx.locale.register(namespace, bundle.definition.id, dictionary))
      }

      // Reverse order: the locale that made the dictionaries addressable goes
      // last, so nothing is left resolving against a half-removed language.
      return () => { for (const dispose of disposers.reverse()) dispose() }
    }, `dsh-i18n: ${bundle.definition.id}`)
  }

  // Tabs whose owning plugin ships one hardcoded language reach no dictionary;
  // they are relabelled in the sidebar registry instead.
  installTabTitles(ctx)
}
