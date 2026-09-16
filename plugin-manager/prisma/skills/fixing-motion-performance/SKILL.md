---
name: fixing-motion-performance
description: Keep the required page motion smooth — choose the cheapest rendering mechanism, avoid layout thrashing, drive scroll-linked motion without scroll listeners, limit paint and blur — and audit a file for animation jank with quoted violations and concrete fixes.
whenToUse: Whenever an animation, transition, scroll reveal or parallax is added or changed in the prototype or the React app, when motion stutters, and when the /07-build evaluator checks a UI ticket. Pass a file path to get a review.
---

# Fixing motion performance

Every page animates (`/frontend-design` section 3). This skill keeps that motion at 60fps. When a technique is too expensive, **downgrade the technique, never remove the motion**: swap a height animation for a transform, a continuous blur for a one-shot fade.

## Modes

- **Apply** (no argument): follow these rules in any animation work of this conversation.
- **Review** (`fixing-motion-performance <file>`): report each violation as the quoted snippet, why it matters in one sentence, and the concrete fix. Critical rules first. Do not migrate animation libraries unless explicitly requested.

## Rendering cost

| Step | Triggered by animating | Cost |
|---|---|---|
| composite | `transform`, `opacity` | cheapest — default |
| paint | color, background, border, shadow, gradient, mask, filter, image | small isolated elements only |
| layout | width, height, top/left, margin, padding, flex/grid flow, font-size | avoid on meaningful surfaces |

## Rules by priority

### 1. Never patterns (critical)
- Do not interleave layout reads and writes in the same frame.
- Do not animate layout continuously on large or meaningful surfaces.
- Do not drive animation from `scroll` events, `scrollY` or `scrollTop` polling.
- No `requestAnimationFrame` loop without a stop condition.
- Do not mix animation systems that each measure or mutate layout on the same element.

### 2. Choose the mechanism (critical)
- Default to `transform` and `opacity`.
- CSS transitions and `tw-animate-css` for simple state and entrance; `motion` (`motion/react`, or the Motion CDN build in the prototype) for sequences, stagger, presence, gestures and in-view reveals.
- Paint or layout animation only on small, isolated elements (a badge, an underline, an icon).
- One-shot effects are acceptable more often than continuous motion.

### 3. Measurement (high)
- Measure once, then animate with `transform`.
- Batch all DOM reads before writes; never read layout during an animation.
- Use FLIP for layout-like effects (reorder, expand, move between containers). In React, Motion's `layout` prop does FLIP — use it on small lists and cards, not on whole pages.

### 4. Scroll (high)
- Reveal-on-scroll uses `IntersectionObserver`: Motion `inView` (prototype) or `whileInView` with `viewport={{ once: true }}` (React).
- Scroll-linked progress (parallax, progress bars) uses CSS scroll/view timelines with a fallback, or Motion `scroll()` / `useScroll`, which use native timelines where available:

  ```css
  @supports (animation-timeline: view()) {
    .parallax { animation: drift linear both; animation-timeline: view(); animation-range: cover; }
  }
  @keyframes drift { from { transform: translateY(24px) } to { transform: translateY(-24px) } }
  ```
- Pause or stop animations when off-screen.
- Scroll-linked motion must not trigger continuous layout or paint on large surfaces.

### 5. Paint (medium-high)
- Paint-triggering animation only on small, isolated elements; never on large containers.
- Do not animate CSS variables that feed `transform`, `opacity` or position; do not animate inherited variables. Scope animated variables locally.
- Shadow changes on hover: animate the `opacity` of a pseudo-element that carries the larger shadow, not `box-shadow` itself, on cards and larger.

### 6. Layers (medium)
- Compositing needs layer promotion; do not assume it.
- `will-change` only during the animation, removed afterwards; never on many or large elements.
- Animate a wrapper `div`, not an `<svg>` element, for hardware acceleration.

### 7. Blur and filters (medium)
- Blur animation stays at or below 8px, one-shot, on small surfaces.
- Never animate `backdrop-filter` or blur continuously or on large surfaces.
- Prefer opacity and translate before blur.

### 8. View transitions (low)
- `document.startViewTransition` only for navigation-level changes, never for interaction-heavy UI or when interruption must be supported.
- Treat size changes inside a view transition as layout-triggering.

### 9. Reduced motion and input (critical)
- `prefers-reduced-motion: reduce` swaps movement for short opacity fades (`MotionConfig reducedMotion="user"` in React; `matchMedia` check in the prototype). Never hide content under it.
- Animations never block input: no `pointer-events: none` on entering content, no awaiting a sequence before handlers work.

### 10. Tool boundaries (critical)
- Do not migrate or rewrite animation libraries unless requested; apply these rules inside the existing system.
- Never partially migrate APIs or mix styles within one component.

## Common fixes

```css
/* layout → transform */
.panel { transition: width .3s }                          /* before */
.panel { transition: transform var(--duration-base) var(--ease-out) } /* after: scaleX or translateX */
```

```html
<!-- hover shadow → pseudo-element opacity (palette role color, works on Tailwind v3 CDN and v4) -->
<div class="relative after:content-[''] after:absolute after:inset-0 after:rounded-[inherit]
            after:shadow-xl after:shadow-foreground/15 after:opacity-0
            after:transition-opacity after:duration-[var(--duration-fast)] hover:after:opacity-100">
```

```js
// scroll listener → timeline
window.addEventListener('scroll', () => el.style.opacity = scrollY / 500) // before
// after (CSS):  .fade { animation: fade linear both; animation-timeline: view(); }

// layout thrash → FLIP
const first = el.getBoundingClientRect();
el.classList.add('moved');
const last = el.getBoundingClientRect();
el.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }],
  { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
```

## Review guidance

- Enforce never patterns, reduced motion and tool boundaries first.
- Pick the least expensive rendering work that keeps the intended motion.
- For a non-default choice, state the constraint that justifies it (surface size, duration, interaction).
- Give actionable notes with the replacement code, not theory.

_Adapted from the community `fixing-motion-performance` skill._
