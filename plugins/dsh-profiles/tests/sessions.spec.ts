import { describe, expect, it, vi } from 'vitest'
import { sessionSwitch } from '../src/client/sessions.ts'

function services(entries: Record<string, unknown>) {
  return (name: string): unknown => entries[name]
}

describe('moving to a new conversation after a profile switch', () => {
  it('forgets the open session before a restart, so the reload opens a new one', () => {
    const clear = vi.fn()
    sessionSwitch(services({ sessions: { clear } })).forgetCurrent()
    expect(clear).toHaveBeenCalledOnce()
  })

  it('opens a new session through the packaged harness service name', () => {
    const startSession = vi.fn()
    sessionSwitch(services({ uiWorkspace: { startSession }, sessions: { clear: vi.fn() } })).startNew()
    expect(startSession).toHaveBeenCalledOnce()
  })

  it('opens a new session through the source client service name', () => {
    const startSession = vi.fn()
    sessionSwitch(services({ workspaces: { startSession } })).startNew()
    expect(startSession).toHaveBeenCalledOnce()
  })

  it('deselects the open session when no workspace service is provided', () => {
    const clear = vi.fn()
    sessionSwitch(services({ sessions: { clear } })).startNew()
    expect(clear).toHaveBeenCalledOnce()
  })

  it('does nothing while the services are not mounted', () => {
    const none = sessionSwitch(services({}))
    expect(() => { none.forgetCurrent(); none.startNew() }).not.toThrow()
  })
})
