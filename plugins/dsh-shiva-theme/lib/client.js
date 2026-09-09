window.__ModuleLoader__.load({ id: 'dsh-shiva-theme', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-shiva-theme client half: the Shiva appearance for dsh web, ported
// one-to-one from the Shivacode theme. Signal colour on true black,
// translucent surfaces over a slow matrix backdrop, app-icon brand swap, five
// selectable accents. Theme only — no settings namespace, no plugin family.

// ── accent ────────────────────────────────────────────────────────────────
// The one hue the whole theme is built from, published as CSS custom
// properties on the document element so switching colour is one variable
// write: no re-registration, no restyle pass, no restart.

const ACCENTS = [
  { id: 'yellow', label: 'Yellow', base: '#F0B90B', hot: '#FFD335', deep: '#C99400', rgb: '240, 185, 11' },
  { id: 'purple', label: 'Purple', base: '#A855F7', hot: '#C084FC', deep: '#7E22CE', rgb: '168, 85, 247' },
  { id: 'sky', label: 'Light blue', base: '#38BDF8', hot: '#7DD3FC', deep: '#0284C7', rgb: '56, 189, 248' },
  { id: 'red', label: 'Red', base: '#FF3B4E', hot: '#FF6B7A', deep: '#C81E2D', rgb: '255, 59, 78' },
  { id: 'green', label: 'Green', base: '#22E67A', hot: '#5CF3A0', deep: '#12A455', rgb: '34, 230, 122' },
]
const DEFAULT_ACCENT_ID = 'yellow'
const ACCENT_VARIABLES = { base: '--shiva-accent', hot: '--shiva-accent-hot', deep: '--shiva-accent-deep', rgb: '--shiva-accent-rgb' }

function accentById(id) {
  return ACCENTS.find((a) => a.id === id)
    ?? ACCENTS.find((a) => a.id === DEFAULT_ACCENT_ID)
    ?? ACCENTS[0]
}

function publishAccent(accent) {
  const style = document.documentElement.style
  style.setProperty(ACCENT_VARIABLES.base, accent.base)
  style.setProperty(ACCENT_VARIABLES.hot, accent.hot)
  style.setProperty(ACCENT_VARIABLES.deep, accent.deep)
  style.setProperty(ACCENT_VARIABLES.rgb, accent.rgb)
}

function retractAccent() {
  const style = document.documentElement.style
  for (const name of Object.values(ACCENT_VARIABLES)) style.removeProperty(name)
}

const ACCENT = 'var(--shiva-accent)'
const ACCENT_HOT = 'var(--shiva-accent-hot)'
const ACCENT_DEEP = 'var(--shiva-accent-deep)'
function accentAlpha(alpha) {
  return 'rgba(var(--shiva-accent-rgb), ' + String(alpha) + ')'
}

// ── tokens ────────────────────────────────────────────────────────────────
// The palette expressed in the harness's own alias tokens. Overriding aliases
// rather than shipping a parallel stylesheet keeps the theme from fighting the
// product: every surface already reads these variables. True black stays solid
// for inverted ink and borders; the large surfaces are black WITH ALPHA so the
// backdrop reads through the field, the sidebar and the panels. There is
// deliberately no grey: labels that would dim remap onto saturated hues.

const SHIVA_TOKENS = {
  '--dsw-alias-bg-base': 'rgba(0, 0, 0, 0.26)',
  '--dsw-alias-bg-layer-1': 'rgba(7, 7, 7, 0.58)',
  '--dsw-alias-bg-layer-2': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-bg-layer-3': 'rgba(20, 20, 20, 0.78)',
  '--dsw-alias-bg-overlay': '#050505',
  '--dsw-alias-bg-module-platform': 'rgba(7, 7, 7, 0.58)',
  '--dsw-alias-bg-skeleton': accentAlpha(0.10),
  '--dsw-alias-bg-mask-1': 'rgba(0, 0, 0, 0.82)',
  '--dsw-alias-bg-mask-2': 'rgba(0, 0, 0, 0.68)',
  '--dsw-alias-bg-mask-3': 'rgba(0, 0, 0, 0.50)',
  '--dsw-alias-bg-multi-select': accentAlpha(0.16),

  '--dsw-alias-border-l1': accentAlpha(0.22),
  '--dsw-alias-border-l2': accentAlpha(0.38),
  '--dsw-alias-border-l2-darkmode-thin': accentAlpha(0.38),
  '--dsw-alias-border-l3': accentAlpha(0.62),
  '--dsw-alias-border-l4': ACCENT,
  '--dsw-alias-border-inverted': '#000000',
  '--dsw-alias-border-inverted2': '#000000',

  '--dsw-alias-brand-primary': ACCENT,
  '--dsw-alias-brand-primary-invert': '#000000',
  '--dsw-alias-brand-text': ACCENT,

  '--dsw-alias-label-primary': '#FFFFFF',
  '--dsw-alias-label-secondary': ACCENT,
  '--dsw-alias-label-tertiary': '#4DE1FF',
  '--dsw-alias-label-caption': ACCENT,
  '--dsw-alias-label-dimmed': '#4DE1FF',
  '--dsw-alias-label-primary-dimmed': '#FFFFFF',
  '--dsw-alias-label-primary-bluish': '#4DE1FF',
  '--dsw-alias-label-primary-inverted': '#000000',
  '--dsw-alias-label-primary-foreground': '#FFFFFF',

  '--dsw-alias-button-primary-fill': ACCENT,
  '--dsw-alias-button-primary-hover': ACCENT_HOT,
  '--dsw-alias-button-primary-dimmed': ACCENT_DEEP,
  '--dsw-alias-button-contrast-fill': ACCENT,
  '--dsw-alias-button-elevated-fill': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-button-floating-fill': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-button-floating-hover': 'rgba(20, 20, 20, 0.78)',
  '--dsw-alias-button-ghost-active-fill': accentAlpha(0.14),
  '--dsw-alias-button-ghost-active-hover': accentAlpha(0.22),
  '--dsw-alias-button-ghost-active-border': accentAlpha(0.38),
  '--dsw-alias-button-info-fill': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-button-info-hover': 'rgba(20, 20, 20, 0.78)',
  '--dsw-alias-button-tool-bar-fill': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-button-tool-bar-hover': accentAlpha(0.16),

  '--dsw-alias-interactive-bg-hover': accentAlpha(0.12),
  '--dsw-alias-interactive-bg-hover-accent': accentAlpha(0.20),
  '--dsw-alias-interactive-bg-hover-solid': 'rgba(20, 20, 20, 0.78)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(255, 46, 99, 0.18)',
  '--dsw-alias-interactive-bg-active': accentAlpha(0.24),

  '--dsw-alias-state-success-primary': '#00E676',
  '--dsw-alias-state-success-secondary': 'rgba(0, 230, 118, 0.20)',
  '--dsw-alias-state-error-primary': '#FF2E63',
  '--dsw-alias-state-error-secondary': 'rgba(255, 46, 99, 0.20)',
  '--dsw-alias-state-warn-primary': ACCENT,
  '--dsw-alias-state-warn-secondary': accentAlpha(0.20),
  '--dsw-alias-state-warn-label': '#000000',
  '--dsw-alias-state-business-primary': '#4DE1FF',

  '--dsw-alias-markdown-code-block': '#050505',
  '--dsw-alias-markdown-code-block-banner': 'rgba(13, 13, 13, 0.68)',
  '--dsw-alias-markdown-inline-code': accentAlpha(0.16),
  '--dsw-alias-markdown-citation': '#4DE1FF',
  '--dsw-alias-markdown-tag': ACCENT,
  '--dsw-alias-markdown-placeholder': '#4DE1FF',

  '--dsw-alias-scrollbar-bg-l1': accentAlpha(0.20),
  '--dsw-alias-scrollbar-bg-l2': accentAlpha(0.14),
  '--dsw-alias-scrollbar-hover-l1': ACCENT,
  '--dsw-alias-scrollbar-hover-l2': ACCENT_HOT,

  '--dsw-alias-tooltip-bg': '#101010',
  '--dsw-alias-toast-bg': '#101010',

  '--dsw-specific-sidebar-fill': 'rgba(0, 0, 0, 0.40)',
  '--dsw-specific-sidebar-nav-item-hover': accentAlpha(0.12),
  '--dsw-specific-sidebar-nav-item-active': accentAlpha(0.20),
  '--dsw-specific-sidebar-nav-item-active-accent': ACCENT,
  '--dsw-specific-bubble': 'rgba(13, 13, 13, 0.68)',
  '--dsw-specific-bubble-highlight': accentAlpha(0.14),
  '--dsw-specific-input-major': 'rgba(7, 7, 7, 0.58)',
  '--dsw-specific-menu': '#0A0A0A',
  '--dsw-specific-selector': 'rgba(13, 13, 13, 0.68)',
  '--dsw-specific-tip': 'rgba(13, 13, 13, 0.68)',
}

// ── brand ─────────────────────────────────────────────────────────────────
// The wordmark glyph: the trishula, Shiva's trident, as flat geometry with no
// colour of its own. Applied as a CSS mask over var(--shiva-accent), so it
// follows whichever accent is selected.

const TRISHULA_GEOMETRY = '<g fill="#000">' +
  '<path d="M11.6 2.2h1.9v20.6h-1.9z"/>' +
  '<path d="M4.4 3.1c.9 2.6 1.3 4.7 1.3 6.6 0 1.6-.3 3-.9 4.6l1.8.7c.7-1.8 1-3.5 1-5.3 0-2.2-.5-4.6-1.4-7.3z"/>' +
  '<path d="M20.7 3.1 18.9 2.4c-.9 2.7-1.4 5.1-1.4 7.3 0 1.8.3 3.5 1 5.3l1.8-.7c-.6-1.6-.9-3-.9-4.6 0-1.9.4-4 1.3-6.6z"/>' +
  '<path d="M12.55 0 9.8 4.6h5.5z"/>' +
  '<path d="M5.35 1.5 3.3 5h4.1z"/>' +
  '<path d="M19.75 1.5 17.7 5h4.1z"/>' +
  '<path d="M4.6 14.1h15.9v1.8H4.6z"/>' +
  '<circle cx="12.55" cy="19.4" r="1.5"/>' +
  '</g>'

const WORDMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 24">' +
  '<g transform="translate(0,0.5) scale(0.95)">' + TRISHULA_GEOMETRY + '</g>' +
  '<text x="32" y="17.5" font-family="\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="1.6" fill="#000">SHIVACODE</text>' +
  '</svg>'

function dataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim())
}

