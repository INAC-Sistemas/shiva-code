/**
 * The session-header wall clock: a live 24-hour `HH:MM:SS` reading rendered as
 * the leftmost entry of the header's utilities row.
 *
 * Styling is inline rather than a CSS module so the bundle carries no CSS
 * pipeline for one element. The values are DSH design tokens, so the reading
 * follows the active theme; `data-dsh-clock` is the stable hook for a profile's
 * own CSS to restyle it.
 */
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { formatClock, msToNextSecond } from './format.ts'

/**
 * Header metrics copied from the sibling "Session log" capsule (32 px row,
 * 13 px label), minus its border and background: the clock is a reading, not a
 * control. Tabular figures keep the width fixed while the digits change, so
 * the capsule beside it never shifts.
 */
const CLOCK_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 4px',
  color: 'var(--dsw-alias-label-secondary)',
  fontFamily: 'var(--dsw-font-family)',
  fontSize: 13,
  fontWeight: 400,
  lineHeight: '20px',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

/**
 * Render the live clock.
 *
 * The tick re-arms on each second boundary instead of running a fixed 1000 ms
 * interval, so the displayed second never drifts behind the wall clock; the
 * timer is cleared on unmount, which is also the plugin's unload path.
 * @returns the `HH:MM:SS` reading for the current second.
 */
export function Clock(): ReactNode {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = (): void => {
      timer = setTimeout(() => {
        setNow(new Date())
        arm()
      }, msToNextSecond(new Date()))
    }
    arm()
    return () => { clearTimeout(timer) }
  }, [])

  return (
    <time
      data-dsh-clock=""
      style={CLOCK_STYLE}
      dateTime={now.toISOString()}
      title={now.toLocaleString()}
    >
      {formatClock(now)}
    </time>
  )
}
