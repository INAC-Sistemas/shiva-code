# Agent Note: plugin-supplied browser locales

Status: implemented

English | [中文](2026-09-01-plugin-supplied-browser-locales.zh.md)

## Problem

The web panel shipped two languages, `zh` and `en`, and the set was closed in three independent places: a frozen module-level `LOCALES` array, a `Record<LocaleId, string>` of `<html lang>` tags, and a `z.union([...LOCALE_IDS])` guarding the durable preference. A fourth language could only arrive by editing the locale package and adding its dictionary to all 29 shipped registration sites, in one change, in-tree.

That is the wrong shape for a translation. A language is additive — it takes nothing away from the readers who do not use it — and the people who can write one are rarely the people who own the packages whose copy it translates. Nothing about Brazilian Portuguese belongs inside `ui-conversation`.

The obstacle is that `LocaleNamespaceMap`, the declaration-merged interface that types each registration site against its namespace's key union, is an augmentation of a monorepo package. A plugin resolves outside the monorepo's cordis instance and does not receive it, so a plugin's dictionaries are `Record<string, string>` and its own `tsc` has nothing to check them against. Extensibility and proof of completeness appeared to be mutually exclusive.

## Decision

The locale set is a runtime registry, and completeness is proved from the repository rather than from the plugin.

**`LocaleRuntime.registerLocale(definition)`** adds a language to the selectable set and returns its disposer. `LocaleDefinition` carries the id, the self-described label, and the `documentLanguage` BCP 47 tag that used to live in a separate central record — one home per language, so a plugin supplies its own tag.

**The stored preference is kept as written.** `LocaleRuntime` holds the id the reader asked for, which may name a language no plugin has registered yet, and resolves it against the registry on every change: stored preference, then the browser's own language, then `FALLBACK_LOCALE`. Plugin activation order is not the settings read order, so collapsing an unrecognized id to a shipped locale on arrival would silently discard a live preference. A reader who picked `pt-BR` lands on it the moment the plugin loads, and falls back to English — preference intact — if it is removed.

**Browser detection matches full tags as well as primary subtags.** `pt-BR` is reachable by a browser that asks for it exactly; `zh-Hans-CN` still lands on `zh`.

**The durable schema takes a plain string.** The Host writes `locale.preference` without knowing which plugins the browser composition loaded, so the union of shipped ids can no longer be the validator. What remains is the browser's: `setLocale` only ever writes an id the registry holds, and an id nothing registers stands aside.

**The Language row follows `subscribe`, not `locale/change`.** Registrations deliberately stay off that event; without this the picker would not show a language a plugin had just added.

**`plugins/dsh-i18n`** is the first consumer: a casca that registers `pt-BR` and `es` and supplies 709 keys across 29 namespaces for each. One effect per language registers the locale and its dictionaries together and drops them together — a language left selectable with no copy would render English through the fallback chain while the picker claimed otherwise.

