---
name: ui-icons
description: Take every application icon from Lucide, or from Tabler when Lucide has no glyph — install the package with pnpm, import by name, and never hand-write an SVG, ship an emoji as an icon, or add a third icon pack.
whenToUse: Whenever work adds or changes an icon in a UI — buttons, navigation, empty states, menus, status, form fields — in the React app or in the /03-prototype HTML. Also when /04-tech-plan records the frontend stack and when /07-build briefs a UI ticket.
---

# UI icons

Icons come from **Lucide** first, **Tabler** second. A hand-drawn `<svg>`, an emoji standing in for an icon, an icon font of your own, or a third pack (Heroicons, Font Awesome, Material, Bootstrap Icons) is a defect when a Lucide or Tabler glyph covers the need. Both packs are MIT, stroke-based and visually compatible with shadcn/ui, which is why they are the two.

## Choose the pack, once

1. **A pack is already in the project** — `grep` `package.json` for `lucide-react` and `@tabler/icons-react` before installing anything. Whichever is there is the project's pack; use it and do not add the other.
2. **Nothing installed** — Lucide.
3. **Tabler** only when Lucide has no glyph for the meaning (Tabler carries far more, notably brand, finance and device glyphs), or a requester constraint names it. Both may coexist in one project **only** in that case, and the ticket report says which screen needed the Tabler glyph.

Never search for a glyph by guessing an export name. Read the pack's catalog: [lucide.dev/icons](https://lucide.dev/icons) and [tabler.io/icons](https://tabler.io/icons), with `web_fetch` when a name is uncertain. An import that does not exist is a build error, not a missing feature.

## Install (React project)

Only a builder subagent installs — `dsh-tool-guard` denies the principal's writes outside `mds/` and `prototype/`.

```sh
pnpm add lucide-react        # default
pnpm add @tabler/icons-react # only under rule 3 above
```

- `npx` and `npm` do not exist in this dsh; `pnpm` and `node` do, bundled with the app. Both packages are plain ESM with no build script, so pnpm's build-script approval never applies.
- Already in `package.json`? Do not install again.
- The project has a `package-lock.json`? It needs npm, which is absent: **report it** instead of switching the project to pnpm.
- `shadcn` may have already installed `lucide-react` as a component dependency. Check before adding it a second time.
- Confirm the result on disk — the dependency in `package.json` and `pnpm run build` passing. An exit code alone is not proof.

## Use (React)

```tsx
import { Search, Trash2 } from "lucide-react";      // Lucide: the plain noun
import { IconBrandGithub } from "@tabler/icons-react"; // Tabler: every export is Icon-prefixed

<Search className="size-4" aria-hidden />
<IconBrandGithub size={16} stroke={1.5} aria-hidden />
```

- Import named exports from the package root. A deep path into `dist/` breaks on the next release and defeats tree-shaking; `import * as Icons` pulls the whole pack into the bundle.
- Size with the project's Tailwind scale (`size-4`, `size-5`) rather than hard-coded pixels, so an icon tracks its control. Color with `currentColor` through the text color — never a literal hex.
- Stroke width follows the pack default (Lucide `2`, Tabler `2`); change it only for a whole surface, never per icon.
- An icon that only decorates a labelled control is `aria-hidden`. An icon-only control carries `aria-label` — an unlabelled icon button is inaccessible and is a defect.

## Use (the /03-prototype HTML)

The prototype is CDN-only: **no install, no `package.json`**.

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="search"></i>
<script>
  if (window.lucide) lucide.createIcons();
</script>
```

- `data-lucide` takes the kebab-case name (`trash-2`), not the React export.
- Call `lucide.createIcons()` again after any render that injects markup, or the new nodes stay empty.
- Guard the global like every other prototype CDN (`if (window.lucide)`), with visible text as the fallback.
- Tabler in the prototype is the webfont, under the same rule 3: `<link rel="stylesheet" href="https://unpkg.com/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">` then `<i class="ti ti-brand-github"></i>`.
- Illustrations, avatars and hero art are not icons: those come from `generate_image` into `assets/`.

## Done

The icon renders from Lucide or Tabler, imported by name, `pnpm run build` passes, and a real-browser screenshot shows the screen. A hand-written SVG or an emoji-as-icon that either pack covers is RED at evaluation.
