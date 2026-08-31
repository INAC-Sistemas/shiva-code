# dsh-login

A sign-in screen as the DSH web app's first screen. The browser stays covered until a login service accepts the typed credentials.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                 ┌────────────────────┐               │
│                 │ Entrar             │               │
│                 │ E-mail  [        ] │               │
│                 │ Senha   [        ] │               │
│                 │      (  Entrar   ) │               │
│                 └────────────────────┘               │
│                                                      │
└──────────────────────────────────────────────────────┘
        POST → $DSH_LOGIN_ENDPOINT
               (default $VPS_URL + /api/auth/login)
```

## The exchange

The browser never posts to the login service directly. It posts what the user typed to this plugin's own route, and the host half forwards it:

```
browser ──POST /login/api/authenticate──▶ dsh-login (host) ──POST──▶ login service
        ◀──── { ok, session } ──────────      │           ◀── { token, … } ───
                                              ▼
                                    ctx.credentials record
                                      `dsh-login/session`
```

That keeps the endpoint URL — and any static header it needs — on the host, where the environment variable lives, and keeps the browser's request same-origin, so the login service needs no CORS grant for the gate to work.

The host records the grant on the way past, which is what lets host-side plugins act as the signed-in user — see [The host copy of the session](#the-host-copy-of-the-session).

`GET /login/api/form` answers the descriptor the screen renders (title, labels, button text): the host owns every string, so the copy is config, not a rebuild.

## Where the endpoint comes from

`$DSH_LOGIN_ENDPOINT` wins whenever it is set and non-blank; otherwise `config.endpoint` applies. Rename the variable with `config.endpointEnv`. Both forms are validated at load — a URL that is malformed or not http(s) fails the boot, with the operator watching, rather than locking the first user out of the app.

`config.endpoint` itself is not a literal in [cordis.patch.yml](cordis.patch.yml): it reads `$VPS_URL`, the base URL of the VPS shared by every plugin backed by it, and appends this plugin's own path. `config.logoutEndpoint` and `config.validateEndpoint` are composed the same way.

```yaml
config:
  endpoint: !!js "new URL('/api/auth/login', process.env.VPS_URL).href"
  logoutEndpoint: !!js "new URL('/api/auth/logout', process.env.VPS_URL).href"
  validateEndpoint: !!js "new URL('/api/auth/me', process.env.VPS_URL).href"
```

```sh
# .env, in the invoking directory or in $DSH_HOME (both are gitignored)
VPS_URL=https://vps1.example.com
```

`VPS_URL` carries the origin only — scheme, host, port, no path. `new URL` is deliberate: it normalizes a trailing slash on the base, and an unset `$VPS_URL` throws at composition rather than yielding the string `undefined/api/auth/login`, which would fail later with a worse message.

The two channels do not overlap by accident. A `.env` file may not set `DSH_`-prefixed names — the boot rejects the whole file if it tries — so `$DSH_LOGIN_ENDPOINT` only ever arrives from the launching shell. `.env` is therefore the channel for the ordinary deployment, and the exported variable stays the one-off override.

The forwarded body carries the two typed values under the configured field names (`email` and `password` by default), plus any `config.headers`. A successful answer must carry a non-empty string at `config.tokenPath` (`token` by default, dot paths like `data.accessToken` supported); a 2xx without one is reported as a misconfigured endpoint and does **not** open the gate.

| Answer | What the user sees |
| --- | --- |
| 2xx with a token | the app |
| 401 / 403 | the service's own `message`, or "Invalid credentials." |
| 2xx without a token | "…returned no token at `token`." |
| anything else, or unreachable | the status, or "The login service could not be reached." |
| accepted, but the host could not record it | "The session could not be stored on this machine. Try again." |

## The shared session (`ctx.loginSession`)

The granted token is not private to the gate. It lives in one store the plugin publishes as a browser cordis service, so any other client plugin can read it, react to it, and end it.

```ts
// another plugin's client half
import type { LoginSessionContract, StoredSession } from 'dsh-login/client'

export const inject = ['loginSession']

interface ClientContext {
  loginSession: LoginSessionContract
  effect(callback: () => () => void, label?: string): () => void
}

