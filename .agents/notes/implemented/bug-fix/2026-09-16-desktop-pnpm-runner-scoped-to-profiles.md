# Agent Note: The desktop pnpm runner recovers only profile operations

Status: implemented

## Problem

The agent needs a Node package manager to run project CLIs such as `pnpm dlx shadcn@latest add button` on machines without a system Node.js. DSH Desktop already bundles Node.js and pnpm, and `dsh-desktop-market-installer` prepends `<DSH_HOME>/.desktop-bin` to the Harness process `PATH` when it loads. Every agent shell inherits that `PATH` through the subprocess environment scrub, so the agent's `pnpm` is the packaged shim.

That shim runs `pnpm-runner.mjs`, which was written only for `dsh plugin` operations in a profile directory. In a user project it applied profile-specific behavior: the idle watchdog killed a quiet `pnpm dev` or an interactive prompt after five minutes and left the script's own child orphaned, the Windows lock recovery could move `node_modules` entries aside, and projection isolation and git-prepare approval read and wrote the project's `package.json` and `pnpm-workspace.yaml`.

## Decision

`pnpm-runner.mjs` applies `runWithLockRecovery` only when `isProfileOperation()` holds: the working directory is strictly inside `<home>/profiles`, where `home` is a non-blank `DSH_HOME` or `~/.dsh`, the same resolution `dsh plugin` uses to choose the directory it runs pnpm in. Every other run goes through `runPassthrough`: one pnpm child with inherited stdio, no watchdog, and no file rewrites. It exits with the child's exit code or reports the terminating signal the same way as a recovered run.

The shim location and `PATH` order do not change. The agent reaches the bundled toolchain as `node` and `pnpm`; `npx` does not exist because the `node` package ships no npm, so agents use `pnpm dlx`.

## Alternatives considered

**A separate plain-shim directory appended to the Harness `PATH` by the desktop main process** loses to ordering: the market installer prepends `.desktop-bin` inside the Harness after launch, so an appended `pnpm` would never be found.

**Stopping the market installer from mutating `process.env.PATH`** would break `dsh plugin` runs spawned through `desktopPnpm`, which pass the Harness environment and resolve `pnpm` by name.

**Detecting agent shells through the missing `DSH_HOME`** relies on the subprocess scrub removing `DSH_*` names, which is not a contract of the runner; the working directory is the fact the recovery actually depends on.

## Verification

`desktop/test/pnpm-runner.test.js` covers the profile-directory predicate, including sibling, parent, default-home, and blank-`DSH_HOME` cases, and the passthrough's single spawn with inherited stdio. A manual probe with a 3-second idle timeout confirmed a quiet `pnpm run dev` finishes with exit 0 in a project directory and is still stopped inside `$DSH_HOME/profiles/web`, and that `pnpm dlx shadcn@latest --version` runs with only the bundled toolchain on `PATH`.

## Consequences

Agents can run pnpm-based project CLIs and long-lived scripts through the bundled toolchain. A pnpm run in a profile directory created outside `dsh plugin` still gets the recovery, which matches the runner's purpose. Bundled `node` and `pnpm` still precede a user-installed Node.js in agent shells, so a project pinned to another Node major sees Node 24 unless the user's shell configuration reorders `PATH`.
