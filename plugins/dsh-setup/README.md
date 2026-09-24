# dsh-setup

The first-run setup wizard. Before the app is used, it walks the person through every tool that needs a model: the chat model, the image generator, and the optional OpenViking memory. Each step tests the key before saving it. Everything is saved on this machine, so the wizard does not come back once it is done.

```
login (10_000) → profile picker (9_999) → setup wizard (9_998) → app
```

## Steps

| Step | Shown when | Test before saving | Saved to |
| --- | --- | --- | --- |
| Chat model | always | one 16-token request through `ctx.llm.stream` on the chosen route and model | key: credentials service under the route's `apiKeyEnv` (or `<PROVIDER>_API_KEY`); model: `agent-default-model` |
| Image generator | `dsh-assets` answers `/assets/api/status` | OpenRouter: `GET /key` with the key; fal: key present | key: `OPENROUTER_API_KEY` or `FAL_KEY`; provider and model: `POST /assets/api/config` |
| Memory (OpenViking) | `dsh-openviking` answers `/openviking/api/status` | one embedding request (also reports the vector width), plus one completion when a VLM is set | `POST /openviking/api/configure` |
| Summary | always | — | completion marker `shiva-setup` in `settings.yaml` |

The chat providers are the ones in `src/providers.ts` that an LLM adapter declares configurable. A pi-ai route whose settings profile names no `apiKeyEnv` gets one before its key is stored, which is the same write the Models page makes. A failed chat test puts back the value the reference held before, so a rejected key never replaces a working one.

The image model and the OpenViking endpoints are written through those plugins' own routes. Each tool therefore keeps a single writer for its settings, and the Assets and Memory tabs show what the wizard saved.

## When the wizard opens

`planSetup` in `src/plan.ts` decides. The wizard opens when any of these holds:

- `shiva-setup.completedVersion` is not `SETUP_VERSION`;
- the default chat route is not registered, or the credential its profile names does not resolve;
- `dsh-assets` is loaded and has no image model, or no key for its provider.

The memory step is optional and never reopens the wizard by itself. Raising `SETUP_VERSION` shows the wizard once more on every machine.

The wizard renders nothing while nobody is signed in, while its facts load, and when its own state route cannot answer. A broken wizard must not lock the person out of an app they may have configured by hand.

## Routes

All are same-origin `POST` routes under `/setup/api`, fenced with `dsh-login`'s `isSameOriginRequest`. Every failure answers `{ ok: false, message }` with text the wizard shows as is.

| Route | Body | Answer |
| --- | --- | --- |
| `state` | — | `{ chat: { ready, provider, model }, imageKeys: { openrouter, fal }, marker }` |
| `chat/providers` | — | `{ providers: [{ provider, displayName, kind, configured }] }` |
| `chat/models` | `{ provider }` | `{ models: [{ id, name }] }`, from model discovery or the registered route |
| `chat/connect` | `{ provider, model, apiKey? }` | `{ ok: true }` once the route answered and the selection is saved |
| `image/connect` | `{ provider: 'openrouter' \| 'fal', apiKey? }` | `{ ok: true }` once the key is tested and stored |
| `memory/test` | `{ embedding, vlm? }` | `{ dimension }` of the embedding |
| `complete` | `{ openviking: 'configured' \| 'skipped' \| null }` | `{ ok: true }` |

`image/connect` can write only `OPENROUTER_API_KEY` and `FAL_KEY`. It is not a general credential setter.

## Config

| Field | Meaning |
| --- | --- |
| `timeoutMs` | Deadline of each key test, default `30000` |
| `routeWaitMs` | How long a chat route declared by the wizard may take to register, default `5000` |
| `openrouterBaseUrl` | OpenRouter API base the image key is checked against, default `https://openrouter.ai/api/v1`; must be https |

## Desktop wiring

- `desktop/build/dsh-desktop.patch.yml` mounts the `setup` row with no profile gate, and `scripts/verify-cordis-config.ts` lists it in `HOST_ALWAYS`.
- `desktop/patches/@deepseek-ai+dsh+0.1.2-alpha.4.patch` adds `dsh-setup` to the harness dependency closure.
- The `dsh-client-ui-settings-models` patch no longer registers the upstream `deepseek-official` onboarding step. That step's modal makes `#root` inert, which would block the wizard in the overlay layer underneath it.

The host half names its services through the structural faces in `src/services.ts` and does not import upstream service types. The packaged desktop harness lags this repository, and the members the wizard calls exist with these signatures in both.

## Known Limitations and Deferred Work

- There is no button that reopens the wizard. Every choice stays editable in Settings → Models and in the Assets and Memory tabs.
- A fal key is only checked for presence: fal has no endpoint that checks a key without generating. A bad key shows up on the first generation.
- The chat test is a real model request, so it costs a few tokens. It runs outside any session and is not written to a session log.
- The memory step is offered only when the profile loaded at startup includes `dsh-openviking`. A profile switch that needs no app restart does not add or remove the step while the wizard is open.
- Tests run with `pnpm --filter dsh-setup test`. The root vitest include does not reach `plugins/*`.

MIT.