export function apply(ctx: ClientContext): void {
  const token = ctx.loginSession.token()          // null while signed out
  ctx.effect(() => ctx.loginSession.subscribe(() => {
    // sign-in, sign-out, expiry, or another tab
  }))
}
```

In a component, the store is shaped for React's own external-store hook:

```tsx
const session = useSyncExternalStore(
  listener => ctx.loginSession.subscribe(listener),
  () => ctx.loginSession.getSnapshot(),
)
```

`getSnapshot` returns the **same reference** until the session actually changes, which `useSyncExternalStore` requires — a fresh object per call re-renders forever.

The face is mirrored structurally, the same way this plugin mirrors `slots`: a plugin outside the monorepo never receives the upstream `declare module` augmentations, so it declares the members it touches and imports the contract type for them. The service is registered with `ctx.provide` rather than as a `Service` subclass for the same reason — the client bundle purity gate rejects cordis value imports from a plugin, and collaboration goes through services instead. Consumers inject it identically either way.

### What the contract carries

| Member | Meaning |
|---|---|
| `subscribe(listener)` | Sign-in, sign-out, expiry, and another tab. Returns the disposer. |
| `getSnapshot()` | The live `StoredSession`, or `null`. Stable reference between changes. |
| `token()` | The token alone, or `null`. |
| `authorizedFetch(input, init?)` | Calls an API with the session bearer, and returns to the gate if it is refused. |
| `signOut()` | Ends the session here, in storage, in every other tab, at the login service, and on the host. |

### Calling the API: use `authorizedFetch`

```ts
const response = await ctx.loginSession.authorizedFetch('/api/things')
if (response.ok) render(await response.json())
```

It attaches `authorization: Bearer <token>` — overriding any `authorization` in `init`, since this method owns that header — and on a `401`/`403` it ends the session, which brings the gate back. The response is still returned, so the caller decides what to render meanwhile.

**This is the path to use.** Building the request by hand from `token()` works and is exactly what loses that handling, leaving the app looking signed in with a token nothing accepts.

Only a refusal ends a session. Any other status, and a network failure, leave it alone — a service that cannot be reached must not sign anyone out. A refusal of a token the session has already moved past is ignored too, so a slow response cannot end the session that replaced it. With nobody signed in, the call rejects with `NoSessionError` before anything is sent.

### Signing out

`signOut()` does two things in a deliberate order. The local half — clearing the store and the `localStorage` row — is synchronous and runs **first**, unconditionally. Only then does it `POST` the retired token to `/login/api/logout`, which forwards it to `config.logoutEndpoint` with the user's own bearer.

That order is the point: a login service that refuses the sign-out, or that cannot be reached, must never be able to trap someone inside the app. The returned promise reports only whether the service was told, and never rejects — a caller with nothing to show for it may ignore it.

The host route deletes [its own copy](#the-host-copy-of-the-session) first, before either answer and whatever the login service then says — a service with no logout route, or one that is down, must not leave this machine holding a session the user has ended.

`config.logoutEndpoint` is empty by default, meaning the service has no such route and signing out clears the browser alone. A non-empty value is validated at load, like the login endpoint.

**Granting a session is not on the contract.** That authority stays with the gate, which holds the store object itself — a consumer plugin can end a session but cannot forge one.

### The transitions nobody asks for

The store owns both, so a subscriber never polls or re-reads storage:

- **A lifetime running out.** `config.sessionTtlMs` becomes an instant on the browser clock; a timer fires at it, clears the row, and the gate comes back — no page reload needed.
- **Another tab.** The `storage` event fires only in the *other* tabs, so signing out anywhere signs out everywhere, and signing in adopts the session without a reload.
- **A token that died while the browser was closed.** The stored row survives; the token behind it may not. So the session is revalidated on boot and whenever the tab regains focus — see below.

All are released when the plugin unloads: the listeners are one `ctx.effect`, and its disposer also disposes the store's timer.

## Returning to the gate

There is no redirect and no route to navigate to. `LoginGate` renders from the store through `useSyncExternalStore` and returns `null` while a session holds, so **ending the session is what brings the gate back** — full-frame, in every open tab, with no reload.

Three things end one:

| Trigger | Where |
|---|---|
| The user signs out | `signOut()`, from the user menu or any consumer |
| An API refuses the session (`401`/`403`) | `authorizedFetch`, on the call that was refused |
| The login service says the token is dead | The revalidation below, on boot and on focus |

### Revalidation on boot and on focus

`GET /login/api/validate` forwards the browser's own bearer to `config.validateEndpoint` (`/api/auth/me`, say) and answers one of three things:

```ts
{ ok: true }                               // still good
{ ok: false, reason: 'rejected' }          // the service refused it — end the session
{ ok: false, reason: 'unreachable' }       // anything else — leave the session alone
```

The two failures are kept apart on purpose. Collapsing them into a bare boolean would turn an outage of the login service into a mass sign-out; a service that cannot be reached must not sign anyone out, exactly as it must not trap anyone in. An empty `validateEndpoint` means the service has no such route, and the answer is then always `ok: true` — a session cannot be disproved, and inventing a refusal would sign out every user of a service that simply does not offer the check.

`config.revalidateIntervalMs` (default 60 s) is the floor between two focus-driven checks. It is enforced **on the host**, not in the browser, because the client bundle receives no plugin config: a repeat check of the same token inside that window is answered from the last positive result instead of calling the service again. The cost is stated plainly — a token revoked at the login service keeps passing revalidation until the window elapses. That is what the rate limit buys; the window bounds how stale an answer can be.

## The host copy of the session

Host-side plugins — a tool the model calls, say — need the same token, and they have no access to `localStorage`. So the host records the granted session as a credential record through `ctx.credentials`:

```yaml
# $DSH_HOME/.credentials.yaml  (mode 0600, written under a cross-process lock)
records:
  dsh-login/session:
    kind: grant
    payload: { token: …, expiresAt: null, user: { … } }
