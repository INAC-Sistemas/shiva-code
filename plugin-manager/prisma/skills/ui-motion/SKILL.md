---
name: ui-motion
description: The motion craft bar — decide whether something should animate at all, name the purpose, pick the cheapest tool, animate only transform/opacity, take the curve and duration from the tables (or a spring), handle interruption and exit, and ship reduced-motion plus hover gating together with the animation. Use when adding or fixing any motion, transition, press or hover feedback, entrance or exit in UI.
whenToUse: When building or fixing motion in a prototype or in product code; when a defect is about feel, timing, or a transition.
---

# Motion craft

A quality bar, not a menu. Derived from Emil Kowalski's design-engineering philosophy (MIT). Read `/00-start-here` first. Apply it while building — the whole point is to write motion that passes review the first time.

Two failure modes, and the first is worse: animating something that should not animate at all, and animating the right thing with the wrong ingredients (`ease-in` on an entrance, `scale(0)`, keyframes on a toast).

## The build sequence (in order — steps 1 and 2 gate everything)

1. **Should it animate?** By how often the user sees it:

| Frequency | Decision |
|---|---|
| 100+/day (keyboard shortcut, command palette, tab switch) | **No animation, ever.** Stop here. |
| Tens/day (hover, list navigation) | Near-imperceptible or nothing |
| Occasional (modal, drawer, toast) | Standard animation |
| Rare / first time (onboarding, success) | The delight budget lives here |

A keyboard-initiated action is a disqualifier, not a judgement call. If the request fails this gate, say so and ship the instant state change instead — that answer is the reason this rule exists.

2. **What is the purpose?** Name it in one word: **feedback** (the interface heard the user), **spatial consistency** (where it came from / went), **state indication**, **preventing a jarring change**, **explanation** (onboarding/marketing only), **delight** (rare tier only). Cannot name it → do not build it. Data the user is reading does not move for style.

3. **Cheapest tool that works** — walk down, stop at the first that fits:

| Need | Tool |
|---|---|
| Hover, press, colour, a state you toggle with a class/attribute | CSS transition |
| Entry on mount, no JS state | CSS `@starting-style` |
| Predetermined motion that must stay smooth while the page is busy | CSS animation (off the main thread) |
| Programmatic control with CSS performance, no library | WAAPI (`element.animate()`) |
| Springs, layout animation, exit animation, gesture-driven values | Motion (`motion.dev`) |

Needs a *component* (toast, drawer, menu, dropdown)? Stop and pick a library — hand-rolling those is how you get a `<div>` dropdown with no focus management. For the common UI patterns (dropdown, modal, panel, page slide, toast, accordion, tabs, tooltip, badge, skeleton, success check, error shake, toggle, checkbox, and more) `/ui-transitions` carries tuned, portable CSS with its own motion-token scale: install one instead of inventing the curve, and keep the token scale for everything else you animate.

4. **Properties: `transform` and `opacity` only.** They skip layout and paint. Never `width`/`height`/`margin`/`padding`/`top`/`left` (`clip-path` is the sanctioned extra; `height` only for accordions). Never `scale(0)` — start at `scale(0.9–0.97)` + `opacity: 0`. Percentages in `translate()` are relative to the element's own size — prefer `translateY(100%)` over a hardcoded height. `transform-origin` sits at the **trigger** for popovers/menus/tooltips; modals stay centred. Never drive a child's transform from a CSS variable on the parent (it recalculates styles for every child) — set `transform` on the element itself. In Motion, animate the full `transform` string: `x`/`y`/`scale` are not hardware-accelerated.

5. **Curve and duration** — or a spring:

| Situation | Easing |
|---|---|
| Entering or exiting | `ease-out` |
| Moving / morphing on screen | `ease-in-out` |
| Hover / colour | `ease` |
| Constant motion (marquee, progress) | `linear` |

