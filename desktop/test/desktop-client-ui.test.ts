import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('DSH Desktop client slot occupants', () => {
  it('registers one occupant per brand seat and brands them with the app icon and product name', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const appended: Array<{ textContent?: string }> = []
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '' })),
      head: { appendChild: (node: { textContent?: string }) => appended.push(node) }
    }
    vm.runInNewContext(source, {
      document,
      navigator: { language: 'en-US' },
      window: {
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const BrandWordmark = vi.fn()
    const FishLogo = vi.fn()
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: (effect: () => void | (() => void)) => effect(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark, FishLogo }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Registration[] = []
    const slots = {
      inject: (_name: string, callback: () => unknown): unknown => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) {
          for (const _entry of result as Iterable<unknown>) void _entry
        }
        return result
      },
      register: (
        config: Registration['config'],
        component: Registration['component']
      ): (() => void) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({ slots })

    expect(plugin.inject).toEqual(['slots'])
    expect(registrations.map(({ config }) => config.name)).toEqual([
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark'
    ])
    // One stylesheet, and only to widen the icon in the expanded head: both
    // call sites ask for the same size, so placement cannot be told apart in
    // the component. The name needs no rule — the sidebar's own `.brandName`
    // carries the wordmark typography.
    expect(appended).toHaveLength(1)
    expect(appended[0]?.textContent).toContain('.dshDesktopBrandIcon{width:88px;height:88px}')
    // The stock rules that clip an icon this size are released, not re-pinned:
    // the head row's height and overflow, its items' overflow, and the
    // mark-and-name box pinned to the name's 24px line.
    expect(appended[0]?.textContent).toContain('[class*="logoRow"]{height:auto;min-height:104px')
    expect(appended[0]?.textContent).toContain('[class*="logoRow"]>*{overflow:visible}')
    expect(appended[0]?.textContent).toContain('[class*="brandIdentity"]{height:auto}')
    // Anchored on the sidebar patch's attributes: matching a CSS module class
    // by substring only ties with the module's own rule, and a tie is settled
    // by stylesheet order. `wide` also keeps the rail's icon at its own size.
    for (const rule of appended[0]?.textContent?.split('}').slice(0, -1) ?? []) {
      expect(rule).toContain('[data-dsh-sidebar-root][data-dsh-sidebar-wide="true"]')
    }

    // Plain text, not the stock wordmark: that primitive draws the "deepseek"
    // lettering and the HARNESS badge as vector paths in one svg, so neither
    // can be dropped without replacing the component.
    const sidebarName = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.name'
    )!.component({}) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarName.type).toBe('span')
    expect(sidebarName.props.children).toContain('Shiva Code')
    expect(sidebarName.type).not.toBe(BrandWordmark)

    // The app icon, square, carrying the class the stylesheet widens and the
    // asked-for size the collapsed rail keeps.
    const sidebarMark = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.mark'
    )!.component({ size: 24 }) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarMark.type).toBe('img')
    expect(sidebarMark.props.src).toBe('/dsh-desktop-logo.png')
    expect(sidebarMark.props.className).toBe('dshDesktopBrandIcon')
    expect(sidebarMark.props.width).toBe(24)
    expect(sidebarMark.props.height).toBe(24)

    const heroMark = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.mark'
    )!.component({ size: 48 }) as { type: unknown; props: Record<string, unknown> }
    expect(heroMark.type).toBe(FishLogo)
    expect(heroMark.props.size).toBe(48)
  })
})
