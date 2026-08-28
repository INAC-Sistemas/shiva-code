import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatVpsStatus,
  parseVpsStatus,
  VpsStatusFormatError,
} from '../src/status.ts'

const GIB = 1024 ** 3

/** A well-formed endpoint answer: 25 GiB of 50 GiB disk, 3 GiB of 8 GiB memory. */
const WELL_FORMED = {
  disk: { totalBytes: 50 * GIB, usedBytes: 25 * GIB },
  memory: { totalBytes: 8 * GIB, usedBytes: 3 * GIB },
}

describe('parseVpsStatus', () => {
  it('derives the usage percentage from the reported byte counts', () => {
    const status = parseVpsStatus(WELL_FORMED)
    expect(status.disk.usedPct).toBe(50)
    expect(status.memory.usedPct).toBe(37.5)
  })

  it('keeps the reported counts untouched', () => {
    expect(parseVpsStatus(WELL_FORMED).disk).toMatchObject({
      totalBytes: 50 * GIB,
      usedBytes: 25 * GIB,
    })
  })

  it('accepts an unused resource', () => {
    const status = parseVpsStatus({ ...WELL_FORMED, memory: { totalBytes: GIB, usedBytes: 0 } })
    expect(status.memory.usedPct).toBe(0)
  })

  it('names the offending field when a resource block is missing', () => {
    expect(() => parseVpsStatus({ disk: WELL_FORMED.disk }))
      .toThrow(/`memory`/)
  })

  it('names the offending field when a count is not a number', () => {
    expect(() => parseVpsStatus({ ...WELL_FORMED, disk: { totalBytes: '50', usedBytes: 1 } }))
      .toThrow(/`disk\.totalBytes`.*expected a number/)
  })

  it('rejects a zero total, which would make the percentage meaningless', () => {
    expect(() => parseVpsStatus({ ...WELL_FORMED, disk: { totalBytes: 0, usedBytes: 0 } }))
      .toThrow(/`disk\.totalBytes`.*positive/)
  })

  it('rejects negative and non-finite counts', () => {
    expect(() => parseVpsStatus({ ...WELL_FORMED, disk: { totalBytes: GIB, usedBytes: -1 } }))
      .toThrow(VpsStatusFormatError)
    expect(() => parseVpsStatus({ ...WELL_FORMED, disk: { totalBytes: GIB, usedBytes: Number.NaN } }))
      .toThrow(/finite/)
  })

  it('rejects a body that is not a JSON object', () => {
    for (const body of [null, 'ok', 42, [WELL_FORMED]]) {
      expect(() => parseVpsStatus(body)).toThrow(VpsStatusFormatError)
    }
  })
})

describe('formatBytes', () => {
  it('keeps raw bytes below one KiB and adds no decimal', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('steps up to the largest whole unit', () => {
    expect(formatBytes(1024)).toBe('1.0 KiB')
    expect(formatBytes(2.5 * GIB)).toBe('2.5 GiB')
    expect(formatBytes(1024 ** 5)).toBe('1.0 PiB')
  })
})

describe('formatVpsStatus', () => {
  it('reads both resources on one line', () => {
    expect(formatVpsStatus(parseVpsStatus(WELL_FORMED)))
      .toBe('disk 50% (25.0 GiB of 50.0 GiB) · memory 37.5% (3.0 GiB of 8.0 GiB)')
  })
})
