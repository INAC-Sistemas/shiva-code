# dsh-tool-guard

Tool-seam guard for dsh that enforces the build process's two laws where they
can actually be checked, instead of leaving them as prose an agent may ignore.

## Rules

1. **The principal agent writes only artifacts.** A `write`/`edit` by the
   principal agent (delegation depth 0) is denied unless its `file_path` is
   inside `<workspace>/mds/` or `<workspace>/prototype/`. Product code is a
   subagent's job. Subagents (depth ≥ 1) are exempt — writing code is exactly
   what they are for.
2. **Done is the human's move.** Any `write`/`edit` whose text contains a
   frontmatter `status: done` is denied for every agent. The human sets Done on
   the Kanban board, which writes the file host-side, not through a tool call.

## Mechanics

The guard registers on the `tools` service (`ctx.tools.guard`). Guards run
after every `tools/pre-execute` listener and are monotonic: once a guard
returns a reason the call is denied, and no later listener can re-allow it.
Denials surface to the agent as a tool error carrying the reason.

## Config

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `allowedRoots` | `string[]` | `['mds', 'prototype']` | Folders, relative to the workspace, the principal agent may write inside. |
