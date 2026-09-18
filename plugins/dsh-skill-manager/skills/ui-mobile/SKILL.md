---
name: ui-mobile
description: Make a web app feel native on a phone — the platform-layer fixes that separate "a website in a browser" from something installed: tap highlight flashes, dynamic viewport height, inputs that zoom the page, laggy taps, pull-to-refresh hijacking scroll, content under the notch, sticky hover states, long-press selection on controls, carousels scrolling the wrong way, mismatched status bar. Ships a baseline block to apply before the first component. Use when a surface is built for or reviewed on a phone, when building a PWA, a bottom sheet, a carousel, a full-screen layout, or any touch interaction.
whenToUse: When building or reviewing any mobile-facing surface; when something works in a desktop browser but feels wrong on a phone.
---

# Feeling native on mobile

A fix-it bar, not a menu. Derived from Emil Kowalski's design-engineering philosophy (MIT). Read `/00-start-here` first.

Two failure modes, and the first is worse: **fixing what the desktop browser shows you** (none of these reproduce in device emulation), and **reaching for JavaScript when a declaration or a meta tag does it** (a `useIsTouchDevice()` hook to hide hover states is the wrong tool; a media query is the right one).

## The baseline — ship this before the first component

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
```

```css
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  overscroll-behavior: none; /* drop this if the app is a scrolling document where pull-to-refresh is welcome */
}
input, textarea, select { font-size: 16px; }
button, a, [role="button"] { touch-action: manipulation; user-select: none; -webkit-user-select: none; }
@media (hover: hover) and (pointer: fine) { /* every :hover rule lives here */ }
```

## Symptom → fix

| Symptom | Fix |
|---|---|
| Hover state stuck after a tap | Wrap it in `@media (hover: hover) and (pointer: fine)` |
| Grey/blue flash on tap | `-webkit-tap-highlight-color: transparent` on `html` |
| Layout has the wrong height | `100dvh` for the app shell, `100svh` for a hero — never `100vh` |
| Page zooms into an input | Input font size **16px** (never `maximum-scale=1`) |
| Tap feels laggy | Feedback on `:active`/`pointerdown` + `touch-action: manipulation` |
| Pull-to-refresh hijacks scroll | `overscroll-behavior: none` on `html, body`, `contain` on inner scrollers |
| Content stops at the notch | `viewport-fit=cover` + `env(safe-area-inset-*)` padding |
| Long-press selects button text | `user-select: none` on controls (never on `body`) |
| Carousel scrolls the wrong way | `touch-action: pan-y` on the carousel, `pan-x` on a vertical sheet |
| Status bar colour does not match | One `theme-color` per `prefers-color-scheme` |
| Target is hard to hit | Minimum touch area 44×44px |
| Action sits under the system bar | Pad with `env(safe-area-inset-*)` on fixed bars |
| Button hidden when the keyboard opens | `100dvh` + `interactive-widget=resizes-content`, tested with the keyboard open |
| Right in the browser, wrong on the phone | Test on real hardware |

## The fixes, with the why

- **Sticky hover.** Touch has no hover; browsers fake it — the first tap applies `:hover` and leaves it until the user taps elsewhere. Gate every hover style behind `@media (hover: hover) and (pointer: fine)` (both conditions: `pointer: fine` rules out styluses and the odd Android that claims hover). Touch users still get press feedback through `:active`.
- **Tap highlight.** The translucent overlay the browser paints over any tapped element with a handler is the loudest "this is a website" signal, and it fights your own press feedback. Set `-webkit-tap-highlight-color: transparent` once, globally — then make sure every tappable element has its own `:active`, because you just removed the browser's.
- **Viewport height.** `100vh` is the *largest* viewport (chrome collapsed), so on load a `100vh` shell overflows by the URL bar and a bottom-pinned button sits under it. `100dvh` tracks the visible area as chrome shows/hides (right for an app shell); `100svh` is the stable smallest (right for a hero, no layout shift mid-scroll). `lvh` is the old `vh` — you almost never want it.
- **Input zoom.** iOS zooms when focus lands on an input under 16px and does not zoom back out. Fix the cause (16px, or only on `@media (pointer: coarse)`), never with `maximum-scale`. While there: `inputmode="numeric"`/`"decimal"`, `type="email"`/`"tel"`, `autocapitalize="none"`, `autocorrect="off"`, `enterkeyhint="send"|"search"|"done"`.
- **Laggy taps.** Two causes stack: the double-tap-zoom delay (killed by `touch-action: manipulation`) and feedback on release instead of press (native buttons answer the instant the finger lands — style `:active`, or listen to `pointerdown`, never `click`). Keep press feedback 100–160ms `ease-out`.
- **Overscroll.** Pull-to-refresh and whole-page rubber-banding are right on a document, wrong in an app with its own scrollers, a draggable sheet or a canvas: `overscroll-behavior: none` on the root, `contain` on inner scrollers (keeps their own bounce, stops chaining). Never a `touchmove` + `preventDefault()` listener — it blocks scrolling and costs frames.
- **Safe areas.** `viewport-fit=cover` lets the page under the notch; `env(safe-area-inset-*)` pads the content back out (without the meta tag every value is `0px`). Fixed headers, bottom bars, toasts and sheets are what need it. Give `env()` a fallback inside `calc()`.
- **Long-press selection.** Text that is a *control* must not be selectable; text that is *content* must stay selectable (users copy addresses, codes, error messages). `user-select: none` + `-webkit-touch-callout: none` on controls and drag handles only.
- **Axis ownership.** A horizontal swipe is ambiguous, so the browser guesses and jitters. Name what the **browser** may still do: `pan-y` on a horizontal carousel, `pan-x` on a vertical sheet handle, `none` only where a custom gesture really owns every axis. Prefer native `scroll-snap-type: x mandatory` over a hand-rolled spring — the platform's physics beat yours.
- **Status bar.** One `theme-color` means light mode gets a dark bar or vice versa. One per scheme, matched to the colour at the very top of the page (the header, not the brand colour). Installed PWA: the manifest's `theme_color`/`background_color` are the same decision.
- **Real hardware.** Connect the phone, serve on `0.0.0.0`, open the machine's LAN IP (iOS: Safari → Develop; Android: `chrome://inspect`). Test on a phone a few years old, with the keyboard open, in landscape once, and installed if that is a target. Emulation misses every item above.
- **Touch target.** Every tappable thing is at least **44×44px** of hit area, even when the icon is smaller (pad the button, do not grow the glyph). Rows in a list count; a 24px icon in a 24px box does not.
- **Nothing under the system bars.** Fixed headers, bottom bars, floating actions and toasts must sit inside the safe area — a button under the home indicator or the status bar is unreachable, not just ugly.
- **Keyboard open.** The state the desktop never shows: focus an input and confirm the shell resizes (`dvh`), the focused field scrolls into view, and nothing the user must tap ends up behind the keyboard. `interactive-widget=resizes-content` makes Android behave like iOS here; the check is still on hardware.

