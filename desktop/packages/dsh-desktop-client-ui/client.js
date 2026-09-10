window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { FishLogo } = require('@deepseek-ai/dsh-client-ui-primitives')

    // The app icon, served from the frontend dist. install-brand-assets.mjs
    // copies desktop/build/icon.png here, so the sidebar mark, the favicon and
    // the installer icon are one file: change build/icon.png and all three
    // follow. It is square (1024x1024) and carries its own contrast, so one
    // asset serves the light and the dark theme.
    const BRAND_LOGO_URL = '/dsh-desktop-logo.png'

    /** The product name beside the mark. */
    const BRAND_NAME = 'Shiva Code'

    /** Marks the icon so the stylesheet below can size it per placement. */
    const BRAND_ICON_CLASS = 'dshDesktopBrandIcon'
    const STYLE_ID = 'dsh-desktop-client-ui-style'

    /**
     * Size the icon in the expanded sidebar head, where there is room for it.
     *
     * Both call sites ask for the same 24px — the expanded brand and the rail's
     * collapsed toggle — so the component cannot tell them apart and the width
     * comes from CSS instead. The rail keeps the 24px the element attributes
     * carry, because a larger icon there would crowd the toggle glyph beside it.
     *
     * Three stock rules clip an icon this size, and all three have to give: the
     * head row is 60px tall and hides its overflow, the box holding the mark
     * and the name is pinned to the name's own 24px line, and the row's items
     * hide their overflow too. Heights are released rather than re-pinned, so
     * the row grows to whatever the icon needs instead of matching it by
     * arithmetic; everything below the head moves down by what the row gains.
     *
     * Every rule is anchored on the sidebar root's data attributes, which the
     * app's own sidebar patch adds. That earns the specificity to win: matching
     * a CSS module class by substring ties with the module's own rule, and a
     * tie is settled by which stylesheet the shell injected last — not
     * something this plugin controls. The `wide` half also keeps the enlarged
     * icon out of the collapsed rail, where it would crowd the toggle glyph.
     *
     * The container classes are matched by substring because they are CSS
     * modules: only the hash prefix varies between builds.
     */
    function installStyles() {
      if (document.getElementById(STYLE_ID)) return
      const head = '[data-dsh-sidebar-root][data-dsh-sidebar-wide="true"]'
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = 'dsh-desktop-client-ui'
      style.textContent =
        `${head} [class*="logoRow"]{height:auto;min-height:104px;`
        + `padding-top:8px;padding-bottom:8px;overflow:visible}`
        + `${head} [class*="logoRow"]>*{overflow:visible}`
        + `${head} [class*="brandIdentity"]{height:auto}`
        + `${head} [class*="brandMark"] .${BRAND_ICON_CLASS}{width:88px;height:88px}`
      document.head.appendChild(style)
    }

    /**
     * The sidebar's brand mark: the app icon.
     * @param props.size - square edge in px the sidebar asks for (24 today), the
     *   size the rail keeps; the expanded head is widened by the stylesheet.
     * @returns the icon image, decorative — the name beside it carries the text.
     */
    function DesktopBrandMark({ size = 24 }) {
      return React.createElement('img', {
        className: BRAND_ICON_CLASS,
        src: BRAND_LOGO_URL,
        width: size,
        height: size,
        alt: '',
        'aria-hidden': 'true',
        draggable: false
      })
    }

    /**
     * The sidebar's brand name.
     *
     * Plain text rather than the stock `BrandWordmark`: that primitive draws
     * the "deepseek" lettering and the HARNESS badge as vector paths in one
     * svg, so neither can be replaced or dropped without replacing the whole
     * component. The sidebar's own `.brandName` supplies the weight, size and
     * letter-spacing, so the text needs no styling of its own.
     * @returns the product name.
     */
    function DesktopBrandName() {
      return React.createElement('span', null, BRAND_NAME)
    }

    function ConversationBrandMark(props) {
      return React.createElement(FishLogo, props)
    }

    const inject = ['slots']
    function apply(ctx) {
      installStyles()
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
