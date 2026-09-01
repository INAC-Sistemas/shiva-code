/**
 * The shape a translation in this package takes.
 *
 * A bundle is keyed by the locale namespace its shipped owner registered its
 * own copy under, because that is the address `locale.register` takes and the
 * unit the lookup chain resolves against. Grouping by owning package instead
 * would put the same namespace in two places the day two packages contribute
 * to one namespace.
 */

/** One namespace's copy in one language: flat key to template string. */
export type LocaleDictionary = Record<string, string>

/** Every namespace this package translates, for one language. */
export type LocaleBundle = Record<string, LocaleDictionary>
