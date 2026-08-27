# dsh-shiva-theme

The Shiva appearance for dsh web, theme only: signal colour on true black, translucent surfaces over a slow matrix backdrop, trident brand swap, five selectable accents.

Ported one-to-one from the Shivacode desktop theme (`dsh-shivacode`), minus the plugin family — this package ships appearance and nothing else.

## What it does

- **Palette**: overrides the harness alias tokens (`--dsw-alias-*`, `--dsw-specific-*`) with true-black translucent surfaces; no grey — secondary labels are the accent, tertiary are fixed cyan `#4DE1FF`.
- **Accent**: 5 hand-picked accents (yellow `#F0B90B` default, purple, sky, red, green) published as CSS custom properties on `<html>`; switching colour is one variable write.
- **Backdrop**: hand-written canvas matrix rain (katakana + digits, 5.5 steps/s, 55% density, `pointer-events: none`), removed under `prefers-reduced-motion`.
- **Brand**: wordmark and rail mark replaced via CSS masks keyed on each svg `viewBox` (`0 0 182 24`, `0 0 23.16 17.04`), painted by the accent underneath.
- **Type/motion**: display stack (Rajdhani/Bahnschrift, uppercase headings), mono stack (Cascadia/JetBrains), accent hover glow, accent focus rings, accent caret/selection.

The alias tokens are written both into `ctx.theme.register` and straight into the stylesheet scoped to `body[data-shiva-theme]` — the persisted light/dark preference never competes with the paint.

## Control

Settings → Plugins → Plugin configuration → **Shiva theme** card: one switch (on by default) and, under it, the accent swatches. Preference persists in `localStorage` (`dsh-shiva-theme.live`, `dsh-shiva-theme.accent`).

## Files

```text
lib/index.js    host half — empty apply (row in the host Loader)
lib/client.js   the whole theme: accents, tokens, brand, stylesheet, matrix, card
```

MIT.