// The sidebar mark: the ShivaCode app icon (desktop/build/app-icon.png,
// downscaled to 128px and inlined so the plugin carries its own artwork on
// web and desktop alike). Full colour, so it is painted, not masked.
const SHIVA_MARK_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAADAFBMVEVMaXHh2M8MFREXJh0eKiEUHBgNEg8TFhAdPh4qSSVHVE8IFQsDEQYuQTQKGQ8GIQoFGwoDFgUGOwsKLBEDJQcuQDUyQzplcmwLHhBJVlFtenOMzm+Y2nkkSygDHgdHbEgkZyCh34EmXyh8uGkPSRIHNAyjrKdholCm5oSapJ4vPTYpbiNZnkYHHwur6YlorVNSlUIvbS6KxXUDHwWs5JACKQckYiQTVxRmolkIIQ2BjodBhzVXZV628o0ibB1Nikq06ZcPPhgCLQYRRRWstbAjZB6PmZPC+Z0YUBpqtVIvPTY3Qj1neGoRQBUscyORm5ZRlkMLNRAhXiA4fC0TThYoaiQ6S0E+fzMQRhVFU0wQRxIjYCEDKgckYiJRkkFaZmABKQUHPAxKjzwBJQUZOSEraidpeW8PRxOTyIAeXB1qq1chZxwwQTc9fDVVnEJpdW9mjVwPQxMvcShIVk8FNAtwrWFPlz1YnkgIPA0DLAlNW1Q9fDVGiDlOX1VQZlRpqlcWShp3g3xBgzcxdSg2azJSZFhusldXnEUdUiE8SEMfWx4rNjJgoU1rr1Z5tWVGeEGNmJB1uF2LmY9RX1ddoE5lmFpOgkeEjomepqI5cjTO+a9UjkmY0IDC86Rodm6AvmkvPTe7wr5cbGI9UkR2ul6RzXiirqWPxXeIlI2Fy2aNt4FejlS/xsGJx26Gtnhsjmud04SBqXsJFRALIhILGhIeKyYbKCMdMiYTKBtQXlhMWlVEUUsPIhcXLR8hMCokNi0QNxhBTEcEGApzgHk2djJKkD0PMRctVjUWQR3f5OAYNiC5wb1ea2QpRDK69ZZ4hX3ByMSR1HQlPS7HzckaSiGCv24zXzu68JwFEAtEf0LQ1tN4vV8wPTghXSKe1oU6fzJ1tGPY3dqh53wcPSVqqlq99J2FyGqz7pNamU8fVCSw7Ytzt1tuwFWb4HiS3G+D1GKq7INfqUp2y1ql3oyzu7cDJgqIlY4pTDI+bER+xGOGzWiL2WnJ/Kb1+fa5657l/8HPjOeeAAAA3HRSTlMAAhQhBgoOAQMC/hosEyZYPkX9/mEdYP4y/f3+/i9NKf7+/f7+fP7+/v6o/v04/v3+/vyD/rLs/fxy/v7+/kb+/v6PR/2AZP7u/Zn+G3Dy/amvVbVjbEfsxNWdsp6f50jN6tC8VeGMrP7PpTtuxGvYDdWU78f9upzZ3Jt76oJj6YzWkdLLt72H34LA3cjSmeJ+fUHc7N9QxdDt/cT9/rPXwdXfn+jqj6nt6OP4ocLHxeP7//////////////////////////////////7////////////////////+I6KLKgAAAAlwSFlzAAAuIwAALiMBeKU/dgAAGeBJREFUeNrtWwdYVNe2XnPmtHEKbei9g9KLgKggiIpiVGzYe++99xJjjzGJJjHJTS83971PUARRUIpEEERBRGoQ6SCI5Vnie2ufGRAsCMZ3/d73smBgOMOc9e+1V197AP6mv+lv+r9NnETy72XHtb1A0wDPX/vfJAlNt+HG0VSwKXDvTv5gusDDN4Tm3xUAESxt8nh6WPzOZCCC4ccsZls7g+QdAeBhRP5nTVspBvi/oIl8O1v8Gg1g5BCSOxTkcpTAmwuBeSUDXvV4FXAR6Cqgd+D7IBYHB0s7pomcpEO63REp4PpZVhd6564CfsSmpsPhfEdUUUK3y49rXngH7gTzpi4YsVgAIP440P7pAu4t2ALPddwDUF/lPj0sRQArgd7nlYSqIHrde96mu5BAuFexb1EwAhgKEOLx2SbT16sh15n9516jS7zsuyavTTJhC+TM0IrwjprBa6Tc/HK74pLgf6ELKPreGVQA4MNA07cEoIV5awQSnpe0tSS5LgPU91/xpuy83FXsYpgbOO9Ff8Lx/Eu4dWgfOGRPc7TkpW/hQBy0fD6zmP3Pr6QI4Okqxpye69X75Q7tzQyDIyYteeZdxRoa4lZhWOnusWKArSnz/VeMLjsvcCiYs59XIACOF/GtWcsHB01n/rptSsB0SV7eEgP1HqP/mVOU0+S72pSf/R2jy5gHDqXp8JymYNXmcq3eFhGQ424LdCeC+ytCxeAVgYGVEbotDmBXYFJOzhJd5oscTTllXrEKqKFPSEBgRg4Nb94IvNmwPC+Pol1sx0XwMvVEbQA6wivZPtBns9pPAhOUfMzLYvwo2Pvkc4Y291rFs3MdeoMptbXplsc8teIgbJ+iIovA7tI32INmAyCqj/z4IPunTcdm+0xXr46nzTxKJgcb8Foe31OMucsqgLkuvUGX2ftFt8B1gsjxDoOrZgca57rOYlEEvIQHpiNb0ax1z36hIVEMM3jBjPeOFc2RkyuISJfel9t9vFgEv3lQvLnD+wgAJcAH+x5r8pgnIdoqgekDvrj13qxxSpahyLsYmumAOnI03yYwycZHLBmmZYCbT4NZ96dfzEIJYBIup2BEWW6S7WLut+9pMC9FAPst54H04yf7VoaDrgSXr0tFeOR2M0MgEl4s5wdP2CyV8HQnPRVHtGi21bBgCiO/CLSSnljJeBoYSqpLg4ar126a/QoBmNYtBPjQxFRkWvQdWgpvoDTgablsQG6yBr6P51hTsF1xrGhCK+3smDFIQDzAy/8L64TBHEMcE7P9VncZzytmbZ+lQIksrR5Hw28/82BeTwDUmwKVtRPjoTjCfdd0HhQDKtazIglwDEvTM3K7zd5EqW/c4YArAVm2ZVlTifYwhRS3D9PPW90NaHpWTu7sXVIRrGsYB/Djzxwd9mghAx8+VgHgYWxJblF3A3BGABTNkDoCNJL6Wzd9/iapu617jnFgUsJ8XYqj5bAgYw4FstFePkV5mgDrSicA/PYdB4sfLqSkHz7U5Snj/egzZwRafGGvBPGuitEKYHmGBYPugeWue8WvzvzaIYXf5JrPktZoUJRcAEADO8cyJ8PNFgHULQXY9xXQi/MXMtIPa1lgf54L4Ode4dGUpIn/Vz1aipovBsWMp8a2LMqC77xDRLWlh1l/5r5Gi5XL6QUZ41hWrhjuZF99QAwhj0cC7NyHcTF0IQcLG1mQEABji/KdtmmIgN3tsh4xUbxsxtOszVhAMBhDOx2vOWBpak3+Z0mTxbyc2ZoxjpZTNC9W5u+jJSPvIIC9CCDM9ROAhYcZYEM/BGpdfQhHoyqwEQ5TadRV8YynJpvRdokac3Sn3GBzDitenXPM3Y/Wha0ZRzUXoz6CZNNehguvDUf/sxdgMQHw/mG0z03vs+KR+b3R6UhA42iv4TQtggleRWN5Edcp2XOtPAHx6c7aRdbL5SyYuXltp8Qs2sPelRQT3hgMsGolAnD6RAILJyLsvQuB6t04j0d9lx2tmKiJWQs9tf84mpV0NhhxrS/Q9LQc68m6wEiUbl5bcVMg7JdfzGHm7JlA/+uXMDg0+wcG9v9yCA798gMLB2f3Y0HE7/BC/jxu2NSKka3iMce/PvZyL9QRCKBkjS5N5BpQtI7RhX6//34Q/vFnGn/o9z9/gH/+eVWse+PPf8IPf/4xCS//AwW/rojwJ19TMwiAFsbcs5+vcEjcixohWo4SYGhyP631sz+hCYB+hBN36A9E8s8/L4vNrxIAv98QALDwicd6wp/DQLgyYymRQBsb7Fx5gIi8c0pSxCSS0KA52voQ9Eu72w+O3DgCk+5ePgg/3LATy+2u/gAzL/cdBUcuHwFz69Ey5I+ZLA0LKpa+kQciwseoxgku2bukSNtWpCpUZQc+njQzMXHmpEU9Fs1fm5n5pfmXPYw2TjLK/HLUjkyjDZMWZS6a//FRBYk8hL/zpuoQlQ7wdKczQXV6gJF4gKVHH018wvMQtmdQF6TYmFh8xMTGqn/EEsLLsV1On+5ybtBGYYd5rBkrpkqbC05ewneqZ6DQEvIPTIiAHWfisVzBkDi/p2BIGqHLKrp69Sp5EFJfIS+mx8/HG9BA7XQZzqrNmuM6laNzoBxgtXo6biPJKYAbm5UzjMV2wJ54xxvI7AbSH4R+b6Y/mom8dLUnQUAzcy2XMkSUCACDe8jS4A6HYx403Iue2q+Wqtw3GtbYnBW2YE7447Jv3HgBwR+/t/BHmdxIPzsf6P0eS2mRRFg8ptLbmgJ9g4EHrkOlJ3hblyQFVil5IYqTZujmMt/pewoc79pdvpoWM+icik4joUYIj9OnhUuDMm9cTbO7nH5W78OSkUD4kzWzoJVTYpG7tCUevcYUeQhys/Rw8fFm1IqDoWxwwKB4x6v66ZfTBl0/RegM0kWBbuID/8BLp07FXde/MSTG7mr62QOfNIubkzAw66HXbOMRz8q39hFwIA1a72TiYeMHJI4JyTF0PTvkcpqd3d2C4w+uIf0XobyAgMoVvmUllQEBeXnkwrVr0df10xzvpl3uuUdXeBvZQjkoK12cnOZ0okjBwk5rTkVOH6wFaCFX5sDz675pd6/eLbj+4EL8lUtIDy4QGAFlAQFlecj+2rULFx5cukQQXE27e/lTrFzUxRwj0pzYv9jTgOHalDyvLo0FqYlA0T1jhbYmabyIDvXr12/gQLu7aXbx1y89OBsff+nBgwcXBLpGGOM3YX7pypVLVy5EX09P65u2xe8DfJM5iDCjlh3on+yJz1oxbVsCPNdGExwQhiHNGRm+On5aWhT10+W+97vORwDnrl+6cPbs2StX4uPj8XFFEIWKmi/dRAQ90tI+dd5hl3Z5JtED2fZbjUG4H6Tox5qb59oxA1IK0vgv6lRgdIa1r++vvx64n2aX6Kdnd/duwZlr8cg//sRZNcUTtlcIIPLXifjo6Oj4C1GJCECxY0jfu/+x/8cf/7WiwnV8s2DblP0vokDtG79kuS2rEgJBUBPq6uR29NuZGzdq6tn17Tso+sKJs/HRJwi1YLiC+3EFuRPC16IfxCXevfupbNShjRu2J7s1NtY42aoMAm1K13ZWkKq3LaFfNAU02OX2Tb7aa/xoASZ6cy0ZkjgsbHGYxnxHFYD46JMnmklAcMGjafaFaALg5ImT0dE3LxAAW2SmYWFhjFSmqWXmrF4Qr1BOziuyjlAIRabkZfavTHLw97KutFqOAY3jmv0G+1Nfx8yueo52CODayegTJ5sRnCUIbuZ99t9F2SiVkwIJAPr23ULtQMAzVc1DniSlEnCOyLMPTDb29RP8AfcyAH7uDpWWdS6B3dYoSApCbBBtmUIAqAOOdnaDbl47EX3yZGsRxN8sefJZZUJ8dCsARggAEMBdzNvITWiJBMVvtrqkv4mLfRHZkZe7Iiy9xycbJ0dElOdaYDnCNmdQ7I4vZ27Q1BtiZ1egBoAIUNZXos+ejY6uanoS6F6VHa1GIACws9vCbJw588uNzT0FhqI0pqzoP3rYtnLXseyrszIOtwlD/yzjwG42S4aN3Ww7ODjY1DwME2uG0hvi6IgAoqNVfC5aWQecQZW7mJfR39jGt6TqYvQZvH7mohoApUu8iUhubhocPGLw5lm7fHyf+GsBq2UAL+tFqqdvgmZIgJlVfqupqcnSJKv8YUlZZd6WI0cWBevdH4IAkm7eRD5nolPzip4IAFJLMvpXapc9mZ3UJ1qID9nXThk5Oi6CDT8dOfLx4bIS6/IsE8smryav/uu1SGRVr5zjWjtDoqVooFjMMsK2S2xHr1+/furUlcOHD58QMiLT8b6+pl6PIUMQQPbNM2dOnKkqq+iVEXAGN8KqqJeLRYJvRoZXZTaJSRetrsUJANbed7TbEYI3WLly5dSpUye6bcOakeGJQnBEJVqP+ziOMVC0TshEZBjAMjQnBHP2m8RFH4n1ety/f0kFICHJuFdDLwf3M2dwB6p7ldsk+Ff3qs7IsUo4c+Zm1bVT+kOGoASMtmRuENSNw4XR2CkAUUtexIkYStIqAXRe4j5gvFKm0DLT1NIw09I0YLlWO0Se0qCX2eN+QWpx9s2L2ZUODaXV+YUpuOA+NdUNyToXE7oRSJZ5fS7etHIXAJCuVMs9JCQT4aWsmJJKFQZiqczAdtfRWVRLocAueVhRlFRYaFWoJqtdc3bvHjdhQkjIyPDwUab9Dh6cySKAHpdSk1JTrXIaShtKk7UjSVJQZdJQV4i/79k0Vjc0VJdVpVYhgPv3F9GTDh48eCjMfF74yJCQCRPG7d69vfszsiouqsgZqwaAAiiu8zHuX5FL6NatW7n4lVFR4eJSWpdVnr/C9796oA6I9RIzM6+kJmX3aSytr8u3uBdHspJTxaWl+dokQYnULjYuratO7pNtdSq9Rw/UgR6Ojr/a1zw0ri9tqK7IyMi41f/YsVtqqnhi7GM5mm3uPVLdLXNM/Ls9IwtC3eeohDB4ulGPxBipnlFi5pXs4uw+TvW36/21dYS0KMG1rjQ5Uniqo43ISpP7VFnFIYBvYK1Rj/vfzsPlhyxdOnz4tm3bZrzXivzrPEzGtQxZeOU21/c8cfNVZKahZUBRz0oJetSoUaagZ2SUGJ/qnpBQ/Pj27fqywhTCtupR/eMqIotTCe4P627XP+6WkG0V1zMz8xsePcCo1lMEXKeYbSbGbMGmpVSLO8ZWiGZrK6CUnp6eQbZKDTOZgkJFEpG0Qk9f3yg+tbhPgo5F7e07tx/l9Tl1Sqf48eNQnThEkFpp8vh2fa3PvT5WVpE9ExO/oUWisDAR+kCWYg3MzLQ0NDTMsGvTMlji2dZ+gBeCFU+aiRg0xJMtrJFKSlaU+Vb+unfu1i1DftIXT9fX149PcE9IiTyvnXznzp3HZdmnEhpv3y6+FxcXZ5Vff+f27WTt85Ep2VaRMUZGH8GGzCFDPt+/c98m3xUrSkrIDQPGC8UOTawbp45thq2cMBPB7AVxakzuVl1XXl7+MB+zgUYnt7wZRvcTY3RRAvpnUwpTdCKjzt+zCL1Tezspsqr2zh2fqLi4SLfHtbdrLe6dj4o8lVqlAvAt6sCB9W5OjaE1+Q/xduXGGfbLneUGBoyE2PjLkkJsAaQGuGtrJ92qWW3raas00zKQySiWYdfOXLuW10tPT49OqdKJi4qKOi8Iwf1e0p07jTqRCMBfWP5xfCkuITsqVl//Ixi1duaXesBKMaHQNNNQKpVBo/uX2UxxD9ht8IqUFCPO6hwTy7KyjNBhbNshueCIevZMj9bJjiMAjp9HIdxJuudUe6f4fFxUXGTyHVz+cQIgUic1yhAB0M8HfAlW9xkerk0mWXNeMWTFhGyAi0VNQ5bTeNRKQjisMZNhx/PLTz/dIVcDiIyMOk7o/Hkbmz6htbU2hGtUlc155C8AiEyNOp2e/hFs3PLpp58QCaCXxxKLQdeoedS4FO3/KPsqAJLloS5Z3cdqCD09dJ9+3a2tV/h+/HnifeIHevbseQKXpwaACM53q61tvEf4R52/rrp4nAA4fi49fQx8QHTgY4yGOb62qgKHB6ly9yOX8ohXDYlRBLbDJyhUAQP5e1o51Li5jU6a89GWb8awejExPU9EJhxvBnA86p5bbW3xedyQ41HN1wiChOPnevYcA3ofLfpm+6rPJx62dykJAiHcY5CjBw8PaZ6ivCQtVGUqqoSJ8i50cZ2GWojTBmKoCCBGANDCK6UxNNSGAHjGnmyCCoBaByQMIx1XXTZMdcaBo1tngy/JytA8Baj4ktzbx6FmjZhoII01zkZGLyY25mRkCi6xmVmktrb2+eNtCF+MSjl+LiZmDJiqKiP8orb1qvSmRAJjMtuTdKA0ZGyn+FiW65hhw1gCrH4Po1hGD9swCOB6C4Ko49eRWrO/ji9Fki0gAD7Qz+yxAYR6SDE6o3KKt1mHZwWojcOSciwfaQfRqmidnph+jtKLNYwZdD0hUljm9WZFFGwgqtX6I1Mi47BthADSjRI3qHwsaCRXZFkPkHW4Xw0ahXWulsVr1NGCnjRp0ihAAIb6g44LCOIi0fug/xGo1S/kj46yZ3oXBCAeNWmSOhixEGT8sLzEE/iOAtCycHjPxN+vFWKeAOgSazToekqkoGvITiclJSWhT5+ElFMpKQL/KLL+qHT904YxY+i2w89HTr7GQR0FgCX9NDcH19WKZgA86dWYLsMuXBejgusJhG9qanZ2VWGhhXtysYVVoVVVdnZq6sWElATkn37O0DDmA2wZtwzdJSDdlmUyw6DDR21QCZVjbVuFa6wqR4D5sthBBWQXdAghCFx9arZVYSpSQkKKcDUyLl1/UMHp2B1gbg7P1B1zgREjqM706bi2XpzWmDiDhVHLsEFpqB9z7rSqQSU0qU4/I9Kl0kf54wbgbDFgo6pJpbqhqLOz/FaHD7BIDvKtnI7xCBF0Meyin2iUqKJMgdR/JBoR6ok9M8IfmO05W9lnMud4ln/j+b3GFOv8sehQUBG7oCkIfTmBDLsYNpPwt6pvZzhGl0hfdsBhAdtK7Xj+Tfn72RiXDxNGvzx8ILSFsTsc8xyRC+QVQ8PYcwZCsxo0/Cs+Z9/COTc/n6ysJaqmKZY487t27Tpw4ED8+XXXr7/uSp6QH6pL5NfAgc6qZWMwc+u/1/kvH1k0GPBF1pSWe3Kvd6eowCJVfkdPc+ufZwb8XwMwPrmXj6fQ9EdjlI6LYOSUnJWIFbogl4nloBBLecZAV44n2nBMbIBXlLvCeXULhJpcYzK2FQCu04M7fMc0N0ttMwKAJ8aICxo1qGA6fFvwNZgPKpgPAwv2MIv3FAyEDwr2iOHrgq7AjKvcLSM1OJa83pUmq1ulPx2MRm1Pt3knO9iQKILG6F1mPxhgUpfTerA2dgyYG8Z+gE+W0fJlsd/ChhhDcxgT2xVAur18hgYeA8K3jLc30f5L5y3xJpMRgCZpqjmvzikfi6KYdJoA6LKMNl/WBQEYLqPFywwJgGXm9DLDrshWNtohyVtOso9pCEAT+Dc/YIZ50RoEQOxKc4pHVgSxKnpWqgKcx00HmL9ZF0wn4JMRm8Wgu2ssXsmeTlRFmdzLf7kUwXojADOguTcXAO2p49SAEgDxEmMTdUDfbsWCuHgejtAX4OR0dLjqCRzAgX54kmpgiAZYHEQGXvYONtPk9Bsd6FSdopim3a3adTJ6Vr8kYgxCn2Gqv5TRcCIj44kIwH4dDq8n4ux4IqLY6BQu/A87OT9rDdYWym4ZWIv4tSdnpt31R7iZVOdPIWc2lMWWq0mHE28+0c3P+f1HcznYf5iHxflbEUkjAyNrnEbAutrBwshQNNkpawq2ZHnv4mrL8iqNV6oBmmr7eUmdv2WSJ3HjSn+XAQrBGDSdGqeZ/2xRsxDmhrJgfhtP0ayqZcSbktwmSoff3ixMSlH9s7TJ+NBM29gpv6adTIQzaA+ApoVlgKW7kgDw9Hex0SKGLJ/WGOoZ9qjy4ULYjwcnTOvxROXch5SWa2VNst+2+iVaaP+0AECMxYB0+SNXj9D2cjFZe+dm6WHJJm7DsI6gmwGgMiY7JE+Tvp8/lIUfHxrAvDpykuqRKTfB1WmzmU29tZUtKTiI+isIcOcZ5fkDXp0KYT3enobSjJathnB8UjSt2MWGjE+Dkk3y83F7Mbrz+8qd2d6lCGB/PU7kZApQWmXlZw2Q4v97owTQGeHEllIqFe1pOtXeeTtV0wCji6a3tivxR+jbalzdSxEAtkxGZOXjmdJS3IJVvYaThgOedjLxqUvCfiiMd+tVuEYpVaVWErp9U2/XEwntcs0pASUV/t5CQ78wywUHQGQ2vs8hhEUAeIxC9p1JMJlPs0vyq/NXEwkobYyL7N29heOvr6uE6NeHV29XS4dQYlb4pTlrt5IcExHRX+VTYujtsBJzpaF15EQl8OLB40guiwHZs9DF2NLCD97CWWI01SkmxfYPJ9Oq03TqGAFaNeVmvAAA2KkNE9QVfcs5LPc6H5PkDgF4fYYBw9xcLJM0VKqMLXgSaoGe6lI9UQrhDQggJKtXTbjq0IBI3WxiludXG3e8GHvNJklt58xRtkEqAYVxcnJWMIxswANDO7N8Sre2WSwHirEzIsze0kcv0K55/vlD98w+E5NQAwKAga11HvUjn1ssyujtnSXHol7EPx+oeu/bNwJgQgOe2aKGfreVeeH49ds9zf7CcrDuJ6dE7Psbj0R/Qb9ksznuLX+k5/klYsMH1jm8Z7yTeKV/x6ednk8pSe9jZF2l5c63vtiO26uEGWq8ad47+5SPqunNcPAuP2wnalWDvyMIHPxNb1+5/58R864BaMA7tiODt6wFPPdv1kLuuY/BshLoXCT+S76UfCCJpdsAwOQFjxHi+Q+a7VBK+j/h9AFkVYslwAAAAABJRU5ErkJggg=='
const SHIVA_WORDMARK_URI = dataUri(WORDMARK_SVG)

