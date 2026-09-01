# @deepseek-ai/dsh-client-locale

English | [中文](README.zh.md)

Locale plugin: LocaleRuntime — the `locale.preference` selection stored in `$DSH_HOME/settings.yaml`; when that explicit Host value is absent, a fresh browser starts in the language `navigator` asks for (a tag matches a locale it equals outright or whose id is its primary subtag, with `en` when it asks for no registered language). The Host read runs after plugin activation so an unavailable settings service cannot block the page; its result replaces the browser-derived value live. Remote browsers retain only a process-local selection because the settings API is loopback-only. `locale/change` fires on switches, and the plugin points `<html lang>` at the active locale's own `documentLanguage` tag on activation and on every snapshot change. The service also owns the ns×locale dictionary registry (typed `register(ns, {zh, en})` checked against `LocaleNamespaceMap`, `bind(ns)`→`TranslateNS<ns>`; lookup chain ns → common → en → key), implements the slot system's `LocaleFace`, and installs itself through `ctx.slots.installLocale`, backing the framework-injected `t` standard seat (`Translate`/`TranslateNS` are ui-slots types; import them from there — this package only re-exports for dictionary owners' convenience). The [Host-backed preferences decision](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.md) owns the persistence boundary.

`zh` and `en` are what this package ships, not the set a reader may pick: `registerLocale(definition)` adds a language at runtime, and the untyped `register(ns, locale, dict)` overload supplies its copy — the seam a translation plugin uses ([the decision](../../../.agents/notes/implemented/feature/2026-09-01-plugin-supplied-browser-locales.md), and [dsh-i18n](../../../plugins/dsh-i18n/README.md) as the first consumer). The stored preference is kept as written and re-resolved against the registry on every change, so an id whose plugin has not activated yet stands aside rather than collapsing to a shipped locale, and takes effect the moment that plugin registers.

## Model Experience

None, as the locale registry serves browser UI copy; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Some surfaces keep inline copy** — Settings rows, the sidebar, question composer, and model select use locale seats; other packages still own static text directly.
- **Registry-held text reads its translation once** — copy captured at registration time outside the slot render path (e.g. the `/model` command description in the command registry) keeps the language it was registered under until re-registration; slot-rendered copy follows switches live.
- **The durable preference is no longer self-validating** — the field takes any string, because the Host writes it without knowing which locale plugins the browser loaded. A document naming a locale nothing registers leaves the reader on the browser-derived language, so the failure is silent rather than loud.
- **A plugin's dictionaries are unchecked by this package** — `registerLocale` and the untyped `register` overload accept any keys. Completeness against `LocaleNamespaceMap` is proved by `scripts/verify-plugin-locales.client.spec.ts`, whose import list is what decides which namespaces a translation must cover.
