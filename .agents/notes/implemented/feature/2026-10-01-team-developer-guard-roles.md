# Agent Note: the tool guard keeps the team's developers off testing

Status: implemented

## Problem

A `team` foundations run on 2026-10-01 took about 21 minutes against the 16–17 the parallel pipeline was measured at. Installs took 3–20 s, so the extra time came from the role agents doing work their skills forbid. After the navigable shell was done, the frontend spent about 9 minutes writing its own Playwright scripts in `.verificacao/` and `/tmp`, running them about ten times and debugging an offline-login case nobody asked for. The backend ran the tester's whole suite twice, ran `pnpm check` seven times and waited on the Swagger page in the browser. The skills already said "Do not write or run tests, test scripts or evidence scripts", and the model ignored it.

## Decision

- **Two guard roles.** `dsh-tool-guard` 0.2.4 adds `backend` and `frontend`. Both may write the product anywhere in the workspace, install packages, and run `check`, typecheck, migrations and seeds. The guard denies:
  - writes to test files (`*.test.*`, `*.spec.*`), the root test-runner configs, `testes/`, `.git/`, any file inside a dot-directory, and anything outside the workspace;
  - under `mds/`, any file except the epic's `decisoes.md`, plus `02-design.md` for the frontend;
  - shell segments that run a test suite (`pnpm|npm|yarn|bun [run] test`, `vitest`, `jest`, `playwright test`, `node --test`). Install segments that only name a runner are allowed;
  - node scripts run from a dot-directory or `/tmp`;
  - delegation.

  `backend` is also denied `browser` and `prototype_automation`. `frontend` keeps them for its preview screenshot.
- **Bound by the preset, not chosen by the model.** The desktop `team` preset sets `guardRole: backend` on `delegate_backend` and `guardRole: frontend` on `delegate_frontend`, next to the tester's existing `qa`. The `dsh-tool-subagent` patch accepts both values.
- **The skills name the refusals.** `backend-page` and `frontend-page` list what the guard refuses, so an agent reads a denial as the rule rather than retrying around it.

## Alternatives considered

- **Stronger skill text only.** Rejected: the existing text already forbade the behavior, and the measured run shows the model did not follow it.
- **Reuse the `builder` role.** Rejected: `builder` denies package installs and the browser, which the foundations and the frontend preview need.
- **Count `check` runs per phase.** Not done: the guard is synchronous and stateless per call, and it cannot see phase boundaries, so a counter would rely on guesses about turns.

## Consequences

- The developers lose the scratch-script path entirely, including ad-hoc debugging scripts that were sometimes useful. They keep `node -e` and scripts inside the product, such as a seed.
- The CLI copy of the `team` preset has no guard: its packaged `dsh-tool-subagent` takes no `guardRole`, so this enforcement exists only in the desktop app. The desktop preset test strips every `guardRole` line when it compares the two copies, and it asserts each delegation row's role.
- A shell command can still create a file through redirection (`cat > .x/a.mjs`). The guard closes running it from a dot-directory or `/tmp`, not every way of writing it.
