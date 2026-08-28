# dsh-clock

A live 24-hour `HH:MM:SS` wall clock in the DSH web session header, immediately left of the **Session log** capsule.

```
┌──────────────────────────────────────────────────────┐
│ my-project / current session                         │
│                            14:32:07  ( Session log ⭳ ) │
└──────────────────────────────────────────────────────┘
                              ▲ dsh-clock
```

## How it attaches

`conversation.session.header.utilities` is the right-aligned list slot of the session header, declared by `@deepseek-ai/dsh-client-ui-conversation`. The clock registers a fresh cell id (`dsh-clock`) at `order: -100`; the shipped Session-log capsule registers without an order and sorts at `0`, so the clock lands to its left. Nothing is replaced — remove the plugin and the header is exactly as before.

The registration goes through `slots.inject`, so it waits for the seat's declaration and disappears with it (the row exists only while a conversation surface is mounted).

The host half registers nothing. It exists because a profile mounts plugins by package name and the web shell serves `dsh.client` bundles only for enabled loader entries.

## Behavior

- Local timezone, fixed `HH:MM:SS` padding — the width never changes, so the capsule beside it never shifts.
- The tick re-arms on each second boundary rather than running a fixed 1000 ms interval, so the reading does not drift behind the wall clock.
- Hovering shows the full local date and time.
- Restyle it from a profile's custom CSS through the `[data-dsh-clock]` attribute.

## Install

```sh
pnpm --filter dsh-clock build
dsh plugin --profile web add link:/absolute/path/to/plugins/dsh-clock
```

`dsh plugin add` appends `dsh-clock` to the profile's `dsh.profile.bundles`; boot then merges [cordis.patch.yml](cordis.patch.yml), which inserts the `clock` entry. Rebuild (`pnpm --filter dsh-clock build`) after any source change — the web shell always serves the built `lib/client.js`, even on a source launch.

To remove: `dsh plugin --profile web remove dsh-clock`.

## Development

```sh
pnpm --filter dsh-clock typecheck
pnpm --filter dsh-clock test        # formatter and tick scheduling
pnpm --filter dsh-clock watch       # rebuild the bundles on change
```

MIT.
