# dsh-profiles

The profile picker. A **profile** is the slice an agent runs under: which library skills reach the model, and which plugins load.

The plugin manager owns the roster. This plugin **materializes** the selection for this machine — it does not author profiles, and it holds no credential of its own.

```
browser ──GET /profiles/api/state───▶ dsh-profiles (host) ──▶ GET  /api/profiles
        ◀── roster + local selection      │             ◀── profiles, activeId

browser ──POST /profiles/api/select─▶ dsh-profiles (host) ──▶ POST /api/profiles/active
        ◀── { active, restartRequired }   │             ◀── the profile's spec
                                          ▼
                              $DSH_HOME/profile/active.json
```

**`dsh-login` must be mounted in the same profile.** Every call resolves the session that plugin records, per request and never cached — the same contract `dsh-skill-library` and `dsh-vps-status` follow. Without it there is no roster, and the picker stays behind the login gate.

## The active profile lives on the server

`User.activeProfileId` on the plugin manager, not a claim in the token. Switching is a column write: no token is minted or revoked, and the next request from any device resolves the new profile.

Two consequences, both deliberate:

- The active profile is per **user**, not per device. Two machines signed into the same account share the choice.
- A token that was copied out of the dashboard keeps working across a switch, and starts answering for the new profile.

When the server names a profile this machine has not materialized — a new machine, or a switch made elsewhere — the picker selects it **silently** rather than asking. The person already chose; asking again would be a question with one right answer.

## What selecting one costs

| Plane | Where the row lives | Cost of a change |
| --- | --- | --- |
| `agent` | `apps/cli/config/agent-presets/profile/agent.cordis.yml` | none — the next session mounts the preset |
| `host` | `desktop/build/dsh-desktop.patch.yml` | an app restart |

A host-plane plugin serves HTTP routes and publishes services, so the only way to turn one off is to **not load it**, and that is decided at boot. `hostPlaneDiffers()` compares the two selections and the picker asks for a restart only when a host row actually changed.

The list reaches the composition as `$DSH_PROFILE_PLUGINS`, written into the harness environment by the desktop shell, which reads `active.json` at spawn. Unset means everything enabled — a first boot before any login, a dev run, and the CLI all have to work.

## The server sends names, never composition

`GET /api/plugins/profile` answers identifiers: plugin names and skill names. `cordis.yml` evaluates `!!js` under `config` and `disabled`, so a server that could supply composition text would be supplying code to run on the user's machine. `PLUGIN_ROWS` in [src/wire.ts](src/wire.ts) is what resolves a name into a row, and it lives here, in this build's own source. A name it does not know is dropped.

## What this is not

Which plugins load is a **composition** boundary, not a security one. The client runs on the user's machine and they can edit their own composition. The enforced half is the server's: a skill outside the active profile is never served to that user's token.

`window.__profileTabEnabled` is gone, and nothing replaces it. The old build published that helper and let seven plugins gate their own sidebar tabs on it — which hid tabs while their plugins stayed loaded, tools registered and routes serving, and which raced its own bootstrap fetch and failed open. A profile now decides what loads, so a plugin outside it has no tab to hide.

## Routes

Both are same-origin fenced (reusing `dsh-login`'s `isSameOriginRequest`) and both require the stored grant.

| Route | Answer |
| --- | --- |
| `GET /profiles/api/state` | `{ signedIn: false }`, or the roster plus `serverActiveId` and this machine's `active` |
| `POST /profiles/api/select` | `{ ok, active, restartRequired }`, or `{ ok: false, message }` |

`signedIn: false` covers not signed in, an expired session, and an unreachable plugin manager. All three leave the picker waiting rather than showing an empty roster that would read as "you have no profiles".

## Config

| Field | Meaning |
| --- | --- |
| `profilesEndpoint` | Full URL listing the user's profiles. **Required.** Plain http is refused off loopback |
| `activeEndpoint` | Full URL that makes one profile active. **Required.** |
| `specEndpoint` | Full URL answering the active profile's spec. **Required** — validated at load even though only the client reads it |
| `timeoutMs` | Deadline per forwarded request, default `5000` |
| `dshHome` | Harness home holding `profile/active.json`; defaults to `$DSH_HOME` |

Every field is checked at load, not on the first request: a bad endpoint would otherwise surface as a picker that lists nothing, which reads as "you have no profiles" — the hardest failure to trace back to a typo.

MIT.
