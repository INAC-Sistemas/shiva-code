# dsh-sidebar

Agent control of the sidebar tabs. The `sidebar` tool lets the agent see and
manage the session's tabs — not just open them.

| `op` | Args | Effect |
| --- | --- | --- |
| `list` | — | Open tabs (`id`, `type`, `title`, `path`, `active`) and every available tab type |
| `focus` | `tab` | Bring a tab to the front by id |
| `close` | `tab` | Close a tab by id |
| `open` | `type`, `url?` | Open a tab by type (optionally at a `url` for the browser tab) |

Ids look like `dsh-railway:tab`, `dsh-prototype:view`, `dsh-browser:view`,
`dsh-mds:artifacts`, `dsh-kanban:board`, `editor`, `terminal`, `git`. Call
`list` first — it returns the real ids and the active one.

The host half relays one command at a time; the client half calls the
better-sidebar service (`getSnapshot`/`getTabs`/`activateTab`/`closeTab`/
`openTab`) and answers with the result.

## Auto-open

The one place that opens a sidebar tab because an agent **created** a file. Rules are config on this plugin's row:

```yaml
- id: sidebar-agent
  name: dsh-sidebar
  config:
    autoOpen:
      - tab: 'dsh-mds:artifacts'   # tab type to open
        path: 'mds/**'             # workspace-relative glob: ** spans folders, * one segment
        reveal: true               # hand the file to the tab
      - tab: 'dsh-prototype:view'
        path: 'prototype/**'
```

The host watches the tool pipeline once for every rule: `tools/pre-execute` notes a `write` whose target does not exist yet and matches a rule, and `tools/post-execute` turns a successful one into an event per matching rule. Overwrites, edits, failed and denied writes produce nothing. Events carry a sequence number and are served by `POST /sidebar-agent/api/auto_open {after}`; the client polls every second, ignores everything before its first answer (a page load never replays old creations), and calls better-sidebar's `openTab`. For a `reveal` rule it also sets `tab.meta.reveal = { path, seq }` (workspace-relative) on the tab, through `updateTab` when the tab is already open. A tab that wants the file reads `props.tab.meta.reveal` and acts on a new `seq` — the MDS tab does. Malformed rules fail at load; a rule naming a tab type no loaded plugin registered opens nothing.