```

**It is not a mirror of the browser's session.** It is the host's own copy of the same grant, written by the handler that produced it and retired by the same sign-out. Two copies, each expiring on its own clock; nothing polls, subscribes, or reconciles them.

The key is `dsh-login/session` because the credential seam addresses a record by its **owner's** registered plugin name — a payload is written in its owner's format, so only the writer may name the scope. This plugin is the only writer, which is why the module that owns the key, the payload, the expiry rule and the `Bearer` construction ships here:

```ts
// a host-side consumer plugin
import { resolveLoginAuthorization } from 'dsh-login/vps-auth'

const auth = await resolveLoginAuthorization(ctx.get('credentials'), Date.now())
if (!auth.ok) throw new Error(auth.message)   // 'no-store' | 'absent' | 'expired' | 'malformed'
await fetch(url, { headers: { authorization: auth.authorization } })
```

Resolve **per operation and never cache**: that is what makes a sign-in, a sign-out, or a re-login reach the next operation without a restart. `dsh-login/vps-auth` is host-only — it value-imports a platform package, and the client bundle's purity gate rejects those.

Four things worth knowing before relying on it:

- **A login the host cannot record fails.** If no credential store is mounted, or the write is refused, the attempt answers `grant-storage` (HTTP 500) instead of signing the browser in. A browser holding a session the host has no record of would report success and then fail every host-side request.
- **Sign-out is compare-and-delete.** The same-origin fence is a cross-site defence, not authentication — a caller with neither `Sec-Fetch-Site` nor `Origin` passes — so the record is removed only for a caller presenting its token. The accepted race: a sign-in landing between the read and the delete loses its fresh record, which is self-healing because the browser still holds the token.
- **It is durable, and outlives the browser.** The record survives closing the tab and restarting the harness — which is what lets host-side tools keep working across a restart, and what lets a headless run act as the signed-in user after a single sign-in. With `sessionTtlMs: 0` (the default) it carries no expiry of its own and is retired only by a sign-out or a negative revalidation, both of which come from a browser.
- **One record, one identity, one `$DSH_HOME`.** Two people sharing a harness home, or a `dsh --profile headless` run beside the web UI, all act as whoever signed in last. This matches the harness's existing single-user assumptions, but it is broader than "the tab that signed in".

## Behavior

- The granted session is stored in `localStorage` under `dsh-login.session` (token plus whatever else the answer carried, never the password), so a reload does not ask again and never flashes the screen: the first render reads that row synchronously.
- `config.sessionTtlMs` sets how long that lasts; `0` (the default) means until the browser storage is cleared. The token's own expiry stays the login service's business — this plugin does not read or refresh it, but it does ask whether it is still good; see [Returning to the gate](#returning-to-the-gate).
- Unknown state resolves to *covered*: unreadable or blocked storage, a descriptor that fails to load, or an answer this plugin cannot read all leave the screen up.
- Covering the app is not enough on its own, so focus that escapes the card — Tab into the page underneath — is pulled back to the first field.
- Restyle the screen from a profile's custom CSS through the `[data-dsh-login]` attribute.

## What this gates

The browser UI, and only that. Every other DSH route stays reachable by anything that can reach the port, and the plugin's own routes accept non-browser callers (the fence refuses cross-site *browser* requests, which is a CSRF defense, not authentication). Bind the harness to loopback, or put a real proxy in front of it, where that matters.

## How it attaches

The plugin mounts two things: the shared session service (`ctx.loginSession`, above) and one overlay entry, the gate itself. Its host half registers four routes — `form`, `authenticate`, `logout`, `validate` — each behind the same-origin fence, and requires `ctx.webServer`.

`shell.overlay` is the frame-wide floating layer declared by `@deepseek-ai/dsh-client-ui-layout`. This plugin registers a fresh cell id (`dsh-login`) at `order: 10000`, so the gate sits above every other overlay entry; the layer grants pointer events to each entry, so the cover really does take the clicks. Nothing is replaced — remove the plugin and the app is exactly as before.

The `root` slot, which looks like the natural seat for a first screen, is deliberately not used: it is a single slot, so registering there would shadow the whole app frame and take every seat it declares with it.

`dsh.client.immediately` puts the bundle in the boot's first fetch tier, so the cover goes up as early as the client module system can mount it.

## Install

```sh
pnpm --filter dsh-login build
dsh plugin --profile web add link:/home/rai/shiva-code/plugins/dsh-login
pnpm dsh --profile web   # reads $VPS_URL from .env
```

`dsh plugin add` appends `dsh-login` to the profile's `dsh.profile.bundles`; boot then merges [cordis.patch.yml](cordis.patch.yml), which inserts the `login` entry and its Portuguese copy. Rebuild (`pnpm --filter dsh-login build`) after any source change — the web shell always serves the built `lib/client.js`, even on a source launch.

To remove the gate: `dsh plugin --profile web remove dsh-login`. That is also the way back in when the login service is down and nobody can sign in.

## Development

```sh
pnpm --filter dsh-login typecheck
pnpm --filter dsh-login test     # credential exchange, endpoint resolution, stored session, fence
pnpm --filter dsh-login watch    # rebuild the bundles on change
```

MIT.
