/**
 * The inline style vocabulary the picker and the authoring form share.
 *
 * Inline rather than a CSS module so the bundle carries no CSS pipeline; every
 * value is a DSH design token, so the screens follow the active theme. They
 * live in one module because the two screens are one dialog to the person using
 * it — a card that changed its padding or its ink between "choose" and "create"
 * would read as two products.
 * @module dsh-profiles/client/styles
 */
import type { CSSProperties } from 'react'

const BACKDROP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  fontFamily: 'var(--dsw-font-family)',
  overflow: 'auto',
}

/**
 * Nothing materialized yet: this is a gate, not a dialog, so it covers the app
 * outright the way the login screen does. There is nothing usable behind it.
 */
export const BACKDROP_GATE: CSSProperties = {
  ...BACKDROP,
  background: 'var(--dsw-alias-bg-base)',
}

/**
 * A deliberate switch: the app behind stays running and cancellable, so this is
 * the shipped modal mask (`ui-primitives/Modal.module.css`) rather than an
 * opaque cover.
 */
export const BACKDROP_MASK: CSSProperties = {
  ...BACKDROP,
  background: 'var(--dsw-alias-bg-mask-1)',
  backdropFilter: 'var(--dsw-mask-blur)',
}

/**
 * The dialog card, filled with the shipped dialog tokens.
 *
 * The fill is not optional: without it the card is transparent and the picker
 * reads as text floating on whatever is behind, which is exactly what a mask
 * backdrop makes visible.
 */
export const CARD: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 480,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 32,
  borderRadius: 24,
  border: '1px solid var(--dsw-alias-border-inverted)',
  background: 'var(--dsw-alias-bg-layer-2)',
  boxShadow: 'var(--dsw-shadow-lv3)',
}

/**
 * The same card, holding the authoring form.
 *
 * Wider because the form carries the whole catalog: at the roster's width the
 * skill lines would be more ellipsis than text. It is still a dialog, so the
 * width is capped rather than fluid.
 */
export const CARD_WIDE: CSSProperties = { ...CARD, maxWidth: 620 }

export const TITLE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 22,
  fontWeight: 600,
  lineHeight: '30px',
}

export const SUBTITLE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 13,
  lineHeight: '20px',
}

export const ROW: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid var(--dsw-alias-border-l2)',
  // Layer 3 over the card's layer 2: raised in dark, and in light every layer
  // is the same solid neutral, so the border does the separating there. Never
  // `transparent` — a row that borrowed whatever sat behind it is what the
  // mask backdrop would expose.
  background: 'var(--dsw-alias-bg-layer-3)',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  textAlign: 'left',
  cursor: 'pointer',
}

export const ROW_HINT: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  lineHeight: '18px',
}

/** The row of the profile already in force, so a switch shows what it moves from. */
export const ROW_CURRENT: CSSProperties = {
  borderColor: 'var(--dsw-alias-state-business-primary)',
}

export const SECONDARY: CSSProperties = {
  alignSelf: 'flex-start',
  padding: '6px 0',
  border: 'none',
  background: 'none',
  color: 'var(--dsw-alias-label-secondary)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: '20px',
  cursor: 'pointer',
}

/** The one committing action of a screen; every other control stays secondary. */
export const PRIMARY: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--dsw-alias-brand-primary)',
  color: 'var(--dsw-alias-brand-primary-invert, #fff)',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: '20px',
  cursor: 'pointer',
}

export const NOTE: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  lineHeight: '18px',
}

export const ERROR: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-error, #d64545)',
  fontSize: 13,
  lineHeight: '20px',
}

/** A labelled group of the authoring form. */
export const FIELD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
}

export const LABEL: CSSProperties = {
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: '20px',
}

export const INPUT: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-3))',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: '20px',
}

/**
 * The catalog boxes: bounded and scrolling, so a long library cannot push the
 * dialog's own buttons past the bottom of the screen.
 */
export const CHECK_BOX: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 200,
  overflowY: 'auto',
  padding: 12,
  borderRadius: 12,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-3)',
}

export const CHECK_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  minWidth: 0,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
  lineHeight: '20px',
  cursor: 'pointer',
}

/** The text column of a checkbox row; `minWidth: 0` is what lets the hint clip. */
export const CHECK_TEXT: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}

/** One line, clipped: the catalog's hints are prose, and the dialog is not. */
export const CHECK_HINT: CSSProperties = {
  ...ROW_HINT,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/** Marks a plugin whose row only enters or leaves the process at boot. */
export const BADGE: CSSProperties = {
  marginLeft: 6,
  padding: '0 6px',
  borderRadius: 6,
  background: 'var(--dsw-alias-state-warn-secondary)',
  color: 'var(--dsw-alias-state-warn-primary)',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: '18px',
}

/** The committing row of the authoring form. */
export const FOOTER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}
