import { afterEach, describe, expect, it } from 'vitest'
import { desktopBridge } from '../src/client/desktop.ts'

const host = globalThis as { dshDesktop?: unknown }

afterEach(() => { delete host.dshDesktop })

describe('desktopBridge', () => {
  it('is absent outside the desktop shell', () => {
    // The same page is served to a plain browser, where there is no process for
    // it to restart. Absent is a normal state, so the caller offers the manual
    // instruction instead of a button that could not act.
    expect(desktopBridge()).toBeUndefined()
  })

  it('is absent when the shell predates the method', () => {
    // The bridge is injected by another process's preload, so its shape is a
    // boundary: an older shell exposing the object without this method would
    // otherwise fail as a TypeError inside the click handler.
    host.dshDesktop = { openInFinder: () => undefined }

    expect(desktopBridge()).toBeUndefined()
  })

  it('is the injected object when the method is there', () => {
    const bridge = { restartHarness: () => Promise.resolve({ ok: true }) }
    host.dshDesktop = bridge

    expect(desktopBridge()).toBe(bridge)
  })
})
