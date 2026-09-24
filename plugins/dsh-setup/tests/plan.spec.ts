import { describe, expect, it } from 'vitest'
import { planSetup, SETUP_VERSION } from '../src/plan.ts'
import type { SetupFacts } from '../src/plan.ts'

const done: SetupFacts = {
  chatReady: true,
  image: { available: true, configured: true },
  memory: { available: true },
  marker: { completedVersion: SETUP_VERSION, openviking: 'configured' },
}

describe('planSetup', () => {
  it('opens every available step on a machine that never finished', () => {
    expect(planSetup({
      chatReady: false,
      image: { available: true, configured: false },
      memory: { available: true },
      marker: { completedVersion: null, openviking: null },
    })).toEqual({ open: true, steps: ['chat', 'image', 'memory', 'summary'] })
  })

  it('stays closed once finished and every required tool still works', () => {
    expect(planSetup(done)).toEqual({ open: false, steps: [] })
  })

  it('reopens when the chat credential went away after finishing', () => {
    expect(planSetup({ ...done, chatReady: false }).open).toBe(true)
  })

  it('reopens when the image generator lost its model or key', () => {
    expect(planSetup({ ...done, image: { available: true, configured: false } }).open).toBe(true)
  })

  it('reopens once for a newer wizard version', () => {
    expect(planSetup({ ...done, marker: { completedVersion: '2000-01-01.1', openviking: 'configured' } }).open).toBe(true)
  })

  it('never reopens for a skipped memory step', () => {
    expect(planSetup({ ...done, marker: { completedVersion: SETUP_VERSION, openviking: 'skipped' } }).open).toBe(false)
  })

  it('omits the steps of plugins the profile does not load', () => {
    expect(planSetup({
      chatReady: false,
      image: { available: false, configured: false },
      memory: { available: false },
      marker: { completedVersion: null, openviking: null },
    })).toEqual({ open: true, steps: ['chat', 'summary'] })
  })

  it('does not hold the app for an image generator that is not loaded', () => {
    expect(planSetup({ ...done, image: { available: false, configured: false } }).open).toBe(false)
  })
})
