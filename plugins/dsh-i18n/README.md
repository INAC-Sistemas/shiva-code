# dsh-i18n

English | [中文](README.zh.md)

Brazilian Portuguese and Spanish for the DSH web panel. Enabling the plugin adds two entries to the **Language** row in Settings, beside the shipped 中文 and English.

```
Settings › General › Language
  ┌──────────────────────┐
  │ 中文                  │
  │ English              │
  │ Português (Brasil) ← │  dsh-i18n
  │ Español            ← │  dsh-i18n
  └──────────────────────┘
```

## How it attaches

The shipped locale service (`@deepseek-ai/dsh-client-locale`) owns the preference, the picker, and the ns×locale dictionary registry. This plugin only contributes to it: `registerLocale` adds the language to the selectable set, and one `register(namespace, locale, dictionary)` call per namespace supplies its copy. Nothing shipped is replaced — remove the plugin and the panel is exactly as before, minus the two entries.

Each language is a single effect that registers the locale and its dictionaries together, and drops them together. A language left selectable without its copy would render the shipped English through the fallback chain while the picker claimed otherwise.

The host half registers nothing. It exists because a profile mounts plugins by package name and the web shell serves `dsh.client` bundles only for enabled loader entries.

## What switching does, and does not do

Enabling the plugin **changes nobody's active language**. The service re-resolves the active locale against what is registered, in this order: the stored preference, then the browser's own language, then English. So:

- a reader who already picked `pt-BR` on another machine lands on it the moment the plugin loads — the preference outlives the gap when the language was not installed;
- a browser asking for `pt-BR` or `es` with no explicit preference follows it;
- everyone else stays where they were.

Disabling the plugin removes the languages, and anyone reading one falls back to English with their stored preference intact, ready for the next time it is installed.

`pt-BR` keeps its region because the copy is Brazilian; a browser asking for European Portuguese is better served by the shipped English than by text in the wrong dialect. Spanish ships region-free — the copy avoids the vocabulary that splits the regional variants.

## Scope

The panel the DSH client itself ships: the conversation, the workspace navigator, Settings, and the surfaces that follow agent activity — 29 namespaces.

Other plugins own their own copy. `dsh-better-sidebar` and `dsh-sidebar-qa` register their own namespaces and are **not** translated here; a plugin's text is the plugin's responsibility, and translating it from outside would break the moment it shipped a new string.

## Completeness

`scripts/verify-plugin-locales.client.spec.ts`, in the DSH repository, asserts both bundles against `LocaleNamespaceMap` — the type the shipped packages merge their namespaces into. A missing namespace, a missing key, and a key the shipped copy no longer has are all compile errors naming what is wrong.

The check lives there rather than here because a plugin resolves outside the monorepo's cordis instance: those `declare module` augmentations cannot reach it, so its own `tsc` has nothing to compare against. The import list at the top of that file is what defines the translated surface.

When a shipped package adds a string, that gate fails until both languages carry it.

## The sidebar rail

Every label in the rail resolves outside the locale registry this package feeds. `dsh-better-sidebar` keeps its own zh/en dictionaries and picks between them with a `startsWith('zh')` test, so any other language lands on English; the tabs other plugins register carry the same two-language treatment or a plain literal. No dictionary can reach any of them — there is no key to override.

The sidebar resolves a tab's title by **calling it at render time**, which leaves one honest seam. This plugin replaces those descriptors' titles with a function that reads the active locale on every paint, so a switch reaches them with no re-registration, and restores the original on unload. A locale absent from [src/tab-titles.ts](src/tab-titles.ts) falls back to what the tab shipped, which is why a Chinese reader keeps the original wording.

The table covers the fourteen tabs the rail registers: `dsh-better-sidebar`'s six built-ins (which go through the same registry as everyone else) plus the tabs from `dsh-openviking`, `dsh-prototype`, `dsh-mds`, `dsh-ssh-tunnel`, `dsh-sidebar-qa`, `dsh-docs-panel` and `dsh-flowglass`. A test pins those ids: nothing at build time notices a plugin renaming its tab, so the pin is what turns a silent regression into a failing test.

This is an override of other packages' copy and **the completeness gate does not cover it**: it asserts the dictionaries against the namespaces the shipped panel registers, and these labels belong to no namespace. The fallback is what keeps a stale entry from breaking a label — it shows the tab's own title instead.

Only tab labels are reached. The panels those tabs open are rendered by their own plugins, outside anything this package can address: `dsh-flowglass` in particular is Chinese throughout its interior.

Brand names stay untranslated in every language — `dsh-flowglass` publishes no Latin-script name, so its package name stands in rather than an invented translation of 流镜.

## Install

```sh
pnpm --filter dsh-i18n build
dsh plugin --profile web add link:/absolute/path/to/plugins/dsh-i18n
```

`dsh plugin add` appends `dsh-i18n` to the profile's `dsh.profile.bundles`; boot then merges [cordis.patch.yml](cordis.patch.yml), which inserts the `i18n` entry. Rebuild (`pnpm --filter dsh-i18n build`) after any source change — the web shell always serves the built `lib/client.js`, even on a source launch.

To remove: `dsh plugin --profile web remove dsh-i18n`.

## Development

```sh
pnpm --filter dsh-i18n typecheck
pnpm --filter dsh-i18n test         # registration and disposal
pnpm --filter dsh-i18n watch        # rebuild the bundles on change
```

The dictionaries live in [src/locales/](src/locales/), split by surface — `core`, `settings`, `agent`, `workspace`, `conversation` — one set per language. The split is presentation only; the service sees one flat namespace map per language.

MIT.
