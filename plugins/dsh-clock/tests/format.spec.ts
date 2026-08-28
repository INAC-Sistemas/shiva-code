import { describe, expect, it } from 'vitest'
import { formatClock, msToNextSecond, TICK_MS } from '../src/client/format.ts'

/**
 * Local-zone constructor: the reading is deliberately local wall time, so the
 * fixtures are built from local components rather than a UTC instant.
 */
function at(hours: number, minutes: number, seconds: number, ms = 0): Date {
  return new Date(2026, 7, 27, hours, minutes, seconds, ms)
}

describe('formatClock', () => {
  it('pads every field to two digits', () => {
    expect(formatClock(at(9, 5, 3))).toBe('09:05:03')
  })

  it('reads midnight as 00:00:00 and keeps 24-hour hours past noon', () => {
    expect(formatClock(at(0, 0, 0))).toBe('00:00:00')
    expect(formatClock(at(23, 59, 59))).toBe('23:59:59')
  })

  it('keeps one width across every second of the day', () => {
    const widths = new Set<number>()
    for (let hour = 0; hour < 24; hour++) widths.add(formatClock(at(hour, hour % 60, 59)).length)
    expect([...widths]).toEqual([8])
  })
})

describe('msToNextSecond', () => {
  it('waits the remainder of the current second', () => {
    expect(msToNextSecond(at(12, 0, 0, 250))).toBe(750)
    expect(msToNextSecond(at(12, 0, 0, 999))).toBe(1)
  })

  it('waits a whole tick on the boundary rather than firing immediately', () => {
    expect(msToNextSecond(at(12, 0, 0, 0))).toBe(TICK_MS)
  })
})