// ── stylesheet ────────────────────────────────────────────────────────────
// Type, motion, and the brand swap — everything tokens cannot express — all
// scoped under one body attribute so switching the theme off takes the whole
// layer away in one step. The alias tokens are written straight into this
// sheet: registration alone only paints while the harness considers this theme
// the selected appearance, and its persisted light/dark preference competes.

const THEME_ATTRIBUTE = 'data-shiva-theme'
const WORDMARK_VIEWBOX = '0 0 182 24'
const MARK_VIEWBOX = '0 0 23.16 17.04'
// Both the sidebar and the conversation hero render the same mark svg; the
// width the host asks each of them for is what tells the two apart.
const SIDEBAR_MARK_WIDTH = '24'
// Slot occupants are anchored in a `div[data-slot]` wrapper carrying
// `display: contents`, so the wrapper is out of layout but sits in the DOM
// between the host's element and the mark. Reaching a mark's surroundings goes
// through that anchor: a selector that steps straight from the host's span to
// the svg matches nothing.
const SIDEBAR_MARK_SLOT = '[data-slot="sidebar.brand.mark"]'
const HERO_MARK_SLOT = '[data-slot="conversation.hero.brand.mark"]'
// The painted edge of the app icon. The mark svg's own box is 24x17.7 (the
// fish ratio), which the icon does not share: sizing the element squarely is
// what lets the artwork read at more than the fish's height. Expanded, the
// logo row gives 44px between its paddings and clips at 60; collapsed it drops
// its padding and clips at 36, the edge of the toggle the mark rides there, so
// the rail takes the smaller edge.
const SIDEBAR_MARK_EDGE = '44px'
const RAIL_MARK_EDGE = '36px'

