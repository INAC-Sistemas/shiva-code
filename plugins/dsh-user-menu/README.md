# dsh-user-menu

The signed-in user's badge in the sidebar foot, under Settings: two letters in a circle, and a menu whose one action signs out.

```
┌────────────────┬───────────────────────────────┐
│  ShivaCode     │                               │
│                │                               │
│  …             │                               │
│                │                               │
│  ⚙  Settings   │                               │
│  (AD) admin    │                               │
│  ┌───────────┐ │                               │
│  │ admin     │ │                               │
│  │ Conta     │ │                               │
│  ├───────────┤ │                               │
│  │ Sair      │ │                               │
│  └───────────┘ │                               │
└────────────────┴───────────────────────────────┘
```

**Browser-only.** The host half registers nothing; it exists because a profile mounts plugins by package name and the web shell serves `dsh.client` bundles only for enabled loader entries. The sign-out call goes through dsh-login's own route, which already owns the relationship with the login service.

## What it reads

Everything comes from `ctx.loginSession`, the session service [dsh-login](../dsh-login/README.md) publishes. This plugin holds no state and stores nothing.

| Source                     | Used for                                                |
| -------------------------- | ------------------------------------------------------- |
| `getSnapshot().user.name`  | the badge letters and the menu heading                  |
| `getSnapshot().user.email` | the fallback name, cut at the `@`                       |
| `subscribe()`              | re-render on sign-in, sign-out, expiry, and another tab |
| `signOut()`                | the menu's one action                                   |

The `user` value is whatever the login service returned minus the token, so it is read field by field rather than cast: a missing, blank, or wrong-typed `name` falls back to the e-mail, and a value carrying neither renders `?`.

**Initials** are the first two characters of the trimmed name, upper-cased — `admin` → `AD`, `Ana Silva` → `AN`. Iterated by code point, so an accented or non-Latin first letter counts as one character instead of half a surrogate pair.

## Where it sits

`sidebar.footer.below`, the last row of the sidebar foot, under Settings — the app's **bottom-left**.

That seat is a stacking list, which is what this badge needs and what `sidebar.footer.action` cannot give: `.action` is a single flex ROW shared by every occupant, so an entry declaring a fixed width pushes its neighbours past the sidebar's edge, where they are clipped whatever width they declare. `sidebar.footer.below` is a column, so this row claims the full sidebar width beside its neighbours rather than competing with them.

The other seats rule themselves out: `sidebar.settings` is SINGLE and held by the settings shell; `settings.action` renders inside the settings panel, behind a click; and every remaining slot in the app is `scope: 'session'`, so a badge there would vanish on the home screen — wrong for an identity control.

`slots.inject` waits for the seat's declaration and `inject: ['slots', 'loginSession']` waits for dsh-login, so unloading either plugin removes the badge with it. While nobody is signed in the entry renders `null`, so the badge appears on sign-in and disappears on sign-out; dsh-login's own gate covers the frame until then.

**The seat must exist in the harness the profile runs.** `@deepseek-ai/dsh-client-ui-sidebar` declares and renders `sidebar.footer.below` from the repository source; a harness build predating it declares only `sidebar.footer.action`, and against one of those `slots.inject` never fires and the badge silently never mounts — no error, no badge. The Electron app pins such a build, so `desktop/patches/@deepseek-ai+dsh-client-ui-sidebar+0.1.2-alpha.4.patch` adds the declaration, the foot row, and its column CSS to that snapshot.

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

No repository watcher rebuilds this plugin. Rebuild manually; the host stat-polls `lib/client.js` and broadcasts the reload itself.

## Known Limitations and Deferred Work

- **The menu copy is hardcoded** (`Sair`, `Conta`) in [UserMenu.tsx](src/client/UserMenu.tsx). dsh-login puts its copy in config and serves it through a descriptor route; a whole route for two strings was not worth it here. Editing the constants and rebuilding is the way to change them, and the sanctioned path if this ever needs several languages is the client runtime's locale service, not more config.
- **No component test.** The suite covers the display-name and initials logic, which is where the untrusted-input decisions live, plus a load of the built bundle. Rendering the badge and driving the dropdown would need a DOM environment and React Testing Library, neither of which this plugin's `node`-environment vitest config carries.
- **The bundle suite reads `lib/`.** [tests/bundle.spec.ts](tests/bundle.spec.ts) skips itself when the artifact is absent, so `pnpm test` on a fresh checkout passes without covering it. Run `pnpm --filter dsh-user-menu build` first for that coverage to mean anything.
- **The badge shows no avatar image**, only letters, so Radix's `Avatar` primitive is not used — with no image to load there is no fallback to coordinate, and a plain element carries the letters.

MIT.
