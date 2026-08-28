/**
 * Wall-clock formatting and tick scheduling — the two pure/timer pieces the
 * component keeps out of its render body.
 */

/** Milliseconds in one displayed tick (the clock shows seconds). */
export const TICK_MS = 1000

/**
 * Format a moment as a fixed 24-hour `HH:MM:SS` reading in the local zone.
 *
 * Hand-padded rather than `toLocaleTimeString`, so the separator and digit
 * count never follow the browser locale: the reading has to keep one width in
 * the header row whatever DSH's active language is.
 * @param at - the moment to read.
 * @returns the zero-padded `HH:MM:SS` reading.
 */
export function formatClock(at: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}

/**
 * Milliseconds from a moment to the next whole second.
 *
 * A plain 1000 ms interval drifts against the wall clock (each tick lands a
 * scheduling delay later), which makes the displayed second lag by up to a
 * full second. Re-arming on this remainder keeps every repaint on the boundary
 * it names. A moment already on the boundary waits a whole tick, never 0.
 * @param at - the moment to measure from.
 * @returns the delay to the next second boundary, in 1..1000 ms.
 */
export function msToNextSecond(at: Date): number {
  return TICK_MS - (at.getTime() % TICK_MS)
}
