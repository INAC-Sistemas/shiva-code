/**
 * The languages this package adds, each with the copy it carries.
 *
 * A bundle is split into five modules by surface — shared vocabulary, the
 * Settings pages, the agent's own activity, the workspace navigator, and the
 * conversation — because one file per language would put every unrelated
 * review in the same diff. The split is presentation only: the locale service
 * sees one flat namespace map per language.
 */

import type { LocaleDefinition } from '../context-types.ts'
import type { LocaleBundle } from './types.ts'
import { core as ptBRCore } from './pt-BR/core.ts'
import { settings as ptBRSettings } from './pt-BR/settings.ts'
import { agent as ptBRAgent } from './pt-BR/agent.ts'
import { workspace as ptBRWorkspace } from './pt-BR/workspace.ts'
import { conversation as ptBRConversation } from './pt-BR/conversation.ts'
import { core as esCore } from './es/core.ts'
import { settings as esSettings } from './es/settings.ts'
import { agent as esAgent } from './es/agent.ts'
import { workspace as esWorkspace } from './es/workspace.ts'
import { conversation as esConversation } from './es/conversation.ts'

export type { LocaleBundle, LocaleDictionary } from './types.ts'

/** One language: how it presents itself, and every namespace it translates. */
export interface LocaleBundleEntry {
  /** What the picker shows and what `setLocale` stores. */
  definition: LocaleDefinition
  /** The copy, keyed by locale namespace. */
  dictionaries: LocaleBundle
}

/**
 * The pt-BR dictionaries, merged from the five surface modules.
 *
 * Deliberately unannotated: the inferred literal type carries the exact keys,
 * and that is what `scripts/verify-plugin-locales.client.spec.ts` checks against the
 * shipped namespace map. Widening this to `LocaleBundle` would erase every key
 * into `string` and leave the gate with nothing to compare.
 *
 * The modules own disjoint namespaces, so a spread is the whole merge; a
 * namespace appearing in two of them would silently lose one half, and the
 * gate sees the merged result rather than the parts for exactly that reason.
 */
export const PT_BR_DICTIONARIES = {
  ...ptBRCore,
  ...ptBRSettings,
  ...ptBRAgent,
  ...ptBRWorkspace,
  ...ptBRConversation,
}

/** The Spanish dictionaries, merged the same way and left unannotated for the same reason. */
export const ES_DICTIONARIES = {
  ...esCore,
  ...esSettings,
  ...esAgent,
  ...esWorkspace,
  ...esConversation,
}

/**
 * Both languages, in the order the picker lists them after the shipped ones.
 *
 * `pt-BR` keeps its region: the copy is Brazilian, and a reader whose browser
 * asks for European Portuguese is better served by the shipped English than by
 * text that reads as the wrong dialect. Spanish ships region-free because the
 * copy avoids the vocabulary that splits the regional variants.
 */
export const BUNDLES: readonly LocaleBundleEntry[] = [
  {
    definition: { id: 'pt-BR', label: 'Português (Brasil)', documentLanguage: 'pt-BR' },
    dictionaries: PT_BR_DICTIONARIES,
  },
  {
    definition: { id: 'es', label: 'Español', documentLanguage: 'es' },
    dictionaries: ES_DICTIONARIES,
  },
]
