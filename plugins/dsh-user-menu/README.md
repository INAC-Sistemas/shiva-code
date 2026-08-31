# dsh-user-menu

The signed-in user's badge in the app's top-right corner: two letters in a circle, and a menu whose one action signs out.

```
┌────────────────────────────────────────────────┐
│  DSH Local Build                    (AD)  ▣ ▣  │
│                              ┌──────────────┐  │
│                              │ admin        │  │
│                              │ Conta        │  │
│                              ├──────────────┤  │
│                              │ Sair         │  │
│                              └──────────────┘  │
└────────────────────────────────────────────────┘
```

**Browser-only.** The host half registers nothing; it exists because a profile mounts plugins by package name and the web shell serves `dsh.client` bundles only for enabled loader entries. The sign-out call goes through dsh-login's own route, which already owns the relationship with the login service.

## What it reads

Everything comes from `ctx.loginSession`, the session service [dsh-login](../dsh-login/README.md) publishes. This plugin holds no state and stores nothing.

| Source | Used for |
| --- | --- |
| `getSnapshot().user.name` | the badge letters and the menu heading |
| `getSnapshot().user.email` | the fallback name, cut at the `@` |
| `subscribe()` | re-render on sign-in, sign-out, expiry, and another tab |
| `signOut()` | the menu's one action |

The `user` value is whatever the login service returned minus the token, so it is read field by field rather than cast: a missing, blank, or wrong-typed `name` falls back to the e-mail, and a value carrying neither renders `?`.

**Initials** are the first two characters of the trimmed name, upper-cased — `admin` → `AD`, `Ana Silva` → `AN`. Iterated by code point, so an accented or non-Latin first letter counts as one character instead of half a surrogate pair.

## Where it sits

The frame-wide overlay layer (`shell.overlay`), pinned to the app's **top-right**, left of the shell's layout toggles.

The sidebar foot is where a user badge belongs, and it is not available. Measured in the running app:

| element | x | width | right |
| --- | --- | --- | --- |
| sidebar | 0 | 280 | 280 |
| `.footerActions` (the seat) | 12 | 256 | 268 |
| `dsh-kanban`'s button | 8 | **264**, `flex: 0 0 auto` | 272 |

`sidebar.footer.action` is a flex ROW, and Kanban's button is hardcoded to 264px and refuses to shrink — 8px wider than the row before anything else asks for space. A second occupant starts at x=268 and is clipped by the sidebar's 280px edge whatever width it declares; no CSS on the newcomer can reclaim space from a `flex: 0 0 auto` sibling.

The other seats rule themselves out: `sidebar.settings` is SINGLE and held by the settings shell; `settings.action` renders inside the settings panel, behind a click; and every remaining slot in the app is `scope: 'session'`, so a badge there would vanish on the home screen — wrong for an identity control.

That leaves `shell.overlay`: a list, root-scoped, always mounted, with pointer events granted per entry. It is pinned to the viewport rather than to the sidebar on purpose — the sidebar is `position: static` and publishes no width variable, so nothing anchors to it that survives its collapse. The anchor claims exactly the button's 28px, because the layer spans the whole frame and a larger anchor would swallow clicks meant for the app underneath.

