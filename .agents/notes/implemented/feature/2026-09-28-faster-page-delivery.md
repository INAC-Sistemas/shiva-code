# Agent Note: faster page delivery in /02-frontend

Status: implemented

## Problem

In a measured `/02-frontend` run (a shopping-list app, 2026-09-28), page 02 took 52 minutes from start to handover. Page 03 was still not handed over after 2h20. The session logs showed three causes:
- **Subagents drove the browser.** Builders made 114–148 `browser` calls each (`click`, `fill`, `eval`), walking flows the [no-tests rule](2026-09-28-no-tests-before-delivery.md) forbids before delivery. Steps with a browser call took 41% of all subagent time (92 of 227 minutes). The guard already denied the browser to `builder`, but the principal spawned every subagent without `role`, so no role policy applied.
- **GREEN verdicts still got a fix round.** Twice the evaluator returned GREEN and the principal spawned a builder to fix its non-blocking findings (23 and 19 minutes).
- **One large page ran as three rounds before the requester saw it.** Each round was a full build, review and fix cycle of 40–60 minutes.

## Decision

- **`dsh-tool-guard` 0.2.3 denies `browser` and `prototype_automation` to `evaluator` as well as `builder`.** In a workspace with `mds/epics/`, it also denies a principal `subagent` call without `role`, so the role policies always bind. Any role name passes; only `builder`, `evaluator` and `qa` carry restrictions.
- **`/02-frontend` hands a GREEN page straight to the requester.** Its non-RED findings go to `decisoes.md` and the next page's GAP. The builder briefing says to run only `typecheck`, never a build, and never to open the browser.
- **A tarefa carries at most 8 "Done when" lines of what the page shows.** A larger page is split into parts, and each part is handed over for visual approval before the next starts. `/01-arquitetura` lists those parts on the page's line; `00-start-here` states the same unit.

## Consequences

- The principal's visual check is the only look at the page before the requester sees it.
- Outside pipeline workspaces, spawning a subagent without `role` still works.

## Verification

- `node --test test/*.test.mjs` in `plugins/dsh-tool-guard` covers the browser denial for both roles and the role requirement with and without `mds/epics/`.
- `node scripts/sync-skills.mjs --check` reports no drift.
