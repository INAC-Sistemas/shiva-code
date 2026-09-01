/** Locale preference stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the locale plugin. */
export const LOCALE_SETTINGS_NAMESPACE = 'locale'

/** Field carrying an explicit locale selection; absence delegates to the browser. */
export const LOCALE_PREFERENCE_FIELD = 'preference'

/** Locale identifiers shipped by the browser client itself. */
export const LOCALE_IDS = ['zh', 'en'] as const

/**
 * Shipped locale identifier — the set the client's own dictionaries cover, and
 * what the typed `register` overload requires of every dictionary owner.
 *
 * It is NOT the set a user may select: a plugin registers further locales at
 * runtime, and their ids are outside this union.
 */
export type LocaleId = typeof LOCALE_IDS[number]

/** Durable locale section shared by the Host schema and the browser scope. */
export interface LocaleSettings {
  /** Explicit locale selection; absence delegates to the browser. */
  preference?: string
}

/**
 * Durable locale schema; also the wire envelope the browser scope validates
 * against.
 *
 * The field is a plain string rather than a union of {@link LOCALE_IDS}
 * because a plugin may ship the locale being named, and the Host writes this
 * document without knowing which plugins the browser composition loaded. The
 * enforcement that remains is the browser's: `setLocale` only ever writes an
 * id the registry holds, and a stored id nothing registers stands aside for
 * the browser-derived locale until the plugin owning it registers.
 */
export const LocaleSettingsSchema: z<LocaleSettings> = z.object({
  [LOCALE_PREFERENCE_FIELD]: z.string().required(false),
})
