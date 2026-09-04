import { describe, expect, it } from 'vitest'
import {
  initialUpdateStatus,
  reduceUpdateStatus,
  updateLogLine
} from '../src/main/update/update-state'

describe('desktop update state', () => {
  it('tracks an automatic download from discovery through completion', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: false })
    status = reduceUpdateStatus(status, { type: 'available', version: '1.1.0' })
    status = reduceUpdateStatus(status, { type: 'progress', percent: 52.37 })

    expect(status).toEqual({
      phase: 'downloading',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      percent: 52.4,
      manual: false
    })

    status = reduceUpdateStatus(status, { type: 'downloaded', version: '1.1.0' })
    expect(status).toEqual({
      phase: 'downloaded',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      manual: false
    })
  })

  it('preserves whether a check was initiated from the application menu', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: true })
    status = reduceUpdateStatus(status, { type: 'not-available' })

    expect(status.phase).toBe('up-to-date')
    expect(status.manual).toBe(true)
  })

  it('carries downgrade through transient events and clears it on reset', () => {
    const base = { ...initialUpdateStatus('1.5.0'), downgrade: true }
    expect(reduceUpdateStatus(base, { type: 'available', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'progress', percent: 40 }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'downloaded', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'reset' }).downgrade).toBeUndefined()
  })

  it('clamps invalid download percentages', () => {
    const status = {
      ...initialUpdateStatus('1.0.0'),
      availableVersion: '1.1.0'
    }

    expect(reduceUpdateStatus(status, { type: 'progress', percent: -5 }).percent).toBe(0)
    expect(reduceUpdateStatus(status, { type: 'progress', percent: 140 }).percent).toBe(100)
    expect(
      reduceUpdateStatus(status, { type: 'progress', percent: Number.NaN }).percent
    ).toBe(0)
  })
})

describe('updateLogLine', () => {
  it('records what an automatic failure would otherwise hide', () => {
    const status = reduceUpdateStatus(initialUpdateStatus('0.1.1'), {
      type: 'error',
      message: 'net::ERR_CONNECTION_REFUSED'
    })

    // An automatic check shows the user nothing on failure, so this line is
    // the only thing separating it from a check that found nothing.
    expect(updateLogLine(status)).toBe(
      '[desktop] [updater] error current=0.1.1 automatic - net::ERR_CONNECTION_REFUSED'
    )
  })

  it('names the offered version and whether the user asked', () => {
    const checking = reduceUpdateStatus(initialUpdateStatus('0.1.1'), {
      type: 'check',
      manual: true
    })
    expect(updateLogLine(checking)).toBe('[desktop] [updater] checking current=0.1.1 manual')

    const available = reduceUpdateStatus(checking, { type: 'available', version: '0.1.2' })
    expect(updateLogLine(available)).toBe(
      '[desktop] [updater] available current=0.1.1 available=0.1.2 manual'
    )
  })

  it('marks a rollback so a lower version does not read as a mistake', () => {
    const status = {
      ...reduceUpdateStatus(initialUpdateStatus('0.1.2'), {
        type: 'available',
        version: '0.1.1'
      }),
      downgrade: true
    }
    expect(updateLogLine(status)).toContain('downgrade')
  })

  it('stays on one line so the log stays greppable', () => {
    const status = reduceUpdateStatus(initialUpdateStatus('0.1.1'), {
      type: 'error',
      message: 'first line\nsecond line'
    })
    expect(updateLogLine(status).split('\n')).toHaveLength(1)
  })
})
