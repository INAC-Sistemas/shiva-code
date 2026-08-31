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
        ◀──── { ok, session } ──────────                  ◀── { token, … } ───
```

That keeps the endpoint URL — and any static header it needs — on the host, where the environment variable lives, and keeps the browser's request same-origin, so the login service needs no CORS grant for the gate to work.

`GET /login/api/form` answers the descriptor the screen renders (title, labels, button text): the host owns every string, so the copy is config, not a rebuild.

## Where the endpoint comes from

`$DSH_LOGIN_ENDPOINT` wins whenever it is set and non-blank; otherwise `config.endpoint` applies. Rename the variable with `config.endpointEnv`. Both forms are validated at load — a URL that is malformed or not http(s) fails the boot, with the operator watching, rather than locking the first user out of the app.

`config.endpoint` itself is not a literal in [cordis.patch.yml](cordis.patch.yml): it reads `$VPS_URL`, the base URL of the VPS shared by every plugin backed by it, and appends this plugin's own path. `config.logoutEndpoint` is composed the same way.

```yaml
config:
  endpoint: !!js "new URL('/api/auth/login', process.env.VPS_URL).href"
  logoutEndpoint: !!js "new URL('/api/auth/logout', process.env.VPS_URL).href"
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
| `signOut()` | Ends the session here, in storage, in every other tab, and at the login service. |

### Signing out

`signOut()` does two things in a deliberate order. The local half — clearing the store and the `localStorage` row — is synchronous and runs **first**, unconditionally. Only then does it `POST` the retired token to `/login/api/logout`, which forwards it to `config.logoutEndpoint` with the user's own bearer.

That order is the point: a login service that refuses the sign-out, or that cannot be reached, must never be able to trap someone inside the app. The returned promise reports only whether the service was told, and never rejects — a caller with nothing to show for it may ignore it.

`config.logoutEndpoint` is empty by default, meaning the service has no such route and signing out clears the browser alone. A non-empty value is validated at load, like the login endpoint.

**Granting a session is not on the contract.** That authority stays with the gate, which holds the store object itself — a consumer plugin can end a session but cannot forge one.

### The transitions nobody asks for

The store owns both, so a subscriber never polls or re-reads storage:

- **A lifetime running out.** `config.sessionTtlMs` becomes an instant on the browser clock; a timer fires at it, clears the row, and the gate comes back — no page reload needed.
- **Another tab.** The `storage` event fires only in the *other* tabs, so signing out anywhere signs out everywhere, and signing in adopts the session without a reload.

Both are released when the plugin unloads: the listener is an `ctx.effect`, and its disposer also disposes the store's timer.

## Behavior

- The granted session is stored in `localStorage` under `dsh-login.session` (token plus whatever else the answer carried, never the password), so a reload does not ask again and never flashes the screen: the first render reads that row synchronously.
- `config.sessionTtlMs` sets how long that lasts; `0` (the default) means until the browser storage is cleared. The token's own expiry stays the login service's business — this plugin does not read or refresh it.
- Unknown state resolves to *covered*: unreadable or blocked storage, a descriptor that fails to load, or an answer this plugin cannot read all leave the screen up.
- Covering the app is not enough on its own, so focus that escapes the card — Tab into the page underneath — is pulled back to the first field.
- Restyle the screen from a profile's custom CSS through the `[data-dsh-login]` attribute.

## What this gates

The browser UI, and only that. Every other DSH route stays reachable by anything that can reach the port, and the plugin's own routes accept non-browser callers (the fence refuses cross-site *browser* requests, which is a CSRF defense, not authentication). Bind the harness to loopback, or put a real proxy in front of it, where that matters.

## How it attaches

The plugin mounts two things: the shared session service (`ctx.loginSession`, above) and one overlay entry, the gate itself.

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
