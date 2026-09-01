/**
 * Sidebar tab labels this package relabels on behalf of plugins that do not
 * translate their own.
 *
 * These are NOT locale-namespace dictionaries, and they are deliberately kept
 * out of `src/locales/`: the completeness gate asserts the bundles against
 * exactly the namespaces the shipped panel registers, and a namespace no
 * shipped package declares would fail it. These labels belong to no namespace
 * at all — they are string literals baked into other plugins' built bundles,
 * with no key to override.
 *
 * The consequence is that this table is unverified: nothing fails when a
 * plugin renames a tab or ships one of its own translations. It is a
 * deliberate override of third-party copy, so it carries the risk that goes
 * with reaching into someone else's registry — a stale entry shows the wrong
 * label rather than the right one, which is why every entry falls back to the
 * plugin's own title when the active locale is absent here.
 *
 * `zh` is absent on purpose: these plugins are written in Chinese, so a
 * Chinese reader is already served by the label they ship.
 */

/** Locale id to label, for one tab. */
export type TabTitleTranslations = Record<string, string>

/**
 * Tab id to its label per locale.
 *
 * `dsh-flowglass` publishes no Latin-script name for itself, so the package
 * name stands in as the brand rather than an invented translation of 流镜
 * ("flow mirror"); `dsh-docs-panel` already ships an English build calling it
 * "Global docs", which is the wording followed here.
 */
export const TAB_TITLES: Record<string, TabTitleTranslations> = {
  'dsh-docs-panel:docs': {
    en: 'Global docs',
    'pt-BR': 'Documentos globais',
    es: 'Documentos globales',
  },
  'dsh-flowglass:flow': {
    en: 'Flowglass',
    'pt-BR': 'Flowglass',
    es: 'Flowglass',
  },
}