function stylesheet() {
  const scope = 'body[' + THEME_ATTRIBUTE + ']'
  const sidebarMark = 'svg[viewBox="' + MARK_VIEWBOX + '"][width="' + SIDEBAR_MARK_WIDTH + '"]'
  // The headline row: mark, phrase, preview badge, in that order.
  const heroHeadline = scope + ' div:has(> span > ' + HERO_MARK_SLOT + ')'
  // The group holding the mark and the name inside the brand button.
  const brandIdentity = scope + ' button > span:has(> span > ' + SIDEBAR_MARK_SLOT + ')'
  // Collapsed, the mark is the toggle's own child rather than the brand group's.
  const railMark = scope + ' button > span > ' + SIDEBAR_MARK_SLOT + ' > ' + sidebarMark
  const tokens = Object.entries(SHIVA_TOKENS).map(([name, value]) => '  ' + name + ': ' + value + ';').join('\n')
  return '\n' + scope + ' {\n' + tokens + '\n}\n\n' +
'/* Type: a terminal-adjacent stack, system fonts only (must survive air-gapped). */\n' +
scope + ' {\n' +
'  --shiva-display: "Rajdhani", "Bahnschrift", "DIN Alternate", "Segoe UI Semibold", system-ui, sans-serif;\n' +
'  --shiva-mono: "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace;\n' +
'  font-feature-settings: "ss01", "cv01";\n' +
'  letter-spacing: 0.01em;\n}\n\n' +
scope + ' > #root,\n' + scope + ' > div[id],\n' + scope + ' > main {\n  position: relative;\n  z-index: 1;\n}\n\n' +
'/* A translucent body background propagates to the document canvas whose own\n' +
'   default is white; pin the document element to true black. */\n' +
'html:has(> ' + scope + ') {\n  background-color: #000;\n}\n\n' +
'/* Chrome that must sit over content and be read stays opaque. */\n' +
scope + ' [role="menu"],\n' +
scope + ' [role="listbox"],\n' +
scope + ' [role="dialog"],\n' +
scope + ' [role="tooltip"],\n' +
scope + ' [role="alertdialog"],\n' +
scope + ' pre,\n' +
scope + ' pre > code {\n  background-color: #060606;\n}\n\n' +
'/* Typed fields keep enough body to hold a caret steady against texture. */\n' +
scope + ' textarea,\n' +
scope + ' input[type="text"],\n' +
scope + ' input[type="search"],\n' +
scope + ' select,\n' +
scope + ' [contenteditable="true"] {\n  background-color: rgba(4, 4, 4, 0.82);\n  color: #fff !important;\n}\n\n' +
scope + ' textarea::placeholder,\n' +
scope + ' input[type="text"]::placeholder,\n' +
scope + ' input[type="search"]::placeholder,\n' +
scope + ' [contenteditable="true"]::placeholder {\n  color: rgba(255, 255, 255, 0.58) !important;\n}\n\n' +
scope + ' h1, ' + scope + ' h2, ' + scope + ' h3, ' + scope + ' h4 {\n  font-family: var(--shiva-display);\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n\n' +
scope + ' code, ' + scope + ' pre, ' + scope + ' kbd {\n  font-family: var(--shiva-mono);\n}\n\n' +
'/* Contrast floor: hard-coded greys lift to white. */\n' +
scope + ' [style*="color: rgb(1"], ' + scope + ' [style*="color:#8"], ' + scope + ' [style*="color:#9"] {\n  color: #fff !important;\n}\n\n' +
'/* One transition curve everywhere, accent lift on clickables. */\n' +
scope + ' button,\n' + scope + ' a,\n' + scope + ' [role="button"],\n' + scope + ' [role="tab"],\n' + scope + ' [role="menuitem"] {\n' +
'  transition: background-color 140ms ease, color 140ms ease,\n    box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease;\n}\n\n' +
scope + ' button:hover:not(:disabled),\n' + scope + ' [role="button"]:hover,\n' + scope + ' [role="menuitem"]:hover {\n' +
'  color: ' + ACCENT_HOT + ';\n  box-shadow: 0 0 0 1px ' + accentAlpha(0.35) + ', 0 0 14px ' + accentAlpha(0.18) + ';\n}\n\n' +
scope + ' button:active:not(:disabled) {\n  transform: translateY(1px);\n}\n\n' +
scope + ' :focus-visible {\n  outline: 2px solid ' + ACCENT + ';\n  outline-offset: 2px;\n}\n\n' +
scope + ' ::selection {\n  background: ' + accentAlpha(0.32) + ';\n  color: #fff;\n}\n\n' +
scope + ' textarea,\n' + scope + ' input[type="text"],\n' + scope + ' input[type="search"],\n' + scope + ' [contenteditable="true"] {\n  caret-color: ' + ACCENT + ';\n}\n\n' +
'/* Brand: the wordmark and sidebar mark replaced keyed on each svg viewBox\n' +
'   (stable across builds). The wordmark is a mask over the accent, so its\n' +
'   geometry carries no colour; the mark is the app icon, painted as its own\n' +
'   full-colour artwork. Original artwork hidden, layout box kept. */\n' +
scope + ' svg[viewBox="' + WORDMARK_VIEWBOX + '"] {\n  background-color: ' + ACCENT + ';\n  -webkit-mask: url("' + SHIVA_WORDMARK_URI + '") left center / contain no-repeat;\n  mask: url("' + SHIVA_WORDMARK_URI + '") left center / contain no-repeat;\n}\n\n' +
scope + ' ' + sidebarMark + ' {\n  width: ' + SIDEBAR_MARK_EDGE + ';\n  height: ' + SIDEBAR_MARK_EDGE + ';\n  background: url("' + SHIVA_MARK_URI + '") center / contain no-repeat;\n}\n\n' +
'/* The brand button clips to its own content height, and that height comes\n' +
'   from the identity group, pinned to the 24px the fish needed. The group has\n' +
'   to carry the mark before the button can show it whole. */\n' +
brandIdentity + ' {\n  height: ' + SIDEBAR_MARK_EDGE + ';\n}\n\n' +
'/* Collapsed, the same mark is the rail toggle and rides its 36px button\n' +
'   directly, one span down from the expanded brand. */\n' +
railMark + ' {\n  width: ' + RAIL_MARK_EDGE + ';\n  height: ' + RAIL_MARK_EDGE + ';\n}\n\n' +
scope + ' svg[viewBox="' + WORDMARK_VIEWBOX + '"] > *,\n' +
scope + ' ' + sidebarMark + ' > * {\n  visibility: hidden;\n}\n\n' +
'/* The hero headline is the phrase alone: the fish and the preview badge on\n' +
'   either side of it are dropped. Dropping them alone would leave their grid\n' +
'   columns and the 10px gaps behind, so the row is re-tracked onto the one\n' +
'   span that remains. */\n' +
scope + ' span:has(> ' + HERO_MARK_SLOT + ') {\n  display: none;\n}\n\n' +
heroHeadline + ' > span:nth-child(3) {\n  display: none;\n}\n\n' +
heroHeadline + ' {\n  grid-template-columns: auto;\n}\n\n' +
heroHeadline + ' > span:nth-child(2) {\n  grid-column: 1;\n}\n\n' +
'/* Reduced motion: the backdrop is removed outright. */\n' +
'@media (prefers-reduced-motion: reduce) {\n' +
'  ' + scope + ' canvas[data-shiva-matrix] { display: none; }\n' +
'  ' + scope + ' button, ' + scope + ' a, ' + scope + ' [role="button"] { transition: none; }\n}\n'
}