## Self-check (run it yourself, item by item, print as evidence)

Before saying a mobile surface is done, walk the table above **yourself** — one item at a time, in the real browser at phone size, with a screenshot per item as the evidence (the `/08-review` UI gate asks for exactly these prints). Say plainly which items only hardware can confirm. A surface that was never walked item by item was not checked, it was assumed.

## Never ship (self-check before saying done)

| Never | Instead |
|---|---|
| `user-scalable=no` / `maximum-scale=1` | 16px inputs — fix the cause |
| Ungated `:hover` | `@media (hover: hover) and (pointer: fine)` |
| `100vh` for an app shell or bottom-pinned UI | `100dvh` |
| `100dvh` on a marketing hero | `100svh` |
| Press feedback only on `click` | `:active` / `pointerdown` |
| `touchmove` + `preventDefault()` for overscroll | `overscroll-behavior` |
| `user-select: none` on `body` | Only on controls |
| `touch-action: none` on something the user must scroll past | `pan-x` / `pan-y` |
| `env(safe-area-inset-*)` without `viewport-fit=cover` | Add the meta tag or the value is `0` |
| One `theme-color` for both schemes | One per `prefers-color-scheme` |
| User-agent sniffing to detect touch | `(hover)` / `(pointer)` media queries |
| Calling it fixed from device emulation | Real hardware |

## Output

The code is the deliverable. Then, in at most a few lines: what was wrong (the symptom + the one-line why), what changed (file + declaration), and what still needs a phone — saying plainly which fixes were verified from code and which only hardware can confirm.
