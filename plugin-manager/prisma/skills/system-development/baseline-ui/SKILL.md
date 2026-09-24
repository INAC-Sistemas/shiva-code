---
name: baseline-ui
description: Enforce the UI baseline that separates finished interfaces from AI-generated slop in Tailwind projects — stack, component, interaction, motion, typography, layout, performance and design constraints — and review a file against them with quoted violations and concrete fixes.
whenToUse: Whenever UI code is written or reviewed in the /03-prototype HTML or a React + Tailwind app, when /07-build briefs a UI ticket, and when the evaluator checks one. Pass a file path to get a review instead of applying the constraints.
---

# Baseline UI

An opinionated floor for every interface. It does not choose the look — `/frontend-design` does, inside the palette of `/ui-palette` — it rejects the details that make a screen feel unfinished. MUST and NEVER are defects when broken; SHOULD needs a stated reason to skip.

## Modes

- **Apply** (no argument): follow every constraint below in the UI work of this conversation.
- **Review** (`baseline-ui <file>`): read the file and report each violation as
  - the exact line or snippet, quoted,
  - why it matters, in one sentence,
  - the code-level fix.

  Report MUST/NEVER violations first. Do not rewrite unrelated code.

## Stack

- MUST build standard controls from shadcn/ui (`/shadcn-ui`) in the React app, and shadcn-style patterns on Tailwind in the CDN prototype.
- MUST take icons from the project's pack (`/ui-icons`) and every color from palette roles (`/ui-palette`).
- MUST use the `cn` utility (`clsx` + `tailwind-merge`, created by `shadcn init`) for conditional classes.
- MUST use `motion` (`motion/react`) for JavaScript-driven animation in React, and Motion's CDN build in the prototype. SHOULD use `tw-animate-css` classes (`animate-in fade-in slide-in-from-bottom-4`) for simple entrances and overlay transitions.
- NEVER add a second component, animation or icon library beside the ones above.

## Components

- MUST use accessible primitives for anything with keyboard or focus behavior — the Radix (or Base UI / React Aria, per the shadcn base in `04-tech-plan.md`) primitives behind shadcn. NEVER mix primitive systems within one interaction surface.
- MUST use the project's existing components before adding new ones.
- MUST give icon-only buttons an `aria-label`.
- NEVER rebuild keyboard or focus behavior by hand unless explicitly requested.

## Interaction

- MUST use an `AlertDialog` for destructive or irreversible actions.
- MUST show errors next to where the action happens.
- SHOULD use structural skeletons for loading states (`/react-ui-patterns`).
- MUST give every interactive element a visible hover, `focus-visible` and active state.
- NEVER use `h-screen`; use `h-dvh`.
- MUST respect `safe-area-inset` for fixed elements.
- NEVER block paste in `input` or `textarea`.

## Motion

Pages animate. The motion language and tokens come from `03-design.md` (`/frontend-design` section 3).

- MUST give every screen an entrance sequence on first view and a scroll reveal for sections below the fold.
- MUST give every interactive element hover/press feedback within `--duration-fast` (100–200ms). NEVER exceed 200ms for interaction feedback.
- MUST transition state changes (overlays, tabs, accordions, list insert/remove, toasts, screen switches) within `--duration-base`; exits SHOULD be faster than entrances.
- MUST use the motion tokens (`--duration-*`, `--ease-*`, `--stagger`); NEVER hard-code an unrelated duration or easing curve in a component.
- SHOULD use `ease-out` curves for entrances and `ease-in` for exits.
- MUST animate only compositor properties (`transform`, `opacity`) on anything larger than a small, isolated element. NEVER animate `width`, `height`, `top`, `left`, `margin` or `padding` on layout surfaces; use `transform` or FLIP (`/fixing-motion-performance`).
- MUST honor `prefers-reduced-motion`: keep short opacity fades, drop translate, scale, parallax and auto-playing sequences. NEVER hide content or state changes under reduced motion.
- MUST keep content visible when scripts fail and NEVER block input while an animation runs.
- MUST pause looping animations when off-screen; NEVER loop decoration except a subtle ambient background.

## Typography

- MUST use `text-balance` on headings and `text-pretty` on body paragraphs.
- MUST use `tabular-nums` for numbers in tables, counters and KPIs.
- SHOULD use `truncate` or `line-clamp-*` in dense UI.
- MUST take fonts, the type scale and tracking from `03-design.md`. Letter-spacing (`tracking-*`) changes only through those rules (display headings, uppercase labels), NEVER ad hoc.

## Layout

- MUST use a fixed `z-index` scale (e.g. 10 dropdown, 20 sticky, 30 overlay, 40 modal, 50 toast); NEVER arbitrary `z-[…]`.
- SHOULD use `size-*` for square elements instead of `w-*` + `h-*`.
- MUST keep one max content width per product and account for fixed headers (no content hidden behind them).
- MUST work at 375px, 768px, 1024px and 1440px with no horizontal scroll.

## Performance

- NEVER animate a large `blur()` or `backdrop-filter` surface.
- NEVER apply `will-change` outside an active animation.
- NEVER use `useEffect` for anything expressible as render logic.

## Design

- NEVER use a color outside the palette roles — no hex, `rgb()`, `oklch()` literal or default Tailwind color in components.
- SHOULD use gradients, glows and textures only as the direction in `03-design.md` defines them, built from palette roles (`from-primary/15 to-accent/10`). NEVER use rainbow or multi-hue gradients the palette does not contain, and NEVER make a glow the only affordance of a control.
- SHOULD limit accent color to one purpose per view.
- SHOULD use a consistent shadow scale with a single light direction.
- MUST give every empty state one clear next action.

_Adapted from the community `baseline-ui` skill._
