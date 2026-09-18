---
name: ui-craft
description: The visual craft bar — a spacing and type scale instead of magic numbers, the five states of every interactive element (default, hover, focus-visible, active, disabled), the four states of every data screen (loading, empty, with data, error), visible focus, contrast, colour never carrying meaning alone, and mocks that are declared instead of disguised. Use when building or reviewing any screen's layout, density, typography, spacing, colour or states.
whenToUse: When building or reviewing a screen — first of the three craft bars, before /ui-mobile and /ui-motion.
---

# Visual craft

The ruler is the ceiling. A skill that does not name a thing as wrong makes that thing the default — an agent will build a dry empty state, a hand-picked spacing, a fake map that looks real, because nothing said not to. Only what is explicit and verifiable here elevates what gets delivered. Read `/00-start-here` first.

Derived from Emil Kowalski's design-engineering philosophy (MIT), extended with the states and scales a screen needs.

## 1. Scales, not magic numbers

Define the scale once, at the top of the stylesheet, and take every value from it. A screen with numbers chosen by eye per element is the visible signature of an agent that did not decide anything.

```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
  --text-xs: 12px; --text-sm: 14px; --text-base: 16px; --text-lg: 20px;
  --text-xl: 24px; --text-2xl: 32px; --text-3xl: 40px;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-full: 999px;
}
```

- Spacing comes from `--space-*`; type from `--text-*` with its line-height (body 1.5, headings 1.1–1.25).
- One accent colour plus neutrals; semantic colours (success/warning/danger) used only for their meaning.
- Density is a decision, not an accident: a data-dense screen uses the small steps consistently, a marketing surface the large ones.
- A new value that is not on the scale means the scale is missing a step — add it there, never inline.

## 2. The five states of every interactive element

Every button, link, input, tab, card-with-action and menu item has five states, and **none of them may be invisible**:

| State | Must show |
|---|---|
| default | The resting look — readable, tappable, obviously interactive |
| hover | A change of surface or elevation (gated behind `@media (hover: hover) and (pointer: fine)`, see `/ui-mobile`) |
| focus-visible | A visible ring — keyboard users must see where they are (`:focus-visible`, never removed) |
| active | Press feedback on `:active` (see `/ui-motion` — this is the same item, not a second one) |
| disabled | Clearly not available, **and still legible** — dimming to illegibility hides the label that explains why |

- Loading is a sixth, per-element state when the action is asynchronous: the control shows progress and refuses a second activation.
- An input's states include invalid and its error message — an error that only changes the border colour is invisible to a screen reader and to colour-blind users.

## 3. The four states of every screen that lists data

A list screen is not done when the happy path renders. All four exist, and each one is designed:

| State | Rule |
|---|---|
| loading | Shows the **shape** of what is coming (skeleton rows, a spinner in the content area) — never a blank page and never a spinner that replaces the layout |
| empty | Says **what happened** and **what to do next**, with the action that fixes it ("Você ainda não tem entregas. Toque em Nova entrega para criar a primeira.") — never a bare "Nenhum item." |
| with data | The real content, with its own ordering and overflow behaviour (long text truncates or wraps deliberately) |
| error | Says what failed, keeps what the user typed, and offers the retry — never a silent empty list that looks like "no data" |

- An empty state is a design surface, not a placeholder: it is the first screen a new user sees.
- The same four states apply to a single-value panel (a total, a status) — `—` with a reason beats a blank.

## 4. Mocks are declared, never disguised

A mock that looks real is a defect: the owner cannot tell a working feature from a placeholder, and approves what does not exist.

- When the screen's value **is** the artefact — a map, a chart, a photo, a rich editor — use a real library (CDNs are allowed in the prototype) instead of a decorative fake.
- When a mock is unavoidable, it is **labelled where it shows**: "dados de exemplo", a subtle badge, or the value clearly marked as illustrative.
- In the prototype, mocked data is expected — disguised mocked data is not. The frozen contract must say which parts were mocks, so the next stage replaces them instead of shipping them.

## 5. Focus, contrast, colour

- `:focus-visible` always visible on every interactive element; never `outline: none` without a replacement.
- Text contrast at least 4.5:1 (3:1 for large text and UI borders); check the real values, do not eyeball them.
- **Colour never carries meaning alone** — status needs an icon or a word next to it; a chart needs labels or patterns.
- The layout survives 200% zoom and a long translation: no fixed heights around text, no truncation that hides the action.

## 6. Never ship (self-check — run it before saying done)

| Never | Instead | How to detect |
|---|---|---|
| Spacing/type values invented per element | Take from the scale | Grep for `px` values not in `:root` |
| A control with no `:active` feedback | `:active` state on every pressable | Look for `:active` next to each interactive class |
| `outline: none` with no replacement | `:focus-visible` ring | Grep `outline:\s*none` |
| A bare "Nenhum item." empty state | What happened + the action | Read every empty branch |
| A blank or layout-breaking loading state | Skeleton with the content's shape | Trigger the loading path |
| Disabled state that hides the label | Dim but legible | Screenshot the disabled control |
| A mock that looks real | Real library, or labelled as sample | List every mocked value on the screen |
| Colour as the only signal | Icon/word alongside | Greyscale the screenshot and re-read it |
| A clickable `div` | `button`/`a` with the right role | Grep `onClick` on non-interactive tags |
| Fixed height around text | `min-height` + padding | Zoom to 200% |

## Output

The code is the deliverable. Then, in at most a few lines: which states were designed (the five, the four), which values came from the scale, and what only a human can judge (density, tone, whether the empty state actually orients a new user) — prioritising at most 1–3 items for the human's attention, the ones that change perception the most.
