---
name: fixing-accessibility
description: Make interfaces usable by keyboard, screen reader and low-vision users — accessible names, keyboard access, focus and dialogs, semantics, form errors, announcements, contrast, and motion that respects reduced-motion — and audit a file with quoted violations and minimal fixes.
whenToUse: Whenever buttons, links, inputs, menus, dialogs, tabs, forms, icon-only controls, hover interactions or animations are added or changed in the prototype or the React app, and when the /07-build evaluator checks a UI ticket. Pass a file path to get a review.
---

# Fixing accessibility

Accessibility is part of done, not a later pass. shadcn/ui's Radix primitives (`/shadcn-ui`) already solve focus trapping, roving focus and ARIA for their widgets — use them instead of rebuilding behavior, and do not break what they provide.

## Modes

- **Apply** (no argument): follow these rules in the UI work of this conversation.
- **Review** (`fixing-accessibility <file>`): report each violation as the quoted snippet, why it matters in one sentence, and a small code-level fix. Critical first. Prefer minimal, targeted fixes; do not rewrite unrelated UI or migrate libraries.

## Rules by priority

### 1. Accessible names (critical)
- Every interactive control has an accessible name.
- Icon-only buttons have `aria-label` (in the requester's language); the icon is `aria-hidden`.
- Every `input`, `select` and `textarea` has a `<label>` (a placeholder is not a label).
- Links say where they go — never "click here" or "saiba mais" alone.
- Decorative icons and images are `aria-hidden` / `alt=""`.

### 2. Keyboard access (critical)
- No `div` or `span` acting as a button or link; use `<button>` and `<a href>`.
- Everything interactive is reachable by Tab in visual order.
- Focus is always visible: `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.
- No `tabindex` greater than 0.
- Escape closes dialogs, sheets, popovers and menus.
- Custom shortcuts do not override browser or screen-reader keys, and have a visible alternative.

### 3. Focus and dialogs (critical)
- Modals trap focus while open, set initial focus inside, and restore focus to the trigger on close (shadcn `Dialog`, `Sheet`, `AlertDialog` do this — do not remove their `Title`/`Description`; hide them visually with `sr-only` if needed).
- Opening an overlay does not scroll the page unexpectedly.
- After navigation or a screen switch, move focus to the new screen's heading (`tabIndex={-1}` on the `h1`) so keyboard and screen-reader users land in the new content.

### 4. Semantics (high)
- Native elements before roles; a role brings its required ARIA attributes.
- Landmarks: one `main`, `header`, `nav` with `aria-label` when there are several.
- Lists use `ul`/`ol` + `li`; headings do not skip levels; tables use `th` with `scope`.

### 5. Forms and errors (high)
- Errors are linked with `aria-describedby` and fields set `aria-invalid="true"`.
- Required fields are announced (`required` / `aria-required`) and marked visibly.
- Helper text is associated with its input.
- A disabled submit explains why; better, keep it enabled and show the errors on submit.
- On failed submit, focus the first invalid field.

### 6. Announcements (medium-high)
- Critical form errors and async results use `aria-live="polite"` (or `role="alert"` for urgent errors).
- Loading regions set `aria-busy="true"` or render status text.
- Toasts are never the only place critical information appears.
- Expandable controls use `aria-expanded` and `aria-controls`.

### 7. Contrast and states (medium)
- Text 4.5:1, large text and UI boundaries 3:1 — the palette's measured pairs (`/ui-palette`). Text over images or gradients gets a scrim that keeps the ratio.
- Hover-only interactions have keyboard and touch equivalents.
- Disabled, selected, error and success states do not rely on color alone (icon, text or shape too).
- Never remove focus outlines without a visible replacement.
- Touch targets at least 44×44px.

### 8. Media and motion (medium)
Pages animate in this flow (`/frontend-design`); animation must stay accessible:
- `prefers-reduced-motion: reduce` replaces movement with short opacity fades — `MotionConfig reducedMotion="user"` in React, a `matchMedia` check in the prototype. Content and state changes remain.
- Entering content is never `aria-hidden` or `inert` while it animates, and never blocks pointer or keyboard input.
- No flashing more than three times per second; no parallax or auto-motion that cannot be paused beyond five seconds.
- Images have meaningful alt text or `alt=""`; videos with speech have captions; no autoplaying sound.

### 9. Tool boundaries (critical)
- Minimal changes; do not refactor unrelated code.
- Do not add ARIA when native semantics already solve it.
- Do not migrate UI libraries unless requested.

## Common fixes

```tsx
// icon-only button
<Button size="icon" aria-label="Fechar"><X aria-hidden /></Button>

// div as button → native element
<button type="button" onClick={save}>Salvar</button>

// field error
<Input id="email" aria-invalid={!!error} aria-describedby={error ? 'email-error' : undefined} />
{error ? <p id="email-error" className="text-sm text-destructive">{error}</p> : null}

// async region
<section aria-busy={isPending} aria-live="polite">…</section>
```

## Review guidance

- Fix critical issues first: names, keyboard, focus, reduced motion, tool boundaries.
- Prefer native HTML before ARIA, and shadcn/Radix primitives before custom widgets (menu, dialog, combobox, tabs).
- Quote the exact snippet, state the failure, propose the smallest fix.

_Adapted from the community `fixing-accessibility` skill._
