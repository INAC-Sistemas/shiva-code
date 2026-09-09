# dsh-profiles

The profile picker. A **profile** is the slice an agent runs under: which library skills reach the model, and which plugins load.

The plugin manager owns the roster and every rule about it. This plugin **materializes** the selection for this machine and **forwards** authoring — it holds no credential of its own, and it does not decide what a valid profile is.

```
browser ──GET /profiles/api/state───▶ dsh-profiles (host) ──▶ GET  /api/profiles
        ◀── roster + local selection      │             ◀── profiles, activeId

browser ──POST /profiles/api/select─▶ dsh-profiles (host) ──▶ POST /api/profiles/active
        ◀── { active, restartRequired }   │             ◀── the profile's spec
                                          ▼
                              $DSH_HOME/profile/active.json

browser ──GET /profiles/api/catalog─▶ dsh-profiles (host) ──▶ GET  /api/profiles/catalog
        ◀── composable plugins + skills   │             ◀── plugins, skills

browser ──POST /profiles/api/create─▶ dsh-profiles (host) ──▶ POST /api/profiles
        ◀── { ok, profile }               │             ◀── the created profile
```

**`dsh-login` must be mounted in the same profile.** Every call resolves the session that plugin records, per request and never cached — the same contract `dsh-skill-library` and `dsh-vps-status` follow. Without it there is no roster, and the picker stays behind the login gate.

## Two surfaces

| Surface | Seat | When it shows |
| --- | --- | --- |
| The picker | `shell.overlay`, order `9_999` | nothing materialized, or the badge asked for it |
| The profile row | `sidebar.footer.below`, order `90` | always, once signed in |

The picker's order sits just below `dsh-login`'s `10_000`, so when neither is satisfied the login screen is on top: choosing a profile requires being signed in.

**The row in the sidebar foot is the only way to switch.** The picker opens itself only when there is nothing to materialize, so without that row a machine that already has a profile would never see it again, and changing profiles would mean the plugin manager's dashboard plus a reload. The two surfaces sit in different slots and never share a React tree, so they share a `ProfileStore` instead.

### Applying a host-plane change

The shell reads `profile/active.json` when it **spawns the harness**, so a new plugin list is settled at that moment and only a fresh spawn picks it up.

Inside the desktop shell that spawn just happens: selecting a profile whose host-plane rows differ calls `window.dshDesktop.restartHarness()` straight away, and the gate holds an "Aplicando o perfil…" screen until the shell takes the window down. There is no confirmation, because there is no second question — the person answered it by choosing the profile, and asking them to confirm the consequence of their own choice is a question with one right answer.

It costs an in-flight turn. A harness restart ends the conversation that is streaming; the history is persisted, the answer in progress is not. Switching profiles is a deliberate act taken between tasks, so the trade is worth stating rather than guarding with a dialog.

The restart notice survives for the two cases the automatic path cannot serve: a plain browser, where the same page is served but there is no process for it to restart, and a restart that came back not ready — the manual instruction has to stay reachable, or a selection that failed to apply would leave nothing to do. `desktopBridge()` checks the method rather than assuming it, because the object is injected by another process's preload and an older shell would otherwise fail inside the click.

Cancelling is offered only for a deliberate switch. With nothing materialized there is no state to go back to, so the gate has no way out but a choice — or authoring one.

## Authoring from the picker

**Criar perfil** opens the same form the plugin manager's panel offers: a name, an optional description, every composable plugin, and every published library skill. It exists because the gate used to be a dead end for anyone without a profile: the only way past it was to leave for the panel.

The catalog is read from the server, never from a list in this bundle — the library is the server's, and a local copy would go stale the first time an admin publishes something. What the server does **not** get to decide is which plugin rows exist: `narrowCatalogPlugins` keeps only the ids in `PLUGIN_ROWS` and takes each row's plane from that table, so the answer supplies a row's text and never its cost. A row this build cannot compose never reaches the form, where ticking it would select nothing.

The draft goes upstream as typed. This half re-states none of the rules — name length, unknown plugin, missing skill, duplicate name are all refused by the plugin manager, with the message shown in the form. A created profile is then selected straight away: leaving someone on the roster to click the profile they just authored would be a second question with one right answer.

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
| `GET /profiles/api/catalog` | `{ plugins, skills }`, already narrowed to the composable rows |
| `POST /profiles/api/create` | `{ ok, profile }`, or `{ ok: false, message }` carrying the manager's refusal |

`signedIn: false` covers not signed in, an expired session, and an unreachable plugin manager. All three leave the picker waiting rather than showing an empty roster that would read as "you have no profiles".

## Config

| Field | Meaning |
| --- | --- |
| `profilesEndpoint` | Full URL listing the user's profiles, and where a new one is posted. **Required.** Plain http is refused off loopback |
| `activeEndpoint` | Full URL that makes one profile active. **Required.** |
| `specEndpoint` | Full URL answering the active profile's spec. **Required** — validated at load even though only the client reads it |
| `catalogEndpoint` | Full URL answering what a new profile can be built from. **Required.** |
| `timeoutMs` | Deadline per forwarded request, default `5000` |
| `dshHome` | Harness home holding `profile/active.json`; defaults to `$DSH_HOME` |

Every field is checked at load, not on the first request: a bad endpoint would otherwise surface as a picker that lists nothing, which reads as "you have no profiles" — the hardest failure to trace back to a typo.

MIT.
