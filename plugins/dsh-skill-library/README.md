# dsh-skill-library

Contributes the plugin manager's shared skill library to `ctx.skills`, read as the signed-in user.

It adds a fourth provider next to the local filesystem one, the packaged badge and the runtime registry. The skill registry and the `skill` tool are untouched and cannot tell the difference — a library skill appears in the catalog and loads exactly like a local one.

Host-only: the package declares no `dsh.client`, so nothing of it reaches a browser.

## The access rule

A skill body is served only to a request carrying a valid Bearer token, and that check lives on the server. This plugin holds no credential of its own — it reads the session `dsh-login` records, **per call, never cached**, which is what makes signing in, signing out and re-logging reach the next call without a restart.

**`dsh-login` must be mounted in the same profile.** Without it there is no session to read and the library contributes nothing.

The gate is `get()`, not the catalog. The registry caches candidates but [never caches a definition](../../docs/subsystems/skills.md), so every body load is a fresh request with a freshly resolved credential: a candidate discovered while signed in cannot produce instructions after a sign-out. The plugin never writes a body to disk and never keeps one on the provider instance — it exists for the length of the call, then reaches the session where every skill body already does, as the tool result.

Signing in or out invalidates the catalog through `credentials/record-updated`, so the model's list of skills gains or loses the library's entries at the next agent step rather than at the next restart.

## Behavior when the library is not available

| Situation | Catalog | Loading a body |
| --- | --- | --- |
| Nobody signed in, session expired, record unreadable, no credential store | empty, **authoritative** | refuses, with text telling the model to have the user sign in |
| Library unreachable, 5xx, or malformed | empty, **incomplete** — not cached, retried next step | throws, telling the model not to retry |
| Library rejects the session (401/403) | empty, incomplete | throws; **the stored session is left alone** |

The split is whether the fact is decidable without leaving the machine. An authoritative empty catalog is cacheable, which matters: reporting "incomplete" forever would keep `snapshot.complete` false on every read and disable the registry's discovery cache for the other providers too.

A rejected session is reported, not acted on. Retiring the local session here would let a transient upstream fault wipe a good one; the browser's own revalidation owns that.

There is no offline mode. When the library cannot be reached, its skills are simply absent — local skills are unaffected.

## Rank

Candidates land at rank **50**, below the strongest local root (`project-dsh` is 100), so a file dropped into a workspace cannot silently take over a library skill's name. The shipped names are guessable, and a same-named local file would replace audited instructions with arbitrary ones while the catalog still showed the original description.

The cost: those names cannot be shadowed locally at all — forking one means renaming it. Set `rank` above 500 for the opposite policy.

Rank only decides within one registry layer. A provider mounted inside an agent preset's scope wins a duplicate name regardless of rank; that belongs to the registry, not to this plugin.

## Config

| Field | Default | Meaning |
| --- | --- | --- |
| `endpoint` | — | Base URL of the library routes. **Required.** Plain http is refused off loopback |
| `providerName` | `library` | Provider name in the registry; unique per layer |
| `source` | `library` | `source` on every candidate; prompt-visible metadata |
| `rank` | `50` | See above |
| `listTimeoutMs` | `2000` | Catalog deadline. Short: discovery runs on the agent's step boundary |
| `getTimeoutMs` | `10000` | Body deadline. Longer: an explicit request from the model |
| `maxBodyBytes` | `524288` | Largest response accepted |
| `headers` | `{}` | Static headers. `authorization` is rejected — it has one source |

Every field is checked at load, not on the first lookup: a provider that throws during discovery is warned and skipped, so a bad endpoint would surface as skills that quietly never appear.

## Endpoints consumed

| Request | Answer |
| --- | --- |
| `GET <endpoint>/skills` | the published catalog — names, descriptions, invocation controls. No bodies |
| `GET <endpoint>/skills/<name>` | one skill with its `content`, frontmatter already stripped by the server |

Served by [plugin-manager](../../plugin-manager/README.md), where the skills are cadastered. A skill unpublished there answers `404`, exactly like one that does not exist.

## Install

```yaml
# cordis.patch.yml, already shipped with the plugin
- insert:
    - id: skill-library
      name: dsh-skill-library
      config:
        endpoint: !!js "new URL('/api/plugins/skill-library', process.env.VPS_URL).href"
```

`$VPS_URL` carries the origin and the plugin owns the path. `new URL` rather than concatenation: it normalizes a trailing slash and throws at composition when `$VPS_URL` is unset, instead of producing `undefined/api/...`.

## Develop

```sh
npm run typecheck && npm test && npm run build
```

The repository's root `pnpm run test` and `test:coverage` do **not** reach `plugins/` — run these from this directory.

MIT. Part of the in-tree plugin set under `plugins/`.
