---
name: shadcn-ui
description: Build React UI from shadcn/ui components installed with the shadcn CLI — create or initialize the project, search the registry, read component docs, add components — instead of hand-writing buttons, dialogs, forms, tables, menus or other standard UI.
whenToUse: Whenever work creates or changes UI in a React + Tailwind project (Vite, Next.js, React Router, TanStack Start, Astro, Laravel), and when /04-tech-plan chooses the frontend stack. Not for the CDN-only HTML prototype of /03-prototype.
---

# shadcn/ui

Standard UI comes from shadcn/ui. A hand-written button, dialog, form field, table, tabs, menu, toast, sheet or card is a defect when a shadcn component covers it. shadcn copies component source into the project, so the result is ordinary code the builder owns and may adapt.

## Toolchain

- Run the CLI as `pnpm dlx shadcn@latest <command>`. `npx` and `npm` are not available in this dsh; `pnpm` and `node` are.
- The shell is non-interactive. Any choice left to a prompt makes the command print a menu and **exit 0 without doing anything**. Pass every choice as a flag and confirm the result on disk, never by exit code.
- `-c <dir>` runs a command against another directory.

## 1. Find or create the project

`components.json` at the project root means shadcn is already set up: go to step 2.

**New project** — one command creates it, installs dependencies with pnpm and adds `button`:

```sh
pnpm dlx shadcn@latest init -y -t vite -n <name> -b radix -p nova --no-monorepo
```

- `-t`: `vite`, `next`, `start`, `react-router`, `astro`, `laravel` — take it from `/04-tech-plan`; `vite` for a plain SPA.
- `-b`: component base, `radix` unless the plan says `base` or `aria`.
- `-p`: preset (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`), `nova` unless the plan names another. **Omitting it is the silent no-op above.**

**Existing React + Tailwind project without `components.json`** — run `init` inside it with `-y -b <base> -p <preset>`.

After `init`, `components.json` must exist and `pnpm run build` must pass. If either fails, stop and report the output; do not hand-write the components instead.

## 2. Know what is there

- `pnpm dlx shadcn@latest info` — framework, Tailwind version, aliases, base and style.
- The `ui` alias in `components.json` (usually `src/components/ui/`) lists the components already installed. Reuse them before adding.

## 3. Choose the component

- `pnpm dlx shadcn@latest search @shadcn -q <term>` — items with their type (`ui`, `block`, `example`). `-t ui,block` filters.
- `pnpm dlx shadcn@latest docs <component>` — docs and example links for the project's base. `web_fetch` the example when composition is unclear.
- `pnpm dlx shadcn@latest view @shadcn/<item>` — the item's files before adding.

Prefer a `block` (login form, sidebar, dashboard section) when one matches a whole screen region, then adapt it.

## 4. Add

```sh
pnpm dlx shadcn@latest add -y dialog card form
```

- Existing files are skipped, never replaced. `--overwrite` is forbidden on a component the project has changed; preview with `add <component> --diff` first.
- Dependencies install with the project's package manager. A project with `package-lock.json` needs npm, which is absent: report it instead of switching the project to pnpm.

## Rules

- Import through the project alias (`@/components/ui/dialog`), never from a package path.
- Compose shadcn primitives. A custom component is allowed only when no shadcn item covers the need; say which need, in the ticket report.
- Style with the theme's CSS variables and Tailwind utilities created by `init`; no hard-coded colors, no second component library.
- Keep the prototype's frozen UX: shadcn decides how a control is built, not which screens, fields or flows exist.
- Done means the component is in the `ui` directory, used by the screen, `pnpm run build` passes, and a real-browser screenshot shows it.
