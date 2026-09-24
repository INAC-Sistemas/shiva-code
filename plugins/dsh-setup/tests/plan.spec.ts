import { describe, expect, it } from 'vitest'
import { memoryInstalling, planSetup, SETUP_VERSION, withMemoryStep } from '../src/plan.ts'
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

describe('the memory step and the OpenViking installer', () => {
  it('waits while the install is still running, and stops waiting once it lands', () => {
    // The install starts by itself at plugin boot, so a fresh machine reaches
    // this step mid-install.
    expect(memoryInstalling({ installed: false, phase: 'idle' })).toBe(true)
    expect(memoryInstalling({ installed: false, phase: 'installing' })).toBe(true)
    expect(memoryInstalling({ installed: true, phase: 'done' })).toBe(false)
  })

  it('stops waiting on a failed install, so the step never traps the person', () => {
    expect(memoryInstalling({ installed: false, phase: 'error' })).toBe(false)
  })
})

describe('a memory step whose plugin answered late', () => {
  it('takes its own place before the summary', () => {
    expect(withMemoryStep(['chat', 'image', 'summary'], 0)).toEqual(['chat', 'image', 'memory', 'summary'])
  })

  it('is never offered twice', () => {
    const planned = ['chat', 'memory', 'summary'] as const
    expect(withMemoryStep(planned, 0)).toEqual(['chat', 'memory', 'summary'])
  })

  it('leaves a wizard already on its summary alone', () => {
    expect(withMemoryStep(['chat', 'summary'], 1)).toEqual(['chat', 'summary'])
  })
})
