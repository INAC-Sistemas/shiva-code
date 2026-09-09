# dsh-shiva-theme

The Shiva appearance for dsh web, theme only: signal colour on true black, translucent surfaces over a slow matrix backdrop, app-icon brand swap, five selectable accents.

Ported one-to-one from the Shivacode desktop theme (`dsh-shivacode`), minus the plugin family — this package ships appearance and nothing else.

## What it does

- **Palette**: overrides the harness alias tokens (`--dsw-alias-*`, `--dsw-specific-*`) with true-black translucent surfaces; no grey — secondary labels are the accent, tertiary are fixed cyan `#4DE1FF`.
- **Accent**: 5 hand-picked accents (yellow `#F0B90B` default, purple, sky, red, green) published as CSS custom properties on `<html>`; switching colour is one variable write.
- **Backdrop**: hand-written canvas matrix rain (katakana + digits, 5.5 steps/s, 55% density, `pointer-events: none`), removed under `prefers-reduced-motion`.
- **Brand**: wordmark and sidebar mark replaced keyed on each svg `viewBox` (`0 0 182 24`, `0 0 23.16 17.04`) — the wordmark is a CSS mask painted by the accent underneath, the mark is the ShivaCode app icon (`desktop/build/app-icon.png`, downscaled to 128px and inlined as a data URI) drawn in full colour at 44px square (36 in the collapsed rail, the edge of the toggle it rides there). The brand button clips to its own content height, so the identity group inside it is grown to the same 44px — otherwise the mark is cut back to the 24px the fish needed. Anything reached around a mark goes through its `div[data-slot]` anchor: slot occupants render inside that wrapper, so a selector stepping straight from the host element to the svg matches nothing. The hero keeps no mark at all — both it and the preview badge beside the phrase are dropped and the headline re-tracked onto the one span that remains.
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
