# dsh-tool-guard

Tool-seam guard for dsh that enforces the build process's two laws where they
can actually be checked, instead of leaving them as prose an agent may ignore.

## Rules

1. **Each role writes only its own surface.** A `write`/`edit` is denied
   unless its `file_path` is inside the caller's surface:
   - **Principal agent** (delegation depth 0): `mds/`, `prototype/`, the
     fast-fix window `src/` and `public/`, `.scripts/`, and root files — the
     manifests and deploy configs (`package.json`, lockfiles, `tsconfig*.json`,
     `railway.*`, ignore files), the project scaffold (`index.html`,
     `vite.config.*`, `next.config.*`, `tailwind.config.*`,
     `postcss.config.*`, `eslint.config.*`, `components.json`) and the test
     runner configs (`vitest.config.*`, `playwright.config.*`).
   - **builder**: `src/`, `public/` and the project scaffold files at the root.
   - **qa**: `testes/` and the test-runner configs at the root.
   Root files match only directly at the workspace root, never nested. Without
   the scaffold files no agent could create a Vite app's `index.html` or
   `vite.config.*`.
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
