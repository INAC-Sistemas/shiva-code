# Agent Note: team preset runs its three role agents in parallel

Status: implemented

## Problem

The two latest `team` runs were measured from their session logs (`teste20` and `teste21`; `teste21` already used [contract-first slices](2026-09-30-slice-delivery-contract-first.md)):

| Where the time went | Evidence |
|---|---|
| Foundations fully serial | `teste21` tarefa 00: backend 11.3 min, then frontend 11.5, then tester 9.8 = 33 min |
| Tester blocks the manager and starts cold | `delegate_tester` was one-shot, foreground-only (required by `outputSchema`): the manager waited 591 s and 1232 s, and each slice spawned a new tester |
| Model generation | About 70% of subagent time (38.6 of 52.7 min in `teste21`), 4.6–8.3 s per step; one backend wrote 149k output tokens |
| Single-call steps | 70–85% of steps carried one tool call although the skills asked for batching |
| Repeated checks | typecheck + lint + build (24–36 s) ran about three times per agent |
| File-guard errors | 19 "read before overwriting / changed since read" errors, each a wasted step |

## Decision

- **Continuable tester.** `delegate_tester` is `continuable` and drops `outputSchema`, which only works in foreground one-shot mode. One tester serves the whole epic. For each slice it first writes the suite from the tarefa and the contracts while the developers build, then runs it when the manager sends "run". Its closing message ends with a JSON block that has the same fields as the old schema (`status`, `side`, `evidence`, `failingTests`). The desktop keeps `guardRole: qa`, which the patched tool applies to both background modes.
- **Parallel foundations.** The backend's foundations phase 1 creates the project skeleton, the `check` script and the running app. Then backend phase 2 (database, seed, auth, `/docs`), the frontend's shell and the tester's foundation suite start in the same manager step.
- **Model and effort per role.** Each delegation row sets `agentOptions`: backend `deepseek-v4-flash`/`high`, frontend `deepseek-v4-flash-vision-exp`/`high` (it reads screenshots), tester `deepseek-v4-flash`/`low`. The manager keeps the session's model.
- **Fewer, fuller steps.** The skills' "Work in batches" section now lists checkable rules: write one layer's files in one step, `edit` existing files after reading them, and write only new files. Backend and frontend run `npm run check` once per phase. The frontend loads its motion, accessibility and icon skills only when a slice needs them. Closing reports are at most ten lines.

## Alternatives considered

- **Project template served by the VPS.** It would remove most of the foundations' generated code. The product owner declined it for now.
- **Pre-provisioned Chromium and a foundation smoke test without an LLM.** Also declined. The tester still installs Playwright browsers when the project lacks them.

## Consequences

- The manager never blocks on a role agent. The verdict arrives as text, so a malformed block is read by the model rather than rejected by schema validation.
- The per-role model values are deployment choices in `agent.cordis.yml` (CLI and desktop copies). A deployment without the `deepseek-official` provider must change them, or the tester row fails its route preflight.
