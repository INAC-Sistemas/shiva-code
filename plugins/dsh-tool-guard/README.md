# dsh-tool-guard

Tool-seam guard for dsh that enforces the build process's two laws where they
can actually be checked, instead of leaving them as prose an agent may ignore.

## Rules

1. **Each role writes only its own surface.** A `write`/`edit` is denied
   unless its `file_path` is inside the caller's surface:
   - **Principal agent** (delegation depth 0): `mds/` and, as a
     fast-fix window, the product surface below.
   - **builder**: the product surface — anywhere inside the workspace except
     `mds/`, `testes/` and `.git/`. The project may use any
     language and framework, so its code and manifests follow that stack's own
     layout.
   - **qa**: `testes/` and the test-runner configs (`vitest.config.*`,
     `playwright.config.*`) directly at the workspace root, never nested.
   - **evaluator**: nothing. It judges the diff against the artifacts, and its
     verdict is the text it returns.
2. **Done follows the requester's approval.** Any `write`/`edit` whose text
   contains a frontmatter `status: done` is denied for every subagent. The
   principal writes it after the requester approves the screen in the chat; the
   requester can also set it on the Kanban board, which writes the file
   host-side, not through a tool call.
3. **A tarefa in `active` only moves to `in_progress`.** Applies to tarefa files
   under `mds/epics/<epic>/tarefas/` and the legacy `06-tickets/`.

## Mechanics

The guard registers on the `tools` service (`ctx.tools.guard`). Guards run
after every `tools/pre-execute` listener and are monotonic: once a guard
returns a reason the call is denied, and no later listener can re-allow it.
Denials surface to the agent as a tool error carrying the reason.

## Config

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `allowedRoots` | `string[]` | `['mds']` | Process folders, relative to the workspace, the principal agent writes beyond the product surface. |
