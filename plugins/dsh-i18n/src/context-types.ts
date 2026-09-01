/**
 * Structural types for the cordis services this plugin consumes.
 *
 * A third-party plugin resolves outside the DSH monorepo's single cordis
 * instance, so the upstream `declare module` augmentations do not reach its
 * Context and the npm `cordis` package does not declare the DSH-vendored
 * runtime members. The faces below mirror the runtime shapes this plugin
 * actually touches — the client locale service and nothing else — so drift
 * from upstream is contained to this file.
 *
 * The same distance is why the dictionaries here are plain
 * `Record<string, string>`: `LocaleNamespaceMap`, which types the shipped
 * registration sites against each namespace's key union, is an augmentation
 * of a monorepo package and cannot reach a plugin. Completeness is proved
 * instead by `scripts/verify-plugin-locales.ts`, which lives in the
 * repository, sees the merged map, and fails on a missing or unknown key.
 *
 * This file must stay free of Node.js and React value imports: it is compiled
 * into the browser bundle, where the purity gate rejects anything but the
 * shared module-table entries.
 */

/** One locale as the service's selectable set holds it. */
export interface LocaleDefinition {
  /** Locale id: what `setLocale` takes and the settings document stores. */
  id: string
  /** Display name in its own language — a language names itself. */
  label: string
  /** BCP 47 tag published as `<html lang>` while this locale is active. */
  documentLanguage: string
}

/**
 * The client locale service face (mirror of @deepseek-ai/dsh-client-locale's
 * LocaleRuntime — only the slices this plugin touches).
 */
export interface LocaleService {
  /**
   * Add a locale to the selectable set.
   * @param definition - the locale, its display name, and its document language.
   * @returns disposer removing it (the reader falls back off it).
   * @throws Error when the id is already registered.
   */
  registerLocale(definition: LocaleDefinition): () => void
  /**
   * Supply one locale's dictionary for one namespace.
   * @param ns - the namespace the shipped owner registered its own copy under.
   * @param locale - the locale id this dictionary is written in.
   * @param dict - flat key to template string ({name} placeholders).
   * @returns disposer removing this dictionary.
   * @throws Error when the (namespace, locale) pair already has an owner.
   */
  register(ns: string, locale: string, dict: Record<string, string>): () => void
}

/** The browser cordis context after the client runtime provides its services. */
export interface ClientContext {
  locale: LocaleService
  /**
   * Register a disposable effect owned by this plugin's fiber.
   * @param callback - creates the disposer released on unload.
   * @param label - effect name in diagnostics.
   * @returns disposer for the effect.
   */
  effect(callback: () => () => void, label?: string): () => void
}

/** The host cordis context; this plugin's host half registers nothing on it. */
export interface HostContext {}
