---
name: ui-transitions
description: Ready-made, portable CSS transitions for the common UI patterns — dropdown, modal, panel, page slide, toast, accordion, tabs, tooltip, badge, skeleton, success check, error shake, toggle, checkbox and the rest — pulled from the transitions.dev library through its own installer, plus the motion-token scale and the rules that keep a pasted transition correct. Use when a component matches a known pattern and you are about to hand-roll its motion.
whenToUse: Inside /03-prototype when a screen contains a known pattern, and in /08-review when auditing or refining motion that already exists.
---

# Ready-made transitions

Do not hand-roll a dropdown, a modal, a toast, an accordion or a toggle when a tuned, portable implementation already exists. This skill is the bridge to the **transitions.dev** library. It is **not vendored in this repository** (the upstream project grants no license), so it is pulled through its own distribution channels and the rules below are ours.

## Installing — through the library's own channels

- Whole set (thirty-two references + the root CSS): `npx skills add Jakubantalik/transitions.dev`
- One transition: `npx transitions-dev add <name>` · every free one: `npx transitions-dev add --free` · list: `npx transitions-dev list`

Never copy the library's files into this repository. Install into the project, or paste the snippet the CLI/site emits.

## The motion-token scale (the vocabulary to reuse)

Adopt these tokens instead of ad-hoc numbers — the snippets read from them. **Map by usage, not by nearest number**: a 300ms modal close is `--duration-quick` (150ms) because both are "modal close", even though the numbers differ.

| Duration | Value | Usage |
|---|---|---|
| `--duration-stagger` | 40ms | per-item stagger offset |
| `--duration-micro` | 80ms | path delay, shake segment, large stagger |
| `--duration-quick` | 150ms | modal/dropdown close, text swap, tooltip appear |
| `--duration-fast` | 250ms | icon swap, dropdown/modal open, tabs, page slide |
| `--duration-medium` | 350ms | panel close, toast close |
| `--duration-slow` | 400ms | panel open, skeleton reveal, input clear |
| `--duration-very-slow` | 500ms | badge appear, text reveal, success check |

| Easing | Value | Usage |
|---|---|---|
| `--ease-smooth-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | open/close, page slide, resize, position change |
| `--ease-in-out` | `ease-in-out` | icon swap, text swap, text reveal, skeleton reveal |
| `--ease-out` | `ease-out` | tooltip open/close |
| `--ease-linear` | `linear` | shimmer, skeleton pulse, spinner |
| `--ease-bounce` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | badge pop |
| `--ease-bounce-strong` | `cubic-bezier(0.34, 3.85, 0.64, 1)` | bouncy hover-out |

**Distances**: 4px micro (text swap) · 6px small (shake) · 8px base (badge, page slide) · 12px medium (text reveal) · 30px large (check badge).
**Scales**: 0.96 modal · 0.97 dropdown · 0.98 tooltip · 0.99 dropdown close.
**Blurs**: 2px (swap/reveal) · 3px (page slide, text reveal) · 8px (success check).

These sit alongside `/ui-motion`: its rules still govern (frequency gate, purpose, transform/opacity, exits faster, reduced motion). The token scale replaces invented numbers; it does not replace the decisions.

## Rules when applying one

1. **Install the root variable block once.** If it is already imported, do not duplicate it — paste only the per-snippet `:root` when installing a single transition.
2. **Paste the snippet as shipped.** Do not collapse it into a shorthand, rewrite selectors, or strip `will-change`.
3. **Wire the documented hooks**: the `t-*` class names and the state attributes (`data-open`, `data-state`, `data-page`, `aria-expanded`, `aria-selected`, `is-open`, `is-closing`, `is-error`, `is-shaking`, `has-value`, `is-revealed`, …).
4. **Keep the `@media (prefers-reduced-motion: reduce)` block.** Removing it fails the accessibility bar of `/ui-motion`.
5. **JS-driven ones ship orchestration**: dropdown, modal, text swap, number pop-in, page slide, success check, avatar group, error shake, input clear, skeleton reveal, tabs, tooltip, texts reveal, tilt, plus→menu morph, accordion. Adapt the selectors and keep the `getComputedStyle` reads so timing stays in sync with the tokens.
6. **Keep the diff small**: only the files the transition needs; no motion library, no renaming the project's variables.

## Traps that break a pasted transition

- **Close-state cleanup**: without removing the closing class after its timer, the next open starts from the closing scale.
- **Replay needs a reflow**: `void el.offsetWidth` between removing and re-adding the state class, or the animation does not replay.
- **Animate the inner pieces**, not the container — the badge dot, the page sections.
- **Never `transition: all`**: the snippets enumerate properties on purpose.
- **SVG draw**: set `stroke-dasharray` from `path.getTotalLength()` (+1), never a hardcoded number.
- **Chevron flip over path morph**: animating the `d` attribute is Chromium-only — flip with `transform: scaleY(-1)` (works everywhere, passes through a flat line at the midpoint).
- **Pointer tracking belongs on the flat wrapper**, not the rotating card, or the hover flickers.
- **Padding goes on the accordion's inner panel**, never the `0fr` track, or the panel never closes fully.

## Our commands (mapped onto the library's verbs)

- **`transitions reveal`** — list the catalogue (use the library's own list; invent nothing).
- **`transitions review`** — scan the workspace for `transition:`/`animation`/`@keyframes`/hardcoded durations and suggest the best-fit transition per site: match the visible element first, then the verb; prefer the lower-overhead option (resize over panel, dropdown over modal). No edits — the list is the deliverable.
- **`transitions apply <name>`** — install the chosen transition following the six rules above, then measure it with `/ui-motion` and report the numbers.
- **`transitions refine`** — replace ad-hoc durations/easings with the tokens, **matching by usage**; a value whose usage matches no token is listed as "no matching token usage" and left untouched. Never force a swap because a number is close.

## Where this fits

- **`/03-prototype`** — a screen containing a known pattern (dropdown, modal, toast, accordion, tabs, tooltip, badge, skeleton, success check, error shake) uses the library instead of a hand-rolled animation; the craft gate of `/ui-craft` + `/ui-mobile` + `/ui-motion` still runs before the screen is shown.
- **`/08-review`** — `transitions review` feeds the motion inventory and `transitions refine` is the token pass; both end up in the `| Antes | Depois | Porquê |` table, with anything unverifiable declared.
