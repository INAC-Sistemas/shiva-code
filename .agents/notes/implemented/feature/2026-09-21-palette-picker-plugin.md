# Agent Note: Palette picker plugin for the prototype stage

Status: implemented

## Problem

`/03-prototype` starts by letting the requester choose the product palette. The model did it by hand-writing `prototype/palettes.html` with three or four options, screenshotting it, and asking with `ask_user_question`, where custom colors arrived as free text to be parsed. That cost a page of generated HTML per epic, offered only the model's own options, and gave the requester no way to try their own hex colors on a real preview before answering.

## Decision

A new desktop plugin, `plugins/dsh-palette`, owns the step:

- **The Paletas tab** (`dsh-palette:picker`, client half) shows curated presets (`lib/palettes.js`) filterable by style and by color family, the model's suggestions first, a generator of harmonious palettes, and one hex field and color picker per role (Primária, Secundária, Destaque, Fundo, Texto). The pick is previewed on a mini interface in light and dark with its text/background contrast; clicking a color stripe copies its hex.
- **The `palette_pick` tool** (host half) opens one request with an optional `question` and up to 8 `suggestions`, and waits with no deadline of its own. The client polls `POST /palette/api/pending` every second and opens the tab by itself on a new request. "Usar esta paleta" posts the choice to `choose`; the host validates every color as hex and resolves the call with `{ source, name, colors, roles, next }`.
- **The model context.** The choice is a tool result, so it is logged and model-visible like any other; `next` points the model at `ui-palette` §4. The model then completes every role, measures contrast, records `mds/epics/<epic>/03-palette.md`, and writes `prototype/theme.js`, which sets the Tailwind theme colors. The skills `ui-palette`, `03-prototype`, and `00-start-here` now call `palette_pick` instead of writing `palettes.html`.

The desktop patch mounts it as an always-on row (`palette`, listed in `HOST_ALWAYS`), `desktop/package.json` references its tarball, and the `@deepseek-ai/dsh` dependency patch lists it so the packaged harness resolves it.

## Alternatives considered

**Write the choice straight into the Tailwind theme.** Rejected: `03-palette.md` is the single source of every color, with the full role set in light and dark and a contrast table; five picked colors are not a complete theme, and a theme file written outside that record would drift from it.

**Keep `ask_user_question` and only improve the HTML page.** Rejected: the answer would still be free text to parse, and each epic would still generate a chooser page.

**Send the choice as a chat message from the tab.** Rejected: an unprompted message could arrive mid-turn or with no pipeline step waiting for it; a tool call ties the answer to the step that asked.

## Consequences

- The palette step opens its own tab and blocks the turn until the requester answers or cancels.
- Presets are data in the plugin; adding one is a row in `lib/palettes.js`.
- The palette colors reach the model as five roles at most; the model still derives the rest, as for custom colors before.
