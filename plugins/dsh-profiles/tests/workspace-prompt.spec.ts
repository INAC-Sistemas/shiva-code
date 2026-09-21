import { describe, expect, it, vi } from 'vitest'
import { ADD_WORKSPACE_SELECTOR, guardAddWorkspace } from '../src/client/WorkspacePrompt.tsx'
import { ProfileStore } from '../src/client/store.ts'

/** A click target standing in for a DOM element: `closest` answers the add-workspace button or nothing. */
class FakeTarget extends EventTarget {
  constructor(private readonly button: { click(): void } | null) {
    super()
  }

  closest(selector: string) {
    return selector === ADD_WORKSPACE_SELECTOR ? this.button : null
  }
}

function click(target: EventTarget): Event {
  const event = new Event('click', { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('the add-workspace guard', () => {
  it('stops the click on the marked button and opens the prompt instead', () => {
    const store = new ProfileStore()
    const button = { click: vi.fn() }
    const target = new FakeTarget(button)
    const packageHandler = vi.fn()
    guardAddWorkspace(target, store)
    target.addEventListener('click', packageHandler)

    const event = click(target)

    expect(event.defaultPrevented).toBe(true)
    expect(packageHandler).not.toHaveBeenCalled()
    expect(store.getSnapshot().promptingWorkspace).toBe(true)
  })

  it('leaves every other click alone', () => {
    const store = new ProfileStore()
    const target = new FakeTarget(null)
    guardAddWorkspace(target, store)

    expect(click(target).defaultPrevented).toBe(false)
    expect(store.getSnapshot().promptingWorkspace).toBe(false)
  })

  it('replays the intercepted click once when the person stays on the same profile', () => {
    const store = new ProfileStore()
    const target = new FakeTarget(null)
    // The replayed click must pass the guard, so the button re-dispatches through it.
    const button = { click: vi.fn(() => { expect(click(target).defaultPrevented).toBe(false) }) }
    const guarded = new FakeTarget(button)
    const guard = guardAddWorkspace(guarded, store)
    guardAddWorkspace(target, store).dispose()
    click(guarded)

    guard.proceed()
    guard.proceed()

    expect(button.click).toHaveBeenCalledOnce()
  })

  it('stops listening once disposed', () => {
    const store = new ProfileStore()
    const target = new FakeTarget({ click: vi.fn() })
    guardAddWorkspace(target, store).dispose()

    expect(click(target).defaultPrevented).toBe(false)
  })
})

describe('the prompt flag', () => {
  it('opens and closes without touching the picker or the selection', () => {
    const store = new ProfileStore()
    store.openWorkspacePrompt()
    expect(store.getSnapshot()).toEqual({ active: null, picking: false, promptingWorkspace: true })
    store.closeWorkspacePrompt()
    expect(store.getSnapshot().promptingWorkspace).toBe(false)
  })
})
