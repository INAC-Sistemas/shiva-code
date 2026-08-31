window.__ModuleLoader__.load({ id: 'dsh-shiva-theme', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-shiva-theme client half: the Shiva appearance for dsh web, ported
// one-to-one from the Shivacode theme. Signal colour on true black,
// translucent surfaces over a slow matrix backdrop, trident brand swap, five
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
// The mark: the trishula, Shiva's trident, as flat geometry with no colour of
// its own. Applied as a CSS mask over var(--shiva-accent), so it follows
// whichever accent is selected.

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

const TRISHULA_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 23">' + TRISHULA_GEOMETRY + '</svg>'
const WORDMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 24">' +
  '<g transform="translate(0,0.5) scale(0.95)">' + TRISHULA_GEOMETRY + '</g>' +
  '<text x="32" y="17.5" font-family="\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="1.6" fill="#000">SHIVACODE</text>' +
  '</svg>'

function dataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim())
}
const SHIVA_MARK_URI = dataUri(TRISHULA_SVG)
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

function stylesheet() {
  const scope = 'body[' + THEME_ATTRIBUTE + ']'
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
'/* Brand: the wordmark and rail mark replaced via masks keyed on each svg\n' +
'   viewBox (stable across builds). Masks over the accent, so the geometry\n' +
'   carries no colour. Original artwork hidden, layout box kept. */\n' +
scope + ' svg[viewBox="' + WORDMARK_VIEWBOX + '"] {\n  background-color: ' + ACCENT + ';\n  -webkit-mask: url("' + SHIVA_WORDMARK_URI + '") left center / contain no-repeat;\n  mask: url("' + SHIVA_WORDMARK_URI + '") left center / contain no-repeat;\n}\n\n' +
scope + ' svg[viewBox="' + MARK_VIEWBOX + '"] {\n  background-color: ' + ACCENT + ';\n  -webkit-mask: url("' + SHIVA_MARK_URI + '") center / contain no-repeat;\n  mask: url("' + SHIVA_MARK_URI + '") center / contain no-repeat;\n}\n\n' +
scope + ' svg[viewBox="' + WORDMARK_VIEWBOX + '"] > *,\n' +
scope + ' svg[viewBox="' + MARK_VIEWBOX + '"] > * {\n  visibility: hidden;\n}\n\n' +
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
      h('p', { style: styles.blurb }, 'Signal colour on true black, trident mark and glyph backdrop.')),
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
