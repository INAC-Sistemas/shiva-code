# Agent Note: Central auto-open rules for sidebar tabs

Status: implemented

## Problem

Nothing opened a sidebar tab because an agent created a file. The MDS tab loaded its tree only on mount, so pipeline artifacts written under `mds/` stayed invisible until the person opened the tab and refreshed; the Prototype tab opened only when the model called `prototype_automation`, never when it created a page under `prototype/`. Each plugin that wanted this would have built its own host observer and polling channel, as `dsh-prototype` and `dsh-sidebar` already had for their commands, with no single place to see or change which file opens which tab.

## Decision

`dsh-sidebar` owns auto-open. Its config field `autoOpen` lists rules `{ tab, path, reveal? }`, where `path` is a workspace-relative glob (`**` spans folders, `*` stays in one segment) and `tab` a sidebar tab type; malformed rules fail at load. One host observer (`lib/auto-open.js`, wired in `lib/index.js`) listens to `tools/pre-execute`, noting a `write` whose target does not exist yet and matches a rule, and to `tools/post-execute`, turning a successful one into one sequenced event per matching rule; both listeners delegate first, so denied or blocked writes produce nothing, and overwrites and edits never match. `POST /sidebar-agent/api/auto_open {after}` serves the last 20 events. The client polls every second, treats its first answer as the baseline so a page load never replays old creations, and calls better-sidebar's `openTab` with `expand: true`; for a `reveal` rule it sets `tab.meta.reveal = { path, seq }`, through `updateTab` when the tab is already open. A tab that wants the file reads its own `props.tab.meta.reveal`: the MDS tab refreshes, unfolds the folders, and opens the file unless its editor holds unsaved edits.

**A collapsed sidebar opens.** better-sidebar expands its panel only for content opens (a `path` or `url` seed); a type-only open, which every plugin tab uses, left a collapsed sidebar closed and the event invisible. The desktop's `patches/dsh-better-sidebar+0.15.5.patch` adds an `expand` field to the open seed that applies the same expansion (right panel, the bottom panel when the active pane lives there, or the drawer on narrow viewports) and is not stored on the tab; the repository source of `dsh-better-sidebar` carries the same change. The auto-open rules, the `sidebar` tool's `open`, the Paletas tab and `prototype_automation`'s view all pass `expand: true`.

The desktop patch configures `mds/**` → `dsh-mds:artifacts` with `reveal`, and `prototype/**` → `dsh-prototype:view`.

## Alternatives considered

**Put the rules in `dsh-better-sidebar`, which owns the tabs.** Rejected for now: the desktop runs `dsh-better-sidebar` 0.15.5 from a packaged tarball while this repository holds the 0.15.4 source, so rebuilding it would drop shipped changes. Everything here uses its public client API (`openTab`, `updateTab`, `getSnapshot`) and can move into it once the source is current.

**A per-plugin observer, as first built for `dsh-mds`.** Rejected: every tab would duplicate the host listener and the polling channel, and no single place would list which file opens which tab.

**Open on every write, including edits.** Rejected: pipeline stages edit ticket frontmatter constantly, and focusing a tab on each edit would steal the view.

**A global browser event for the reveal.** Rejected: the tab's own `meta` reaches the view through better-sidebar whether or not it is mounted, without a cross-plugin global.

## Consequences

- Creating a watched file moves the sidebar to the rule's tab even when another tab was active.
- Adding an auto-open is a config row, not code; a rule for a tab whose plugin is not loaded opens nothing.
- There is no per-rule switch in the settings UI yet; a deployment disables a rule by removing it from the patch.
- The client makes one small same-origin request per second while the app is open.
