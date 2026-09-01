/**
 * Sidebar tab labels this package relabels on behalf of the plugins that own
 * them.
 *
 * The sidebar rail is assembled from tab descriptors, and every label there
 * resolves outside the locale registry this package feeds: `dsh-better-sidebar`
 * keeps its own zh/en dictionaries and picks between them with a
 * `startsWith('zh')` test, so every other language lands on English; the tabs
 * other plugins register carry either that same two-language treatment or a
 * literal string. Either way there is no key for a dictionary to override.
 *
 * These are NOT locale-namespace dictionaries, and they are deliberately kept
 * out of `src/locales/`: the completeness gate asserts the bundles against
 * exactly the namespaces the shipped panel registers, and a namespace no
 * shipped package declares would fail it.
 *
 * The consequence is that this table is unverified: nothing fails when a
 * plugin renames a tab, changes its id, or starts translating itself. It is a
 * deliberate override of other packages' copy, which is why every entry falls
 * back to the tab's own title when the active locale is absent here — a stale
 * entry shows the original label rather than a broken one.
 *
 * `zh` is absent throughout on purpose: every one of these plugins is written
 * in Chinese, so a Chinese reader is already served by what it ships.
 */

/** Locale id to label, for one tab. */
export type TabTitleTranslations = Record<string, string>

/**
 * Tab id to its label per locale.
 *
 * The six ids without a package prefix are `dsh-better-sidebar`'s own built-in
 * tabs, which it registers through the same registry as everyone else.
 *
 * Names that are brands stay untranslated in every language: `dsh-flowglass`
 * publishes no Latin-script name, so its package name stands in rather than an
 * invented translation of 流镜 ("flow mirror"), and MDS, SSH and Prototype are
 * read the same way in all three.
 */
export const TAB_TITLES: Record<string, TabTitleTranslations> = {
  // dsh-better-sidebar's built-ins.
  editor: {
    'pt-BR': 'Arquivos',
    es: 'Archivos',
  },
  git: {
    'pt-BR': 'Controle de versão',
    es: 'Control de versiones',
  },
  subagent: {
    'pt-BR': 'Tarefas',
    es: 'Tareas',
  },
  sidechat: {
    'pt-BR': 'Chat lateral (beta)',
    es: 'Chat lateral (beta)',
  },
  terminal: {
    'pt-BR': 'Terminal',
    es: 'Terminal',
  },
  browser: {
    'pt-BR': 'Navegador',
    es: 'Navegador',
  },

  // Tabs other plugins register.
  'dsh-openviking:memory': {
    'pt-BR': 'Memória',
    es: 'Memoria',
  },
  'dsh-prototype:view': {
    'pt-BR': 'Protótipo',
    es: 'Prototipo',
  },
  'dsh-mds:artifacts': {
    'pt-BR': 'MDS',
    es: 'MDS',
  },
  'dsh-ssh-tunnel': {
    'pt-BR': 'Túnel SSH',
    es: 'Túnel SSH',
  },
  'dsh-sidebar-qa:ask': {
    'pt-BR': 'Acompanhamento',
    es: 'Seguimiento',
  },
  'dsh-sidebar-qa:history': {
    'pt-BR': 'Acompanhamentos',
    es: 'Seguimientos',
  },

  // Tabs whose plugin ships Chinese only: English is supplied here too, so a
  // reader in any of the three stops seeing a language they did not choose.
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