// ── matrix ────────────────────────────────────────────────────────────────
// The slow backdrop. Hand-written canvas, no dependency: 5.5 steps per second,
// 55% column density, translucent wash for the fading tail. Texture the eye
// can ignore, not motion that competes with the text.

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'
const CELL = 16
const STEPS_PER_SECOND = 5.5
const DENSITY = 0.55

class MatrixRain {
  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.setAttribute('aria-hidden', 'true')
    this.canvas.setAttribute('data-shiva-matrix', '')
    this.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.5'
    this.context = this.canvas.getContext('2d')
    this.drops = []
    this.active = []
    this.frame = 0
    this.last = 0
    this.accumulated = 0
    this.onResize = () => { this.measure() }
    this.tick = (now) => {
      this.frame = requestAnimationFrame(this.tick)
      const context = this.context
      if (context === null) return
      const elapsed = now - this.last
      this.last = now
      this.accumulated += Math.min(elapsed, 250)
      const interval = 1000 / STEPS_PER_SECOND
      if (this.accumulated < interval) return
      this.accumulated %= interval
      const width = window.innerWidth
      const height = window.innerHeight
      context.fillStyle = 'rgba(0, 0, 0, 0.16)'
      context.fillRect(0, 0, width, height)
      context.font = String(CELL) + 'px "Cascadia Code", "Consolas", monospace'
      context.textBaseline = 'top'
      for (let column = 0; column < this.drops.length; column += 1) {
        if (!this.active[column]) continue
        const y = (this.drops[column] ?? 0) * CELL
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0'
        if (y > 0 && y < height) {
          context.fillStyle = '#CFFFE0'
          context.shadowColor = '#00FF9C'
          context.shadowBlur = 8
          context.fillText(glyph, column * CELL, y)
          context.shadowBlur = 0
          context.fillStyle = 'rgba(0, 255, 156, 0.55)'
          context.fillText(glyph, column * CELL, y - CELL)
        }
        this.drops[column] = (this.drops[column] ?? 0) + 1
        if (y > height && Math.random() > 0.985) {
          this.drops[column] = Math.random() * -14
          this.active[column] = Math.random() < DENSITY
        }
      }
    }
  }
  start() {
    document.body.prepend(this.canvas)
    this.measure()
    window.addEventListener('resize', this.onResize)
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }
  stop() {
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this.onResize)
    this.canvas.remove()
  }
  measure() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(window.innerWidth * ratio)
    this.canvas.height = Math.floor(window.innerHeight * ratio)
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0)
    const columns = Math.ceil(window.innerWidth / CELL)
    this.drops = Array.from({ length: columns }, () => Math.random() * -10)
    this.active = Array.from({ length: columns }, () => Math.random() < DENSITY)
  }
}