Built-in curves are too weak for UI; use these tokens (extend the project's if they already exist — do not fork them):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);     /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* iOS-like drawer */
```

**Never `ease-in` on UI** — it delays the exact moment the user is watching. Durations: button press 100–160ms · tooltips/small popovers 125–200ms · dropdowns/selects 150–250ms · modals/drawers 200–500ms · explanatory can be longer. **UI motion stays under 300ms.** No invented values: take a curve from the table or from a curated easing source.

Reach for a spring instead for drag with momentum, an element that should feel alive, a gesture the user can interrupt, or decorative pointer tracking: `{ type: 'spring', duration: 0.5, bounce: 0.2 }` (keep bounce 0.1–0.3; avoid it in most UI).

6. **Interruption and exit.** Transitions, not keyframes, for anything triggered rapidly (toasts, toggles) — transitions retarget, keyframes restart from zero. Springs for gestures, because they carry velocity through an interruption. **Exit the way it entered** (a toast that slides in from the bottom leaves through the bottom). Asymmetric timing where the user is deciding: slow on the deliberate phase (hold-to-confirm 2s linear), snappy on the system response (release 200ms ease-out).

7. **Reduced motion and hover gating ship with the animation**, never as a follow-up:

```css
@media (prefers-reduced-motion: reduce) { .element { animation: fade 0.2s ease; } } /* keep opacity/colour, drop movement */
@media (hover: hover) and (pointer: fine) { .element:hover { transform: scale(1.05); } } /* touch fires false hovers on tap */
```

Reduced motion means **fewer and gentler**, not zero. Touch devices still need press feedback — that is `:active`, which works on every input type.

## Measuring motion without seeing it

You do not watch motion: you capture instants. So judge it by **numbers**, not by impressions. Before saying a transition is right, instrument it in the page and report the measurements.

```js
// Sample the computed style per frame while the animation runs.
async function measureMotion(el, ms = 600) {
  const samples = []
  const t0 = performance.now()
  await new Promise((done) => {
    const tick = () => {
      const t = performance.now() - t0
      const cs = getComputedStyle(el)
      samples.push({ t: Math.round(t), transform: cs.transform, opacity: Number(cs.opacity),
        props: cs.transitionProperty, dur: cs.transitionDuration, ease: cs.transitionTimingFunction })
      t < ms ? requestAnimationFrame(tick) : done()
    }
    requestAnimationFrame(tick)
  })
  const first = samples[0], last = samples[samples.length - 1]
  const matrix = (m) => (m === 'none' ? [0, 0] : m.match(/-?\d+\.?\d*/g).map(Number))
  const [ax, ay] = matrix(first.transform), [bx, by] = matrix(last.transform)
  return {
    frames: samples.length,
    durationMs: last.t,
    distancePx: Math.round(Math.hypot(bx - ax, by - ay)),
    from: first.transform, to: last.transform,
    opacityFrom: first.opacity, opacityTo: last.opacity,
    properties: first.props, duration: first.dur, easing: first.ease,
  }
}
```

What to do with it:

- **Duration**: the measured `durationMs` must sit in the band for that element (press 100–160 · tooltip 125–200 · dropdown 150–250 · modal/drawer 200–500) and stay **under 300ms** for UI. A number outside the band is a finding, not a taste.
- **Properties**: `properties` must name only `transform`/`opacity` (plus `clip-path` where sanctioned). `all` in that list is a defect.
- **Distance**: `distancePx` tells you whether the element actually moved — an entrance measured at 0px moved nothing, whatever the CSS says.
- **Opacity**: `opacityFrom`/`opacityTo` catch the entrance that forgot to fade (a hard pop) or the one that fades from 0 with no movement.
- **Easing**: `easing` must match the table's choice; a measured `ease-in` on an entrance is a finding by itself.
- **Trajectory between two prints**: capture a print before and one after a click, then read the element's box/position in both — the pair is the evidence that the gesture moved what it should.

Report the numbers next to the claim ("entrance: translateY 8px→0, opacity 0→1, 180ms, ease-out") — a claim without a measurement is an impression.

## Component reflexes

- Every pressable element answers on press: `transition: transform 160ms var(--ease-out)` + `:active { transform: scale(0.97) }` (0.95–0.98).
- Tooltips delay on the first hover, then open instantly with no animation on the next ones.
- Staggering several entering elements: 30–80ms between them, decorative, never blocking interaction.
- Blur masks an imperfect crossfade — `filter: blur(2px)` during the transition, never above 20px.
- `translateY(100%)` to hide a sheet/toast before animating in, whatever its height.

## Never ship (self-check — run each line with its detection, before saying done)

| Never | Instead | How to detect |
|---|---|---|
| `transition: all` | Name the exact properties | Grep `transition:\s*all` |
| `transform: scale(0)` entrance | `scale(0.95)` + `opacity: 0` | Grep `scale\(0\)` |
| `ease-in` on a UI element | `ease-out` or a strong custom curve | Grep `ease-in\b` (not `ease-in-out`) |
| Animation on a keyboard shortcut or a 100+/day action | No animation | List every animated element and its daily frequency |
| UI duration over 300ms with no reason | 150–250ms | Read every `transition-duration`/`animation-duration` > `0.3s` |
| `transform-origin: center` on a trigger-anchored popover | Origin at the trigger (modals exempt) | Grep `transform-origin` on popover classes |
| Keyframes on toasts, toggles, rapidly-triggered elements | CSS transitions | Grep `@keyframes` and check what uses it |
| Animating `width`/`height`/`margin`/`padding`/`top`/`left` | `transform` / `opacity` | Grep `transition:` for those property names |
| Motion `x`/`y`/`scale` props under load | Full `transform` string | Grep `animate=\{\{ *(x|y|scale)` |
| Ungated `:hover` motion | `@media (hover: hover) and (pointer: fine)` | Grep `:hover` and confirm each sits inside the query |
| Missing `prefers-reduced-motion` | Gentler variant, not zero | Grep `prefers-reduced-motion` |
| Everything entering at once | 30–80ms stagger | Read the list entrance |

## Anti-patterns (what a model actually writes, and why)

- **`transition: all`** — the lazy default. It animates properties you never meant to (layout, colour, shadow), causes jank, and hides the decision. Name the properties.
- **`ease-in` on an entrance** — it reads naturally in prose ("accelerates in"), and it is exactly backwards for UI: it delays the moment the user is watching. Entrances are `ease-out`.
- **Animating `height`** — because height is what visibly changes. It triggers layout on every frame; use `transform`/`opacity`, `clip-path` for reveals, and reserve `height` for accordions.
- **Forgetting the hover gate** — the agent tested on a desktop, where hover is real. On touch, the first tap leaves the hover state stuck. Every `:hover` sits behind the capability query.
- **Keyframes on a toast or a toggle** — because the snippet was easy. Interruption restarts them from zero; transitions retarget.
- **`scale(0)`** — the classic "appear from nothing". Nothing in the real world does that; start at 0.9–0.97 with opacity.
- **A 400ms dropdown** — a duration copied from a marketing animation. UI motion under 300ms, or it feels broken.
- **Claiming "animated" without measuring** — the failure this skill exists to prevent: a transition exists, so it is reported as done. Measure the duration, the properties and the distance, then claim it.

## Output

The code is the deliverable. Then, in at most a few lines: the gate result (frequency tier + named purpose), the ingredients (tool, properties, curve, duration or spring) **with the measured numbers**, and what the requester should feel-check.

Choose the feel-check carefully — it costs the owner a round-trip, so bring **1–3 items at most**, the ones that most change perception (a spring's bounce, a crossfade's blur, the exit speed of a sheet). Ask a cheap, concrete question ("esta saída parece rápida demais?"), never "o que você acha?".
