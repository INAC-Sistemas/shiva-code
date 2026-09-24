# dsh-mcp

Registry of MCP servers for dsh. The **MCP** sidebar tab adds, edits, enables, disables, reconnects and deletes MCP servers, or imports them from a `{"mcpServers": {...}}` document (Claude Desktop, Cursor, Claude Code). Changes take effect without restarting the harness: each enabled server is mounted as one [`@deepseek-ai/dsh-mcp-client`](../../packages/mcp/mcp-client/README.md) instance, and its tools reach the model as `mcp__<name>__<tool>`.

## Storage

The list lives in `$DSH_HOME/mcp/servers.json` (`~/.dsh/mcp/servers.json` without `DSH_HOME`; the desktop sets `DSH_HOME` to `<userData>/harness`). The `file` config field overrides the path.

```json
{
  "version": 1,
  "servers": [
    { "name": "files", "enabled": true, "toolCallTimeoutMs": 60000, "transport": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], "env": {}, "cwd": "" },
    { "name": "remote", "enabled": true, "toolCallTimeoutMs": 60000, "transport": "streamable-http", "url": "https://example.com/mcp", "headers": { "Authorization": "Bearer …" } }
  ]
}
```

- Writes are atomic (temp file + rename) with mode `0600` in a `0700` directory. Env and header values are stored in plain text, at the same trust level as `$DSH_HOME/.credentials.yaml`.
- A file with another `version`, invalid JSON, an invalid entry or a duplicate name is reported in the tab and blocks every write until it is fixed or deleted; the plugin never overwrites it.
- Every write re-reads the file first, so a manual edit is kept and applied on the next save. Without a save, manual edits apply on the next harness start.
- `name` follows the mcp-client `serverName` rule (`[A-Za-z0-9_-]{1,32}`); `openviking` is reserved for dsh-openviking. SSE-only servers are not supported.

## Host API

`POST /mcp/api/<method>`, same-origin only, JSON body. Every success answers the `list` payload: `{ ok, file, loadError, servers[] }`, where each server carries `state` (`connecting`, `connected`, `error`, `disabled`, `stopped`), `error` and `toolCount`, and its env and header values are replaced by `••••••••`.

| Method | Body | Effect |
|---|---|---|
| `list` | — | Current list and live state. |
| `save` | `{ original?, server }` | Creates, or edits `original` (renaming allowed). A value equal to the mask keeps the stored one. |
| `delete` | `{ name }` | Removes the server and its tools. |
| `toggle` | `{ name, enabled }` | Mounts or unmounts without deleting. |
| `reconnect` | `{ name }` | Disposes and mounts again. |
| `import` | `{ text }` | Adds every entry of a `mcpServers` document; a name clash rejects the whole import. |

## Lifecycle

- A server's first connection must succeed, otherwise its state is `error` with the cause; any later save or `reconnect` retries it. After a successful start, dsh-mcp-client's own reconnect policy covers lost connections.
- Editing a server disposes its mount (unregistering its tools and releasing the name) before mounting the new config.
- All mounts are forks of the plugin context and are disposed with it.

## Trust

A stdio server runs a local command outside the dsh sandbox, and every mounted server's tools are registered in the global tool layer, visible to every agent, preset and subagent. Register only servers you trust.

## Tests

```sh
pnpm --filter dsh-mcp test
```

The suite mounts the mcp-client fixture server (`packages/mcp/mcp-client/tests/fixture-server.ts`) through the real plugin and tool registry.