// ── preferences ───────────────────────────────────────────────────────────
// Theme only, so two facts in localStorage: on/off and the accent id.

const LIVE_KEY = 'dsh-shiva-theme.live'
const ACCENT_KEY = 'dsh-shiva-theme.accent'

function readPref(key, fallback) {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : v
  } catch { return fallback }
}
function writePref(key, value) {
  try { window.localStorage.setItem(key, value) } catch { /* memory mode: not persisted */ }
}

function createStore() {
  const listeners = new Set()
  const state = {
    live: readPref(LIVE_KEY, 'true') !== 'false',
    accent: accentById(readPref(ACCENT_KEY, DEFAULT_ACCENT_ID)).id,
  }
  return {
    get: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    setLive(live) {
      if (state.live === live) return
      state.live = live
      writePref(LIVE_KEY, live ? 'true' : 'false')
      for (const l of listeners) l()
    },
    setAccent(id) {
      const next = accentById(id).id
      if (state.accent === next) return
      state.accent = next
      writePref(ACCENT_KEY, next)
      for (const l of listeners) l()
    },
  }
}

// ── theme surface ─────────────────────────────────────────────────────────
// The stylesheet and the backdrop appear and disappear atomically: a sheet
// without the rain is a black screen missing its texture, and rain without the
// sheet is glyphs over the product's own palette.