**`scripts/verify-plugin-locales.client.spec.ts`** is the completeness gate. It lives in the repository, where `LocaleNamespaceMap` is visible, and assigns each bundle to `{ [N in keyof LocaleNamespaceMap]: LocaleDictOf<N> }` in both directions: the forward assignment fails on a missing namespace or key, and the reverse one fails on a key the shipped copy no longer has (the bundles are spread-merged constants, so TypeScript's excess-property check does not run on them). A misspelled key trips both. **The gate's import list is the translated surface** — a namespace reaches the map only through a module imported there, which is what keeps another plugin's copy that plugin's responsibility.

`permission.access` was registered through the untyped `register(ns, locale, dict)` overload and was therefore absent from the map. It is now declared alongside `settings.permission`, its registration uses the typed form, and `optionsOf` takes `TranslateNS<typeof ACCESS_NS>` instead of `(key: string) => string`.

**The sidebar rail is relabelled, not translated.** No label there resolves through the locale registry: `dsh-better-sidebar` keeps its own zh/en dictionaries and chooses between them with a `startsWith('zh')` test, so every other language lands on English, and the tabs other plugins register carry the same treatment or a literal string. Fourteen tabs are covered — its six built-ins plus seven plugins' — and their ids are pinned by a test, because nothing at build time notices a rename. The sidebar calls a tab's title at render time, so `dsh-i18n` replaces those descriptors' titles with a function reading the active locale on every paint, and restores the original on unload. The table lives in `src/tab-titles.ts`, deliberately outside `src/locales/`: a namespace no shipped package declares would fail the gate's reverse assertion. The cost is that these labels are the one part of this work nothing verifies — a locale absent from the table falls back to the plugin's own title, so a stale entry degrades to the original rather than breaking.

## Why the gate names modules, not packages

The gate imports each declaring module by source path. The package-name form resolves through `exports` to the emitted declaration file, and several of these packages use their dictionary types only internally — the declaration elides the import, the `declare module` block never arrives, and the gate would pass with that namespace simply absent. That failure is silent, which is the worst property a completeness gate can have.

This program reaches those modules through the referenced projects, so it reads their **emitted** declarations: a namespace or key added to a package counts only after that package's types are rebuilt. That is the repo's ordinary artifact-plane dependency, not a workaround.

## Alternatives considered

**Add `pt-BR` and `es` in-tree beside `zh`/`en`.** `Record<LocaleId, LocaleDictOf<N>>` would then require all four at every shipped registration site, and `tsc` alone would prove completeness with no new gate. Rejected because it makes a language a core concern: every translation becomes a change to 29 packages, no one can ship one independently, and the set stays closed for the next language. The plugin route trades one gate for that independence.

**Let a plugin widen `LocaleId` by declaration merging.** This would keep the typed overload honest for plugin locales too. Rejected because the augmentation cannot reach a plugin in the first place — the same reason the map does not — and because widening `LocaleId` would break the 29 shipped call sites the moment a plugin loaded, making one plugin's presence a compile error in packages that know nothing about it.

**Have the plugin depend on `@deepseek-ai/dsh-client-ui-slots` for the types.** It would get both the checkbox and `tsc`. Rejected because it contradicts the casca convention recorded in every plugin's `context-types.ts` — a plugin mirrors the service faces it touches structurally, so drift stays contained — and would tie the plugin to a monorepo version, which is exactly what makes it no longer installable from outside.

**A runtime gate that walks the shipped `en` dictionaries and diffs key sets.** Rejected because the namespace each dictionary belongs to is not recoverable from the dictionary module: the mapping lives in the registration call, and a gate that re-encoded it would become a second home for that fact, free to disagree with the code it checks.

**Keep the durable schema's union and validate plugin ids elsewhere.** Rejected because there is nowhere else: the Host owns the settings document and cannot know the browser's plugin composition. Any list it validated against would be a guess.

## Consequences

A language ships, installs, and is removed on its own, and the panel's copy stays proved complete against the packages that own it. The cost is that the proof moved from the compiler's ordinary reach into a file that has to be kept honest: **if a package's namespace is not imported by the gate, that namespace is unverified and silently untranslated.** The import list is the thing to review when a client package gains user-visible copy.

The durable preference field lost its enum. A settings document can now name a locale nothing will ever register; the runtime stands aside from it, so the failure is a reader seeing English rather than a broken boot, but the value is no longer self-validating.

`LocaleSnapshot.active` and `LocaleDefinition.id` widened from `LocaleId` to `string`. `LocaleId` remains the shipped set and still types the `register` overload every in-tree dictionary owner uses, so bilingual balance stays enforced where it was.

`dsh-better-sidebar` and `dsh-sidebar-qa` register their own namespaces and are deliberately outside the gate's import list — 403 further keys that stay in the languages those plugins ship.

The tab-title overrides reach into another plugin's registry, which is a coupling this work would not otherwise have: it depends on `dsh-better-sidebar` exposing `getTab`/`subscribe` and on it resolving titles lazily. Both are load-bearing and neither is a contract that plugin promises, so an upstream change there silently returns those two labels to Chinese.
