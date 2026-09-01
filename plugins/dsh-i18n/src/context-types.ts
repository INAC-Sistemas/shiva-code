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
   * The current locale snapshot. Read at render time by the sidebar tab
   * titles this package overrides, so a switch reaches them without
   * re-registering anything.
   */
  getSnapshot(): { active: string }
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

/** A sidebar tab type as `dsh-better-sidebar` holds it in its registry. */
export interface SidebarTabDescriptor {
  /** Registration id, e.g. `dsh-docs-panel:docs`. */
  id: string
  /**
   * The rail label. The sidebar resolves it at render time (its own helper
   * calls a function value on every paint), which is what lets a replacement
   * follow locale switches without re-registering the tab.
   */
  title?: string | (() => string)
}

/**
 * The `dsh-better-sidebar` service face (mirror of its client service — only
 * the slices this package touches).
 *
 * Only reads and the tab registry: this package never registers a tab of its
 * own, it relabels tabs other plugins registered.
 */
export interface SidebarService {
  /**
   * @param id - a registered tab id.
   * @returns the descriptor as the registry holds it, or undefined.
   */
  getTab(id: string): SidebarTabDescriptor | undefined
  /**
   * Notified whenever the tab registry changes, which is how a tab registered
   * after this plugin activates still gets relabelled.
   * @param listener - change callback.
   * @returns unsubscribe.
   */
  subscribe(listener: () => void): () => void
}

/** The browser cordis context after the client runtime provides its services. */
export interface ClientContext {
  locale: LocaleService
  /**
   * Read an optional service by name; `undefined` when nothing provides it.
   * @param name - service name.
   * @returns the service, or undefined.
   */
  get(name: string): unknown
  /**
   * Run a callback for each lifetime of the named services, so work that
   * depends on an OPTIONAL plugin waits for it and unwinds with it.
   * @param services - service names to wait for.
   * @param callback - receives the context in which they are available.
   * @returns disposer for the wait and anything the callback set up.
   */
  inject(services: string[], callback: (ctx: ClientContext) => void): () => void
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