`slots.inject` waits for the seat's declaration and `inject: ['slots', 'loginSession']` waits for dsh-login, so unloading either plugin removes the badge with it. While nobody is signed in the entry renders `null`, and dsh-login's gate (overlay order 10000, far above this entry's 100) covers the frame anyway.

## The components

Built on **[Radix](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)** `DropdownMenu` — the same primitive shadcn/ui and [ReUI](https://reui.io) build their DropdownMenu on. The focus trap, roving keyboard navigation, Escape, outside-click dismissal, and the `aria-*` wiring are the primitive's, not hand-rolled.

The look is this plugin's own CSS module over the app's `--dsw-*` design tokens. ReUI's markup could not be copied verbatim: it is styled with Tailwind utility classes, and this project ships no Tailwind — no `tailwind.config`, no PostCSS pipeline in the plugin bundles — so those classes would resolve to nothing and the menu would render unstyled. Using the tokens instead also means the badge follows the active theme with no work.

`@radix-ui/react-dropdown-menu` costs **≈271 kB raw / 58 kB gzipped** in this plugin's bundle: the primitive brings a positioning engine (floating-ui), a scroll lock, and `aria-hidden` management. React and React-DOM stay external, resolved from the shell's shared module table — the bundle carries no second React.

### The `module` resolve condition is required

[tsdown.config.ts](tsdown.config.ts) lists `module` before `import` in `conditionNames`, and the client bundle does not load without it.

An explicit condition list replaces the resolver's defaults, and `node` still matched inside packages that branch on it. Radix pulls `use-sidecar`, which imports `tslib`; tslib's `import.node` entry is a wrapper that default-imports its CommonJS build, whose exports self-declare `__esModule`, so the bundler's interop helper never defines `.default` and the wrapper destructures `undefined`. The plugin then dies the moment the shell runs its factory:

```
failed to import loader entry (dsh-user-menu):
Cannot destructure property '__extends' of 'import_tslib.default' as it is undefined.
```

`module` is the bundler condition tslib publishes for exactly this, and it resolves to the ESM build with real named exports. Nothing in `tsc` or the bundler sees the problem — both are perfectly happy — so [tests/bundle.spec.ts](tests/bundle.spec.ts) runs the built artifact through a stand-in module loader to keep it from coming back.

The other plugins here (`dsh-login`, `dsh-clock`, `dsh-sidebar-qa`) carry the same condition list without `module`. None of them pulls tslib today, so none is broken — but any dependency that does would fail the same way.

## Configuration

None. The entry in [cordis.patch.yml](cordis.patch.yml) carries no config: the badge reads the signed-in user from a service, so there is nothing for a deployment to point elsewhere.

## Install

```sh
pnpm --filter dsh-user-menu build
dsh plugin --profile web add link:/absolute/path/to/plugins/dsh-user-menu
```

**dsh-login must be installed in the same profile.** Without it the `loginSession` service never appears, `inject` never resolves, and the client half stays unmounted — no badge, no error.

Rebuild after any source change; the web shell always serves the built `lib/client.js`, even on a source launch.

To remove: `dsh plugin --profile web remove dsh-user-menu`.

## Development

```sh
pnpm --filter dsh-user-menu typecheck
pnpm --filter dsh-user-menu test     # display name and initials
pnpm --filter dsh-user-menu watch
```

`pnpm run dev:web` does **not** watch this plugin — it scans `packages/<group>/<name>` for `dsh.client` declarations, and `plugins/` is outside that. Rebuild manually; the host stat-polls `lib/client.js` and broadcasts the reload itself.

## Known Limitations and Deferred Work

- **The menu copy is hardcoded** (`Sair`, `Conta`) in [UserMenu.tsx](src/client/UserMenu.tsx). dsh-login puts its copy in config and serves it through a descriptor route; a whole route for two strings was not worth it here. Editing the constants and rebuilding is the way to change them, and the sanctioned path if this ever needs several languages is the client runtime's locale service, not more config.
- **No component test.** The suite covers the display-name and initials logic, which is where the untrusted-input decisions live, plus a load of the built bundle. Rendering the badge and driving the dropdown would need a DOM environment and React Testing Library, neither of which this plugin's `node`-environment vitest config carries.
- **The bundle suite reads `lib/`.** [tests/bundle.spec.ts](tests/bundle.spec.ts) skips itself when the artifact is absent, so `pnpm test` on a fresh checkout passes without covering it. Run `pnpm --filter dsh-user-menu build` first for that coverage to mean anything.
- **The badge shows no avatar image**, only letters, so Radix's `Avatar` primitive is not used — with no image to load there is no fallback to coordinate, and a plain element carries the letters.

MIT.
