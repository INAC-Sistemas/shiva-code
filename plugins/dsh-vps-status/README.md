# dsh-vps-status

A model-facing `vps_status` tool that reads disk and memory usage from one configured HTTP endpoint.

**Host-only.** The package declares no `dsh.client`, so the web shell serves no bundle for it and nothing of this plugin reaches a browser. The model sees the tool name, its description and its result — never the endpoint's implementation.

## What the model gets

```
vps_status()  →  disk 50% (25.0 GiB of 50.0 GiB) · memory 37.5% (3.0 GiB of 8.0 GiB)
```

No parameters. The canonical value carries the raw counts too, so the model can reason about absolute free space:

```json
{
  "disk":   { "totalBytes": 53687091200, "usedBytes": 26843545600, "usedPct": 50 },
  "memory": { "totalBytes": 8589934592,  "usedBytes": 3221225472,  "usedPct": 37.5 }
}
```

## The endpoint contract

The configured URL is requested with `GET` and `accept: application/json`. It must answer `200` with:

```json
{
  "disk":   { "totalBytes": <number>, "usedBytes": <number> },
  "memory": { "totalBytes": <number>, "usedBytes": <number> }
}
```

Both counts are finite and non-negative; `totalBytes` must be positive. **Percentages are derived by the plugin**, not reported — the endpoint reports what it measured and the plugin owns every number computed from it, so the two sides cannot disagree.

The answer is a network boundary, so it is validated rather than trusted: a missing field, a wrong type, or a zero total is rejected with the offending field path.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `endpoint` | *(required)* | Full URL of the status resource, **not a base** — it is requested verbatim, so a path is preserved. |
| `toolName` | `vps_status` | Tool name registered on `ctx.tools`; rename it when several hosts are mounted. |
| `description` | *(see source)* | Text the model reads to decide when to call the tool. |
| `timeoutMs` | `5000` | Request deadline in milliseconds. |

`endpoint` has no default on purpose: a status tool pointed at the wrong host is worse than one that refuses to load. An entry without it fails at composition.

Misconfiguration fails at load, not on the model's first call — a non-absolute URL, a non-http(s) scheme, and a non-positive `timeoutMs` all reject during `apply`.

### One host per entry

```yaml
- insert:
    - id: vps-status-app
      name: 'dsh-vps-status'
      config:
        endpoint: https://app.example.com/status
        toolName: app_server_status
    - id: vps-status-db
      name: 'dsh-vps-status'
      config:
        endpoint: https://db.example.com/status
        toolName: db_server_status
```

Two entries cannot share a `toolName`; the tool registry rejects a duplicate name.

## Failure behaviour

Every failure message is written for its actual reader — the model — and terminal failures say not to retry. Without that, a bare status code invites a retry loop.

| situation | what the model is told |
|---|---|
| host unreachable, DNS failure, deadline hit | *Could not reach the status endpoint (…). Tell the user the server is unreachable and do not retry.* |
| non-2xx answer | *The status endpoint answered `<status>`. Tell the user and do not retry.* |
| body is not JSON | *The status endpoint did not answer JSON. …* |
| body breaks the contract | *… invalid `disk.totalBytes`: expected a number, got string. …* |

Caller cancellation (the user pressing stop) propagates unchanged instead of being rewritten as an endpoint failure. The request carries both the caller's signal and the plugin's own deadline, so neither a stopped turn nor a hung endpoint leaks a live request.

## Install

```sh
pnpm --filter dsh-vps-status build
dsh plugin --profile web add link:/absolute/path/to/plugins/dsh-vps-status
```

Then point `config.endpoint` at the real host in the profile's `cordis.patch.yml`. Rebuild after any source change.

To remove: `dsh plugin --profile web remove dsh-vps-status`.

## Development

```sh
pnpm --filter dsh-vps-status typecheck
pnpm --filter dsh-vps-status test     # contract validation, byte formatting, rendering
pnpm --filter dsh-vps-status watch
```

## Extending

The endpoint's own implementation is out of scope for this package — it owns the HTTP call, the contract and the rendering, nothing else.

Two extension points for later:

- **Usage policy** — `ctx.systemPrompt.section({ name, order, text })` teaches the model *when* to reach for the tool, beyond what `description` says. `packages/web/tool-web` is the in-repo example.
- **More resources** — add a field to the contract in [src/status.ts](src/status.ts) and to `output.schema` in [src/index.ts](src/index.ts). Both live in one place each.

MIT.
