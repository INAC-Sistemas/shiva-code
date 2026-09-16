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