const SHIVA_THEME_ID = 'shiva'
const FALLBACK_THEME_ID = 'dark'

function createSurface() {
  let style
  let rain
  return {
    get mounted() { return style !== undefined },
    mount() {
      if (style !== undefined) return
      const el = document.createElement('style')
      el.setAttribute('data-shiva-theme', '')
      el.textContent = stylesheet()
      document.head.append(el)
      style = el
      document.body.setAttribute(THEME_ATTRIBUTE, '')
      // Duplication is deliberate: the surfaces are translucent, so if the
      // html:has rule ever fails to apply the product composites grey.
      document.documentElement.style.backgroundColor = '#000'
      // The canvas exists only while the theme is active: an idle animation
      // loop behind a theme nobody selected is pure cost.
      rain = new MatrixRain()
      rain.start()
    },
    unmount() {
      style?.remove()
      style = undefined
      rain?.stop()
      rain = undefined
      document.body.removeAttribute(THEME_ATTRIBUTE)
      document.documentElement.style.removeProperty('background-color')
    },
  }
}

function applyThemeFeature(ctx, store) {
  // ctx.theme is a merged Context property: accessing it requires the plugin
  // to declare the service dependency, so the feature mounts as an inner
  // plugin that injects 'theme' (cordis then waits for ui-theme to be up).
  ctx.plugin({
    inject: ['theme'],
    apply(pluginCtx) {
      const theme = pluginCtx.theme
      const surface = createSurface()
      let liveDisposer

      const activate = () => {
        const disposers = []
        if (theme && typeof theme.register === 'function') {
          disposers.push(theme.register({ id: SHIVA_THEME_ID, colorScheme: 'dark', tokens: SHIVA_TOKENS }))
          // Courtesy: lets the appearance list show the theme. What paints is
          // the stylesheet, which never asks the persisted light/dark
          // preference.
          if (typeof theme.setTheme === 'function') {
            try { theme.setTheme(SHIVA_THEME_ID) } catch { /* already selected or mid-boot */ }
          }
        }
        publishAccent(accentById(store.get().accent))
        surface.mount()
        return () => {
          surface.unmount()
          retractAccent()
          try {
            if (theme && typeof theme.getTheme === 'function'
              && theme.getTheme().active.id === SHIVA_THEME_ID
              && typeof theme.setTheme === 'function') theme.setTheme(FALLBACK_THEME_ID)
          } catch { /* registry already gone */ }
          for (const dispose of disposers.reverse()) dispose()
        }
      }

      const sync = () => {
        if (store.get().live) {
          if (liveDisposer === undefined) liveDisposer = activate()
          else publishAccent(accentById(store.get().accent))
        } else if (liveDisposer !== undefined) {
          liveDisposer()
          liveDisposer = undefined
        }
      }

      ctx.effect(() => store.subscribe(sync), 'shiva-theme: preference sync')
      ctx.effect(() => () => { liveDisposer?.(); liveDisposer = undefined }, 'shiva-theme: teardown')
      sync()
    },
  })
}

