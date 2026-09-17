---
name: tailwind-patterns
description: Write Tailwind the way this flow ships it — v3.4 Play CDN configured by prototype/theme.js in the prototype, v4 CSS-first @theme in the React app — with palette role colors, design-direction fonts, motion tokens and keyframes, container queries, responsive and dark-mode patterns, and no arbitrary-value sprawl.
whenToUse: Whenever Tailwind classes, theme CSS, tokens, keyframes or responsive layout are written or reviewed in the /03-prototype HTML or a React + Tailwind app, and when /07-build briefs a UI ticket that touches styling or the theme file.
---

# Tailwind patterns

Two Tailwind versions exist in this flow. Know which one a file uses before writing a class.

| | Prototype (`prototype/*.html`) | React app |
|---|---|---|
| Version | v3.4, Play CDN `https://cdn.tailwindcss.com` | v4, installed by `shadcn init` |
| Config | `tailwind.config` set in `prototype/theme.js` (`/ui-palette` section 6) | CSS-first: `@theme` / `@theme inline` in the theme CSS (`src/index.css`, `app/globals.css`) |
| Colors | `rgb(var(--role) / <alpha-value>)` channels | `:root` / `.dark` variables mapped with `--color-<role>: var(--<role>)` |
| Animation helpers | CSS keyframes in the page + Motion CDN | `tw-animate-css` (imported by `shadcn init`) + `motion` |

`pnpm dlx shadcn@latest info` prints the app's Tailwind version. A `tailwind.config.js` in a v4 project is legacy; do not add one.

## 1. Tokens (v4 app)

Colors come only from `03-palette.md` (`/ui-palette` section 7). Fonts, radii, motion come from `03-design.md` (`/frontend-design`). Put them in the theme CSS once:

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 550ms;
  --stagger: 60ms;
}

@theme inline {
  --color-primary: var(--primary);          /* …every palette role… */
  --font-display: "Fraunces", serif;        /* from 03-design.md */
  --font-sans: "Manrope", sans-serif;
}

@theme {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --animate-enter: enter var(--duration-slow) var(--ease-out) both;
  --animate-shimmer: shimmer 1.6s linear infinite;

  @keyframes enter {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes shimmer {
    to { background-position: -200% 0; }
  }
}
```

This yields `font-display`, `ease-out`, `animate-enter`, `animate-shimmer`, `bg-primary`. Semantic token names only (`primary`, `surface`, `display`), never `blue-500`-style primitives in components.

Fonts load with `@fontsource` packages (`pnpm add @fontsource-variable/manrope`, imported once in the entry file) or a Google Fonts `<link>` in `index.html` with `display=swap` and `preconnect`.

## 2. Tokens (v3 prototype)

`theme.js` owns colors. After it runs, add fonts, easing and keyframes to the same `tailwind.config` extend, and the motion variables to a `<style>` block:

```js
if (window.tailwind) tailwind.config.theme.extend = {
  ...tailwind.config.theme.extend,
  fontFamily: { display: ['Fraunces', 'serif'], sans: ['Manrope', 'sans-serif'] },
  transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  keyframes: { enter: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } } },
  animation: { enter: 'enter 550ms cubic-bezier(0.22, 1, 0.36, 1) both' },
};
```

Load fonts with a Google Fonts `<link>` in each page head.

## 3. Motion utilities

- Durations and curves reference the tokens: `duration-[var(--duration-fast)] ease-out` (v4 `ease-out` is the token above).
- Transition only what changes: `transition-[transform,opacity]`, `transition-colors`, `transition-shadow`. NEVER `transition-all`.
- Feedback: `hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 ring-ring`.
- Entrance with `tw-animate-css` (v4): `animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both`, staggered with `delay-[60ms]`, `delay-[120ms]`…; or the `animate-enter` token with `[animation-delay:120ms]`.
- Entry transitions on mount without JS (v4): `transition-[opacity,translate] starting:opacity-0 starting:translate-y-4`.
- Overlays: shadcn's `data-[state=open]:animate-in data-[state=closed]:animate-out` classes; retune with `duration-[var(--duration-base)]`.
- Scroll-driven (Chromium, Safari 26+; provide a fallback or use Motion): `[animation-timeline:view()] [animation-range:entry_0%_cover_30%] animate-enter`.
- Reduced motion: `motion-safe:animate-enter`, `motion-reduce:transition-none motion-reduce:transform-none`; keep opacity changes.
- Skeleton shimmer: `bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer` (v3: define `shimmer` in the config), or `animate-pulse`.

## 4. Responsive and container queries

- Mobile-first: unprefixed classes for small screens, then `sm: md: lg: xl: 2xl:` (640/768/1024/1280/1536px).
- Page layout responds to the viewport; reusable components respond to their container: `@container` on the parent, `@md:grid-cols-2` on children (v4 native; v3 CDN needs the container-queries plugin — use viewport breakpoints in the prototype).
- Check 375, 768, 1024 and 1440px; no horizontal scroll.

## 5. Layout patterns

| Pattern | Classes |
|---|---|
| Center | `grid place-items-center` |
| Stack | `flex flex-col gap-4` |
| Auto-fit grid | `grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6` |
| Bento | `grid grid-cols-6 auto-rows-[10rem] gap-4` with `col-span-4 row-span-2` / `col-span-2` children |
| Sidebar | `grid grid-cols-[auto_1fr]` |
| Full-height section | `min-h-dvh` (never `h-screen`) |
| Readable text | `max-w-prose` or `max-w-[65ch]` |

Prefer asymmetric and bento compositions over three equal columns when the direction allows (`/frontend-design`).

## 6. Dark mode

- Both versions use the `dark` class on `<html>` (`darkMode: 'class'` in v3; shadcn's `@custom-variant dark (&:is(.dark *))` in v4).
- Palette roles already switch between light and dark values, so components use `bg-background text-foreground` without `dark:` pairs. `dark:` is for a deliberate difference (a stronger shadow, an image swap), never for colors the palette covers.

## 7. Class hygiene

| Don't | Do |
|---|---|
| Arbitrary values everywhere (`p-[13px]`) | The spacing and type scale; arbitrary values only for tokens (`duration-[var(--duration-fast)]`) or one-off geometry |
| Dynamic class strings (`bg-${color}-500`) | Full literal class names chosen by a map or `cn()` |
| `!important`, inline `style=` | Fix specificity; utilities |
| Same long class list 3+ times | Extract a component; `@apply` only for base element styles |
| Default Tailwind colors (`bg-blue-600`) | Palette roles (`bg-primary`) |
| `transition-all` | The specific properties |

_Adapted from the community `tailwind-patterns` skill._
