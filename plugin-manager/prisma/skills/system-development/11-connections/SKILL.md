---
name: 11-connections
description: Use the machine's connection CLIs (GitHub, Supabase, Railway, Vercel) through the agent tools — check status, install the CLI, log in (browser or token), run actions (deploy/redeploy/open dashboard), and bring the provider tab to the front.
whenToUse: When the plan or build needs a real repo, database, deploy or hosting connection (typically /04-tech-plan, /07-build, /08-review).
---

# Connections (GitHub · Supabase · Railway · Vercel)

Four tools drive the workspace's connection CLIs, one per provider: `github_cli`, `supabase_cli`, `railway_cli`, `vercel_cli`. They expose the same buttons as the provider's sidebar tab, so the agent operates the connection itself — the human never has to click, and never has to open the tab.

## The tool

Every tool takes `op` (required) plus optional args:

| `op` | Args | Effect |
|---|---|---|
| `status` | — | CLI installed/version, login state + account, workspace link (project/service), status items, **available actions**, install job, login progress |
| `install` | — | Install the provider CLI (npm/scoop/brew chain); poll with `job` |
| `login` | `token?` | Start the browser login **and open it**; pass `token` to save an access token instead |
| `login_input` | `text?` | Answer a login prompt (default Enter) |
| `logout` | — | Disconnect |
| `action` | `action` | Run an action id from `status` (e.g. Railway `up`, `redeploy`, `open`); an `open` result also opens the browser |
| `open` | `url?` | Open a URL in the browser (login or dashboard); defaults to the login URL or the workspace dashboard |
| `focus` | — | Bring the provider's tab to the front |
| `job` | — | Install job progress |

## Flow

1. **Always `status` first.** It says what is installed, whether the account is connected, whether this workspace is linked, and which `action` ids exist. The `action` list is authoritative — never invent one.
2. **Not installed → `install`**, then poll `job` until `phase` is `done` or `error`.
3. **Not logged in → `login`.** The browser opens at the provider's OAuth page and the tool returns the `url`/`code`; the human authorizes once. If the CLI has no browser flow, pass `token` (ask the human for it). Use `login_input` when the CLI prompts.
4. **Run actions by id** (`action`). A deploy is `railway_cli {op:'action', action:'up'}`; the dashboard is `... action:'open'`.
5. **`focus`** when the human should watch the tab.

## Provisioning order — Railway, from zero (mandatory)

Preparing a Railway project has an order the CLI does not enforce. Follow it exactly; the step in **bold** is the one whose omission ships the application into the database. Validated with Railway CLI v4.58.0.

| # | Command | Why |
|---|---|---|
| 1 | `railway status` (or tool `status`) | Confirm login, CLI version, and whether the workspace is already linked. |
| 2 | `railway init --name <project>` | Create the project — or reuse an existing one. |
| 3 | `railway link --project <id>` | Link the project to the workspace. **This writes `~/.railway/config.json`, OUTSIDE the workspace**: under a workspace-restricted sandbox the write is denied and the link fails even when the CLI resolves everything. Report it — do not retry blindly. |
| 4 | **`railway add --service <app>`** | **Create the application service BEFORE the database and before any deploy.** This is the step whose absence caused the incident. |
| 5 | `railway add --database postgres` | Create the database service. |
| 6 | set the app service's variables to the **private network** (e.g. `postgres.railway.internal`), never a public URL | Keep the database off the internet. |
| 7 | `railway up --service <app>` | Deploy — **always with an explicit `--service`**. |
| 8 | generate a public domain for the **application** service only — never for the database | Expose the app, not the data. |
| 9 | verify: `railway service list` shows the expected services; the app service is Online; `railway variables --service <app>` shows `RAILWAY_SERVICE_NAME` = the application service, not the database | Prove the deploy landed on the right service. |

## Silent errors (the CLI does not warn)

- **`railway up` without `--service` deploys to the LINKED service.** If the linked service is the database, the app is packaged and published into the database — in a real session this crashed the Postgres, gave it a public domain, and left the app unpublished. Always pass `--service <app>`. The check that catches it: `railway variables --json` showing a `RAILWAY_SERVICE_NAME` different from the app service.
- **`railway variables --service <name> --json` prints the RESOLVED values, including passwords.** It is the easiest way to leak a credential into a log. To check that a variable EXISTS, do not print its value; to build one variable from another, use Railway's own reference syntax (`${{Postgres.PGPASSWORD}}`) so the password is never read by the agent.

## What the CLI does not do

- There is **no command to remove a public domain** — only the dashboard.
- `railway service delete <name>` fails; the correct syntax is `railway service delete --service <name> --yes`.
- `railway domain` creates the domain on the **linked** service. Without `--service` it exposes whatever is selected — including the database.

## Deploy verification (before calling a deploy successful)

A deploy that "returned success" but landed on the wrong service is a **failure**, not a success. Before declaring one done:

1. `railway service list` — confirm which service is `(linked)`.
2. Confirm the application service is Online (and the database is too).
3. Test the app's public URL (not the database's) with a real endpoint.
4. If the project has a database, confirm the database has **no** public domain.

## Rules

- The project link lives in the workspace; never deploy from another directory.
- A deploy is the human's decision — confirm the target before `action up`.
- Report the CLI's real output; never claim a deploy succeeded without it. `/08-review` verifies the deployed URL, not the exit code.
- Never run `up` or `domain` without an explicit `--service`. A command's success is not proof the deploy landed on the right service — the right service answering on the right URL is.