// ── settings card ─────────────────────────────────────────────────────────
// The one control: a switch, and — under it — the accent swatches. Inline
// styles: this bundle loads through the client ModuleLoader, and style objects
// need nothing from a build.

function ShivaThemeCard({ store }) {
  const h = React.createElement
  const [live, setLive] = React.useState(store.get().live)
  const [accentId, setAccentId] = React.useState(store.get().accent)
  React.useEffect(() => store.subscribe(() => {
    setLive(store.get().live)
    setAccentId(store.get().accent)
  }), [store])

  const styles = {
    card: {
      display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px',
      border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '12px',
      background: 'var(--dsw-alias-bg-layer-2)',
    },
    head: { display: 'flex', flexDirection: 'column', gap: '4px' },
    title: { margin: 0, fontSize: '14px', color: 'var(--dsw-alias-label-primary)' },
    blurb: { margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' },
    row: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      paddingTop: '10px', paddingBottom: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)',
    },
    rowText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
    rowLabel: { fontSize: '13px', color: 'var(--dsw-alias-label-primary)' },
    rowHint: { fontSize: '11px', lineHeight: 1.45, color: 'var(--dsw-alias-label-secondary)' },
    swatches: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '4px 0 2px 16px' },
    track: {
      position: 'relative', width: '38px', height: '22px', flex: '0 0 38px',
      padding: 0, borderRadius: '11px', border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer',
    },
    thumb: {
      position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
      transition: 'left 120ms ease',
    },
  }

  return h('section', { style: styles.card, 'aria-label': 'Shiva theme' },
    h('div', { style: styles.head },
      h('h3', { style: styles.title }, 'Shiva theme'),
      h('p', { style: styles.blurb }, 'Signal colour on true black, app icon mark and glyph backdrop.')),
    h('div', { style: styles.row },
      h('div', { style: styles.rowText },
        h('span', { style: styles.rowLabel }, 'Theme'),
        h('span', { style: styles.rowHint }, 'Paints the appearance the moment dsh web opens; switching off hands it back to the dark palette.')),
      h('button', {
        type: 'button', role: 'switch', 'aria-checked': live, 'aria-label': 'Shiva theme',
        onClick: () => store.setLive(!live),
        style: { ...styles.track, background: live ? 'var(--dsw-alias-brand-primary, #F0B90B)' : 'var(--dsw-alias-bg-layer-3, #202127)' },
      }, h('span', {
        style: {
          ...styles.thumb, left: live ? '18px' : '2px',
          background: live ? '#000' : 'var(--dsw-alias-label-secondary, #9a9aa5)',
        },
      }))),
    live && h('div', { style: styles.swatches, role: 'radiogroup', 'aria-label': 'Shiva primary colour' },
      ACCENTS.map((candidate) => h('button', {
        key: candidate.id,
        type: 'button', role: 'radio', 'aria-checked': candidate.id === accentId,
        title: candidate.label, 'aria-label': candidate.label,
        onClick: () => store.setAccent(candidate.id),
        style: {
          width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
          background: candidate.base,
          border: candidate.id === accentId ? '2px solid #000' : '2px solid transparent',
          boxShadow: candidate.id === accentId ? '0 0 0 2px ' + candidate.base : 'none',
        },
      }))),
  )
}

function applySettingsCard(ctx, store) {
  // ctx.slots is a merged Context property like ctx.theme: the card mounts as
  // an inner plugin that declares the dependency.
  ctx.plugin({
    inject: ['slots'],
    apply(pluginCtx) {
      const slots = pluginCtx.slots
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return
      slots.inject('settings.plugin.item', () => slots.register({
        name: 'settings.plugin.item',
        key: 'dsh-shiva-theme',
      }, (props) => React.createElement(ShivaThemeCard, { ...props, store })))
    },
  })
}

// ── apply ─────────────────────────────────────────────────────────────────

function apply(ctx) {
  const store = createStore()
  applyThemeFeature(ctx, store)
  applySettingsCard(ctx, store)
}

  exports.apply = apply
  return module.exports
} })
