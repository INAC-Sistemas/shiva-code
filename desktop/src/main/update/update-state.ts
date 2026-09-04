import type { UpdateStatus } from '../../shared/contracts'

export type UpdateStateEvent =
  | { type: 'check'; manual: boolean }
  | { type: 'available'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'not-available' }
  | { type: 'error'; message: string }
  | { type: 'unsupported'; message: string }
  | { type: 'reset' }

export function initialUpdateStatus(currentVersion: string): UpdateStatus {
  return { phase: 'idle', currentVersion, manual: false }
}

export function reduceUpdateStatus(
  current: UpdateStatus,
  event: UpdateStateEvent
): UpdateStatus {
  const base = {
    currentVersion: current.currentVersion,
    manual: current.manual,
    downgrade: current.downgrade
  }

  switch (event.type) {
    case 'check':
      return { ...base, phase: 'checking', manual: event.manual }
    case 'available':
      return { ...base, phase: 'available', availableVersion: event.version }
    case 'progress':
      return { ...current, phase: 'downloading', percent: clampPercent(event.percent) }
    case 'downloaded':
      return { ...base, phase: 'downloaded', availableVersion: event.version }
    case 'not-available':
      return { ...base, phase: 'up-to-date' }
    case 'error':
      return { ...base, phase: 'error', message: event.message }
    case 'unsupported':
      return { ...base, phase: 'unsupported', message: event.message }
    case 'reset':
      return initialUpdateStatus(current.currentVersion)
  }
}

/**
 * Render one update status as a single log line.
 *
 * An automatic check shows the user nothing unless it finds a version, so a
 * check that failed, and a check that never ran, look identical from the app.
 * This line is what tells them apart in the Harness log.
 *
 * @param status The status to describe.
 * @returns One line, no trailing newline.
 */
export function updateLogLine(status: UpdateStatus): string {
  const parts = [status.phase, `current=${status.currentVersion}`]
  if (status.availableVersion) parts.push(`available=${status.availableVersion}`)
  parts.push(status.manual ? 'manual' : 'automatic')
  if (status.downgrade) parts.push('downgrade')
  // An updater error can carry a stack, and the Harness runtime appends to the
  // same file line by line; a multi-line entry would interleave with it.
  if (status.message) parts.push(`- ${status.message.replace(/\s*[\r\n]+\s*/g, ' ')}`)
  return `[desktop] [updater] ${parts.join(' ')}`
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}
