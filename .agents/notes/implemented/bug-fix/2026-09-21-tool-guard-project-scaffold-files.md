# Agent Note: Tool guard allows the web project's root scaffold files

Status: implemented

## Problem

`dsh-tool-guard` confined builders to `src/` and `public/`, and the principal agent to process artifacts, its fast-fix window, `.scripts/`, and a list of manifest and deploy files. A Vite app also needs `index.html` and `vite.config.*` at the project root, and the pipeline's own skills require more root files: `/shadcn-ui` writes `components.json`, and `/tailwind-patterns` needs the Tailwind config. No agent could create any of them, so scaffolding a web app failed with "Blocked: the principal agent writes only …" and the `/07-build` builders could not do it either. The skills also described the guard as allowing only `mds/` and `prototype/`, which was already out of date.

## Decision

`PROJECT_SCAFFOLD_FILES` (`index.html`, `vite.config.*`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `eslint.config.*`, `components.json`) is writable at the workspace root by the principal and by builders. `TEST_RUNNER_FILES` (`vitest.config.*`, `playwright.config.*`) is writable by the principal and by qa. Both match only files directly at the root, like the existing root config list. Builders still cannot write `package.json` or `tsconfig*.json`, which stay with the principal. `00-start-here`, `07-build`, and the plugin README state the current surfaces. The package's `test` script names its test file, because `node --test test/` treats the folder as a module on Node 22.

## Alternatives considered

**Let builders write any root file.** Rejected: the manifest and deploy configs decide what installs and where it deploys, and the existing rule keeps them with the principal on purpose.

**Move the Vite entry under `src/`.** Rejected: `index.html` at the project root is Vite's convention, and `components.json` and the Tailwind config are located by their tools at the root.

## Consequences

- An agent can scaffold a Vite + Tailwind + shadcn/ui app without a human editing files by hand.
- A new stack that needs another root file (for example `astro.config.*`) is still refused until it is added to the list.
