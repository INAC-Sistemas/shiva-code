# Agent Note: User MCP server registry (dsh-mcp)

Status: implemented

## Problem

An MCP server reached the model only as a `@deepseek-ai/dsh-mcp-client` row in `cordis.yml`, one row per server. The desktop user had no way to register a server: no list of their own, no UI, and no path that took effect without editing composition files. [Even out shipped tool rosters](2026-07-31-even-out-shipped-tool-rosters.md) already named the missing layer: a bridge that reads a user's server list and mounts one client per entry.

## Decision

**A desktop plugin, `plugins/dsh-mcp`, owns the list and the mounts.** Its sidebar tab ("MCP") adds, edits, enables, disables, reconnects, deletes and imports servers through `POST /mcp/api/<method>`; the host half is plain JS in the shape of `dsh-paramiko`.

**The list is a local file, scoped to the machine.** `$DSH_HOME/mcp/servers.json` holds `{ version: 1, servers[] }`, written atomically (temp file + rename) with mode `0600` in a `0700` directory. Every write re-reads the file, validates each entry against `mcpClient.Config` plus its own name, URL and key rules, and refuses duplicates and the reserved `openviking` name. A file with another version or any invalid content blocks writes and is shown in the tab; it is never overwritten.

**Secrets stay in the same file, masked at the API.** Env and header values are plain text on disk and replaced by a fixed mask in every response; a saved value equal to the mask keeps the stored one. The browser never receives a stored value.

**Mounts are forks reconciled live.** Each enabled server is `ctx.plugin(mcpClient, config)` with `failOnStartupError: true`, so a failed first connection rejects the fork and the tab shows the cause. A serial reconciliation disposes a removed, disabled, changed or failed mount before mounting its replacement, which releases the `serverName` reservation and unregisters its tools. `reconnect` forces a remount. Plugin teardown disposes every fork with the plugin context. Changes to the tool set reach the session log through the existing `request/header` event, so no new session event exists.

**Always loaded on the desktop.** The `mcp` row carries no profile gate and is listed in `HOST_ALWAYS` in `scripts/verify-cordis-config.ts`. The same change moved `kanban`, `browser-agent` and `sidebar-agent` there too: `PLUGIN_ROWS` in dsh-profiles does not list them, so a profile gate made them unloadable under any active profile.

**The harness must be able to resolve the plugin.** The harness imports desktop plugins through the profile module fallback, built from the dependency closure of `@deepseek-ai/dsh`. `desktop/patches/@deepseek-ai+dsh+0.1.2-alpha.4.patch` therefore lists `dsh-mcp`, and now also `dsh-kanban`, `dsh-tool-guard`, `dsh-browser` and `dsh-sidebar`, which until then resolved through stale links to another checkout. The harness packages it needs (`dsh-mcp-client`, `schemastery`) are peer dependencies, because the packed tarball cannot carry `workspace:` specifiers into `npm install`.

## Alternatives considered

**Rows in `$DSH_HOME/cordis.patch.yml`, hot-reloaded by `watchUserPatches`.** Rejected: the plugin would write composition text that the loader evaluates, including `!!js`, and a malformed write would break the whole plugin tree instead of one server. A JSON list validated at the boundary keeps each failure local to its entry.

**`ctx.loader.create` / `remove` per server.** Rejected for now: loader rows join the global plugin tree and its diagnostics, while forks of the plugin context give the same lifecycle with teardown owned by one plugin. Nothing needs the servers to appear as loader entries.

**Settings capability (`settings.yaml`) with secrets in `.credentials.yaml`.** Rejected by product decision: one local file with masked secrets matches `dsh-paramiko` and keeps the plugin free of the settings and credentials seams. The file sits at the same trust level as `.credentials.yaml`.

**`failOnStartupError: false`.** Rejected: the fork would resolve even when the server never connected, leaving the tab unable to tell a working server from one retrying in the background. A failed start is instead reported and retried on the next save or `reconnect`.

**Per-profile or per-workspace servers.** Rejected by product decision: the registry is per machine. A profile gate would also require the dsh-profiles catalog and the plugin-manager VPS to learn the plugin.

## Consequences

- Registering, editing or disabling a server changes the tools of new model requests without a harness restart.
- Every mounted server registers in the global tool layer, so its tools reach every agent, preset and subagent, and stdio servers run outside the sandbox. The tab states both.
- A server that is unavailable when the harness starts stays in `error` until the next save or `reconnect`; dsh-mcp-client's reconnect policy covers only connections that once succeeded.
- Manual edits to `servers.json` apply on the next write through the API or the next harness start.
- The suite in `plugins/dsh-mcp/tests` runs through its own `vitest.config.ts` (`pnpm --filter dsh-mcp test`), because the root include does not reach `plugins/*`; CI does not run it yet.
