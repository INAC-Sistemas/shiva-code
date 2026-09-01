/**
 * Relabelling of sidebar tabs whose owning plugin ships one hardcoded
 * language.
 *
 * Two plugins register their tab with a literal Chinese title that never
 * reaches the locale registry, so no dictionary can translate them. The
 * sidebar resolves a tab's title by calling it at render time, which leaves
 * one honest seam: replace the descriptor's title with a function that reads
 * the active locale on every paint. A switch therefore reaches these labels
 * with no re-registration, and the original is restored on dispose.
 */
import { TAB_TITLES } from '../tab-titles.ts'
import type { ClientContext, SidebarService, SidebarTabDescriptor } from '../context-types.ts'

/** A tab title as the sidebar accepts it. */
type TabTitle = SidebarTabDescriptor['title']

/**
 * Resolve the sidebar's own string-or-function title value.
 * @param title - the descriptor value being replaced.
 * @returns the text it renders as, or `''` when the tab carries no title.
 */
function textOf(title: TabTitle): string {
  if (title === undefined) return ''

  return typeof title === 'function' ? title() : title
}

/**
 * Relabel the tabs named in {@link TAB_TITLES} that are registered right now.
 * @param sidebar - the sidebar service holding the tab registry.
 * @param locale - reads the active locale id at render time.
 * @param originals - titles replaced so far, so a tab is wrapped once and can
 *   be restored; this function fills it.
 */
function relabel(
  sidebar: SidebarService,
  locale: { getSnapshot(): { active: string } },
  originals: Map<string, TabTitle>,
): void {
  for (const [id, translations] of Object.entries(TAB_TITLES)) {
    const descriptor = sidebar.getTab(id)

    // The tab's plugin is not installed, or has not registered yet — the
    // subscription brings us back when it does.
    if (descriptor === undefined) continue
    if (originals.has(id)) continue

    const original = descriptor.title

    originals.set(id, original)
    // Read at call time, not now: the sidebar calls this on every paint, so
    // the label follows a locale switch. An untranslated locale (zh, or one a
    // future plugin adds) falls back to what the tab's own plugin shipped.
    descriptor.title = () => translations[locale.getSnapshot().active] ?? textOf(original)
  }
}

/**
 * Keep the named tabs labelled in the active locale for as long as the
 * sidebar is present.
 * @param ctx - the browser cordis context.
 * @returns disposer restoring every title this installed.
 */
export function installTabTitles(ctx: ClientContext): () => void {
  return ctx.inject(['betterSidebar'], (sidebarCtx) => {
    const sidebar = sidebarCtx.get('betterSidebar') as SidebarService | undefined

    /* v8 ignore next -- defensive: `inject` runs the callback only once the
     * service is provided, so the lookup cannot miss. */
    if (sidebar === undefined) return

    const originals = new Map<string, TabTitle>()

    relabel(sidebar, ctx.locale, originals)

    // A tab registered after this point (plugin activation order is not fixed)
    // arrives through the registry's own change notification.
    const stop = sidebarCtx.effect(
      () => sidebar.subscribe(() => { relabel(sidebar, ctx.locale, originals) }),
      'dsh-i18n: sidebar tab registry watch',
    )

    sidebarCtx.effect(() => () => {
      stop()
      // Put every borrowed title back: this package leaves no trace in another
      // plugin's registry once it unloads.
      for (const [id, original] of originals) {
        const descriptor = sidebar.getTab(id)

        if (descriptor === undefined) continue
        // A tab that carried no title gets the property removed rather than
        // set to undefined: restoring means the descriptor is as it was.
        if (original === undefined) delete descriptor.title
        else descriptor.title = original
      }
      originals.clear()
    }, 'dsh-i18n: restore sidebar tab titles')
  })
}
