---
name: frontend-design
description: Give every interface a deliberate visual direction — named aesthetic, font pairing, composition, depth and a motion language where every page animates — record it as mds/epics/<epic>/03-design.md, and build screens that could not be mistaken for a template.
whenToUse: Before the first screen of /03-prototype (right after /ui-palette), whenever a page, landing, dashboard or component is created or restyled in the prototype or the React app, when /04-tech-plan records fonts and motion, and when /07-build briefs a UI ticket.
---

# Frontend design

You are a designer-engineer, not a layout generator. Every screen expresses one stated aesthetic, uses the requester's palette with intent, and **moves**: pages enter, sections reveal, controls answer the pointer, state changes transition. A screen that is a stock shadcn block with a default font and no motion is the defect this skill exists to prevent.

## What this skill owns, and what it does not

| Decided here | Decided elsewhere |
|---|---|
| Aesthetic direction, differentiation anchor | Colors — `03-palette.md` via `/ui-palette` |
| Font pairing and type scale | Controls — shadcn/ui via `/shadcn-ui` |
| Composition, spacing rhythm, depth, texture | Icons — Lucide/Tabler via `/ui-icons` |
| Motion language and motion tokens | Screens, fields, flows — the frozen `prototype.md` |

"Commit to a color story" means choosing how the palette's roles dominate (one dominant surface tone, `primary` for action, `accent` sparingly), never adding colors. Gradients, glows, grain and meshes are built from palette roles (`from-primary/20 via-background to-accent/10`), never from literals or default Tailwind colors.

## 1. Decide the direction

Read `01-brief.md` (audience, tone, sector) and `03-palette.md` first. `skill ui-ux-pro-max` gives, for the product type, the recommended style, landing pattern, font pairings and signature effects; start there, then commit.

1. **Purpose** — persuasive (landing), functional (app, dashboard), exploratory (catalog), expressive (portfolio, brand).
2. **Tone** — one dominant direction, at most two blended: editorial, luxury minimal, industrial utilitarian, playful, organic, retro-futurist, brutalist, Swiss, data-dense precise, soft/rounded.
3. **Differentiation anchor** — answer: "with the logo removed, how would someone recognize this screen?" The answer must be visible in the UI (a type treatment, a layout break, a signature motion, a texture).
4. **Score it (DFII)** — rate 1–5: Aesthetic impact, Context fit, Feasibility, Performance safety, Consistency risk. `DFII = impact + fit + feasibility + performance − risk` (range −5…15). Build at 8 or more; at 4–7 reduce effects or scope; at 3 or less pick another direction.

## 2. Aesthetic rules

**Typography**
- One expressive display face plus one restrained body face, from the `ui-ux-pro-max` pairings or an equivalent Google Fonts pair. Inter, Roboto, Arial or `system-ui` as the only face is generic; they are acceptable as body under a distinctive display face, or alone only when the direction is deliberately Swiss or data-dense.
- Type is structure: a clear scale (e.g. 12/14/16/20/24/32/48/64), tight tracking on large display headings, wide tracking on small uppercase labels, `text-balance` on headings, `text-pretty` on paragraphs, `tabular-nums` for figures.

**Composition**
- Break the default grid on purpose: asymmetry, overlap, bento grids, generous negative space or controlled density. A row of three equal cards under a centered hero is the template look; use it only when the direction calls for it.
- One spacing rhythm (4px base) used consistently; one max content width per product.

**Depth and texture** (when the direction wants them)
- Noise or grain overlay at low opacity, gradient meshes from palette roles, layered translucency (`bg-card/80 backdrop-blur` on small surfaces), custom dividers, shadows with a light source rather than the same `shadow-md` everywhere.

**Anti-patterns** — each one is a finding:
- Default font with default shadcn layout and no motion.
- Purple-on-white SaaS gradient, rainbow gradients, a color outside the palette.
- Symmetrical, predictable section stacks repeated down the page.
- Decoration with no link to the direction; effects copied from a trend without context fit.

## 3. Motion language — every page animates

Motion is required, not optional. Each screen has all of these:

| Layer | What moves | Timing |
|---|---|---|
| **Entrance** | On first view: heading, lead content and primary action enter in sequence (fade + 8–24px translate, or scale 0.98→1) | `--duration-slow`, stagger `--stagger`, whole sequence under 900ms |
| **Scroll reveal** | Each section below the fold reveals once when ~20% visible; lists and grids stagger their items | `--duration-slow`, once only |
| **Feedback** | Every interactive element answers hover, `focus-visible` and press (color/shadow shift, lift of 1–2px, press scale 0.98) | `--duration-fast` |
| **State change** | Dialogs, sheets, menus, tabs, accordions, toasts, list insert/remove, screen or route switch | `--duration-base`; exits faster than entrances |
| **Loading** | Skeleton pulse or shimmer; content fades in when data arrives, without layout jump | `--duration-base` |
| **Signature moment** | At least one distinctive motion tied to the anchor: line-by-line hero reveal, counting KPI, drawn underline, parallax layer, morphing shape | runs once or on interaction, never a noisy loop |

**Motion tokens** — define once per product, as CSS variables, and use nowhere else a raw duration or curve:

