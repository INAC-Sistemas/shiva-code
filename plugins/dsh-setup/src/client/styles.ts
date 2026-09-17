/**
 * The inline style vocabulary of the wizard.
 *
 * Inline rather than a CSS module so the bundle carries no CSS pipeline; every
 * value is a DSH design token, so the wizard follows the active theme. The card
 * matches dsh-profiles' picker, because the two screens follow each other on a
 * first run and should read as one product.
 * @module dsh-setup/client/styles
 */
import type { CSSProperties } from 'react'

/** Covers the app outright: nothing behind it is usable before setup. */
export const BACKDROP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  overflow: 'auto',
  fontFamily: 'var(--dsw-font-family)',
  background: 'var(--dsw-alias-bg-base)',
}

export const CARD: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 640,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 32,
  borderRadius: 24,
  border: '1px solid var(--dsw-alias-border-inverted)',
  background: 'var(--dsw-alias-bg-layer-2)',
  boxShadow: 'var(--dsw-shadow-lv3)',
}

export const EYEBROW: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

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

/** The progress rail: one segment per step. */
export const PROGRESS: CSSProperties = {
  display: 'flex',
  gap: 6,
}

export const SEGMENT: CSSProperties = {
  flex: 1,
  height: 4,
  borderRadius: 2,
  background: 'var(--dsw-alias-border-l2)',
}

export const SEGMENT_DONE: CSSProperties = {
  ...SEGMENT,
  background: 'var(--dsw-alias-brand-primary)',
}

/** Provider choices: two columns, one on a narrow window. */
export const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 8,
}

export const CHOICE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-3)',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  textAlign: 'left',
  cursor: 'pointer',
}

export const CHOICE_SELECTED: CSSProperties = {
  ...CHOICE,
  borderColor: 'var(--dsw-alias-brand-primary)',
  boxShadow: 'inset 0 0 0 1px var(--dsw-alias-brand-primary)',
}

export const CHOICE_HINT: CSSProperties = {
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

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

export const CHECK_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
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
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

/** The summary rows. */
export const SUMMARY_ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-3)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
}

export const SUMMARY_VALUE: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
  textAlign: 'right',
  overflowWrap: 'anywhere',
}

/** The actions row: back on the left, the committing actions on the right. */
export const FOOTER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 4,
}

export const SPACER: CSSProperties = { flex: 1 }

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

export const SECONDARY: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'none',
  color: 'var(--dsw-alias-label-secondary)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: '20px',
  cursor: 'pointer',
}

export const LINK: CSSProperties = {
  padding: '8px 0',
  border: 'none',
  background: 'none',
  color: 'var(--dsw-alias-label-secondary)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: '20px',
  cursor: 'pointer',
}
