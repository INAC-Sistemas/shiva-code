# Agent Note: First-run setup wizard (dsh-setup)

Status: implemented

## Problem

Each tool that needs a model had its own setup, in its own place, found only when the person first used it. The chat model had a first-run step in the settings shell. The image generator was set up in a card in the Assets tab, and OpenViking in a form in the Memory tab. Someone could start a conversation with no working image generator, and a key pasted into one tab was never tested. The product requirement is that before Shiva Code is used, every tool that needs a model is configured in one step-by-step modal, and that this configuration is saved on the machine so it is not asked again.

## Decision

**A desktop plugin, `plugins/dsh-setup`, owns the wizard.** Its client half is a `shell.overlay` entry at order `9_998`, below `dsh-profiles` (`9_999`) and `dsh-login` (`10_000`). On a first run the person signs in, picks a profile, and only then configures models, because the profile decides whether `dsh-openviking` is loaded at all. The steps are chat, image, memory (only when `dsh-openviking` answers its status route; it can be skipped), and a summary.

**No new storage for tool settings.** The chat key goes to the credentials service under the route's `apiKeyEnv` (or the derived `<PROVIDER>_API_KEY`, the rule the Models page uses), and the chat model goes to `agent-default-model`. The image key goes to `OPENROUTER_API_KEY` or `FAL_KEY`. The image model is written through `POST /assets/api/config`, and the OpenViking endpoints through `POST /openviking/api/configure`, so each tool keeps one writer for its settings. The only new state is the completion marker: the `shiva-setup` section of `settings.yaml` (`completedVersion`, `openviking`).

**Each step tests before it saves.** The chat test sends one 16-token request through `ctx.llm.stream`, the only test that holds for every adapter. It runs with the key already stored, because adapters resolve keys from the credentials service; on failure the previous value is restored. OpenRouter keys are checked with `GET /key`, and OpenViking endpoints with one embedding request, which also supplies the vector width OpenViking has to be configured with. A fal key is only checked for presence.

**The wizard opens again when a tool stops working.** `planSetup` opens it when the marker names another `SETUP_VERSION`, when the default chat route is unregistered or missing the credential its profile names, or when a loaded `dsh-assets` has no model or key. A skipped memory step never reopens it. When the wizard's own state route fails, the gate renders nothing rather than locking the app.

**The wizard replaces the upstream chat onboarding step.** The `dsh-client-ui-settings-models` patch no longer registers `deepseek-official` in `settings.onboarding`. That step's modal sets `#root.inert`, and the overlay layer lives inside `#root`, so both at once would block the wizard. The `welcome-notice` step is kept.

**Compatible with the packaged harness.** The desktop runs harness `0.1.2-alpha.4`, whose settings API differs from this repository's source (`settingsNamespace` and `installSettingsSection` are not exported there). The host half therefore reads every service through structural faces in `src/services.ts`, naming only members whose signatures are identical in both. `dsh-setup` is added to the `@deepseek-ai/dsh` dependency patch so the harness can resolve it, and to `HOST_ALWAYS` because the configuration belongs to the machine, not to a profile.

## Alternatives considered

**More `settings.onboarding` steps next to the upstream DeepSeek step.** Rejected: that coordinator only runs while the current session is blank, and it knows nothing about the login and profile gates, so an image or memory step could appear before a profile decided whether those tools exist. It also lives in an upstream package the desktop can only change through `patch-package` hunks against built output.

**The wizard writes `~/.dsh/assets/settings.json` and `~/.dsh/openviking-desktop/settings.json` itself.** Rejected: two writers for one file drift. `dsh-openviking` also regenerates `ov-desktop.conf` and restarts its server on configure, which a direct file write would skip.

**Testing chat keys with model discovery.** Rejected: pi-ai answers discovery for its catalog routes from the shipped catalog without a network call, so a wrong key would pass.

**Persisting completion in browser `localStorage`.** Rejected: the harness home already holds this machine's configuration, and the marker is judged together with credentials that only the host can read.

**A completion flag alone decides whether to open.** Rejected: a key removed after setup would leave a tool that cannot run and a wizard that never returns. Readiness is re-derived on each load.

## Consequences

- A first run shows login, profile, then the wizard. The app is usable only after chat (and a loaded image generator) are working.
- A rejected chat key never replaces a working one. The chat test costs a few tokens and runs outside any session, so it is not in a session log; it is a configuration probe, like model discovery.
- There is no way to reopen the wizard on demand. Each choice stays editable in Settings → Models and in the Assets and Memory tabs.
- A bad fal key is only caught on the first generation.
- The memory step reflects the plugins loaded at startup. A profile switch that needs no restart does not change the step list while the wizard is open.
- `plugins/dsh-setup/tests` covers the plan, the probes, every route against in-memory services on a real HTTP server, and route disposal (`pnpm --filter dsh-setup test`). `desktop/test/onboarding-patch.test.ts` pins that the upstream step is no longer registered. The rendered wizard has no automated UI test.