```css
:root {
  --duration-fast: 150ms;   /* feedback: 100–200ms */
  --duration-base: 250ms;   /* state changes: 200–350ms */
  --duration-slow: 550ms;   /* entrances, reveals: 400–700ms */
  --stagger: 60ms;          /* 40–90ms between siblings */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* entrances */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);        /* exits */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* moves, swaps */
}
```

The direction tunes values inside the ranges in the comments (luxury: slower, softer; utilitarian: faster, shorter distances; playful: a spring for press and drag).

**Limits** — motion must never cost usability:
- Animate `transform` and `opacity`; paint or layout properties only on small, isolated elements (`/fixing-motion-performance`).
- Content is visible without JavaScript: the hidden initial state is applied by script (a `js` class on `<html>`), so a failed CDN never leaves a blank section.
- Animations never block input: no disabled pointer events while entering, no waiting for a sequence before a click works.
- `prefers-reduced-motion: reduce` keeps short opacity fades and drops translate, scale, parallax and auto-playing sequences. Content and state changes remain; only the movement goes.
- No infinite decorative loops except a subtle ambient background that pauses off-screen and under reduced motion. Loaders loop only while loading.

## 4. Implementation

**Prototype (`/03-prototype`, CDN-only).** Tokens and keyframes in a `<style>` block; Motion's CDN build for sequences and reveals, guarded like every CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/motion@13/dist/motion.js"></script>
<style>.motion [data-enter], .motion [data-reveal] > * { opacity: 0 }</style>
<script>
  const M = window.Motion;
  if (M) document.documentElement.classList.add('motion'); // no CDN → no hidden state
  const ease = [0.22, 1, 0.36, 1];
  function enter(root) {
    if (!M) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = reduce ? { opacity: [0, 1] } : { opacity: [0, 1], y: [16, 0] };
    M.animate([...root.querySelectorAll('[data-enter]')], from, { duration: 0.55, delay: M.stagger(0.06), ease });
    root.querySelectorAll('[data-reveal]').forEach(el => M.inView(el, () => {
      M.animate([...el.children], from, { duration: 0.55, delay: M.stagger(0.06), ease });
    }, { amount: 0.2 })); // callback returns nothing → fires once
  }
</script>
```

Mark entering elements with `data-enter` and revealed groups with `data-reveal` (their children animate). Call `enter(section)` whenever the JS router shows a screen, so every screen switch replays its entrance. Feedback states use Tailwind transitions with the tokens (`transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98]`). Before a `prototype_automation` `screenshot`, wait longer than the entrance sequence (`wait_for` the last `[data-enter]` element, then about one second).

**React app (`/07-build`).**
- `pnpm add motion`; import from `motion/react` (`motion`, `AnimatePresence`, `MotionConfig`, `stagger`). In Next.js App Router, animated components are client components.
- Wrap the app once in `<MotionConfig reducedMotion="user">`.
- Entrance: a parent `motion.div` with `variants` and `transition={{ delayChildren: stagger(0.06) }}`; children with `initial="hidden" animate="show"`.
- Scroll reveal: `whileInView="show" viewport={{ once: true, amount: 0.2 }}`.
- State changes: `AnimatePresence` for conditional content and list items (`layout` only on small lists); shadcn overlays already animate through `tw-animate-css` (`data-[state=open]:animate-in`) — tune their durations to the tokens, do not replace them.
- Tokens live in the theme CSS: the `:root` variables above plus Tailwind v4 `@theme` entries (`/tailwind-patterns`).

## 5. Record `mds/epics/<epic>/03-design.md`

Inside a build process, write it before the first prototype screen, after `03-palette.md`:

```markdown
---
epic: <slug>
artifact: design
status: draft | validated
---
# Design direction — <initiative>
## Direction
aesthetic: <name> · purpose: <…> · DFII: <score> (impact/fit/feasibility/performance/risk)
anchor: <what makes it recognizable without the logo>
style source: <ui-ux-pro-max style and landing pattern, or "custom">
## Typography
display: <font> · body: <font> · load: <Google Fonts URL or package> · scale: <sizes> · tracking rules: <…>
## Composition and depth
<grid, max width, spacing base, texture/depth devices>
## Motion
tokens: <the :root block with the chosen values>
entrance: <what enters, how> · reveal: <…> · feedback: <…> · state: <…> · loading: <…>
signature: <the signature moment and where it appears>
```

Announce the direction to the requester in one or two plain sentences in their language ("elegant and calm, with large serif headings and smooth reveals as you scroll"), not in design jargon. The screens they approve validate it: set `status: validated` when the requester approves the first screen. `prototype.md` cites `03-design.md` under Global decisions, the React app copies its fonts and tokens, and a later change is an amendment under the `/03-prototype` freeze rule.

Outside a build process, state the same direction in a few lines of the reply before the code.

## Done

- The direction, anchor and DFII (8 or more) are stated, and `03-design.md` exists inside a build process.
- Fonts load, the scale is used, and no color appears outside the palette roles.
- Every screen has entrance, reveal (when it scrolls), feedback, state-change and loading motion, driven by the tokens, plus the signature moment somewhere in the product.
- Reduced motion checked: nothing disappears, nothing blocks input.
- A real-browser screenshot taken after the entrance finished shows the anchor.

_Adapted from the community `frontend-design` skill (Apache-2.0)._
