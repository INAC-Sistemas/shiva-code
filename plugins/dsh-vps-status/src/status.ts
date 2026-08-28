/**
 * The `vps_status` wire contract: what the configured endpoint must answer,
 * how that answer is validated, and how it is rendered for a reader.
 *
 * The endpoint is a network boundary, so its JSON is validated here rather
 * than trusted — a typed interface says nothing about what a remote host
 * actually sends. Percentages are derived locally from the reported byte
 * counts, keeping one source of truth: the endpoint reports what it measured,
 * this module owns every number computed from it.
 */

/** One measured resource as the endpoint reports it. */
export interface UsageBytes {
  /** Total capacity in bytes; must be positive. */
  totalBytes: number
  /** Bytes currently in use; must be zero or positive. */
  usedBytes: number
}

/** One measured resource after the derived percentage is added. */
export interface Usage extends UsageBytes {
  /** `usedBytes / totalBytes` as a percentage, rounded to one decimal. */
  usedPct: number
}

/** The endpoint's answer, validated. */
export interface VpsStatus {
  /** Filesystem usage. */
  disk: Usage
  /** RAM usage. */
  memory: Usage
}

/** Rejection of a malformed endpoint answer, carrying the offending field path. */
export class VpsStatusFormatError extends Error {
  constructor(path: string, detail: string) {
    super(`vps_status: endpoint answered with an invalid \`${path}\`: ${detail}`)
    this.name = 'VpsStatusFormatError'
  }
}

/**
 * Read one non-negative finite number from an unvalidated object field.
 * @param source - the candidate object holding the field.
 * @param path - dotted field path, used in the rejection message.
 * @param key - the field to read.
 * @returns the validated number.
 * @throws VpsStatusFormatError when the field is absent, non-numeric, non-finite, or negative.
 */
function readCount(source: Record<string, unknown>, path: string, key: string): number {
  const value = source[key]
  if (typeof value !== 'number') throw new VpsStatusFormatError(`${path}.${key}`, `expected a number, got ${typeof value}`)
  if (!Number.isFinite(value)) throw new VpsStatusFormatError(`${path}.${key}`, 'expected a finite number')
  if (value < 0) throw new VpsStatusFormatError(`${path}.${key}`, 'expected zero or a positive number')
  return value
}

/**
 * Validate one resource block and derive its usage percentage.
 * @param raw - the candidate value at that path.
 * @param path - dotted field path, used in the rejection message.
 * @returns the resource with `usedPct` derived.
 * @throws VpsStatusFormatError when the block is not an object or a count is invalid.
 */
function readUsage(raw: unknown, path: string): Usage {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new VpsStatusFormatError(path, 'expected an object')
  }
  const source = raw as Record<string, unknown>
  const totalBytes = readCount(source, path, 'totalBytes')
  const usedBytes = readCount(source, path, 'usedBytes')
  // A zero total would make the percentage meaningless rather than merely
  // wrong, so it is a contract violation and not a clamped edge case.
  if (totalBytes === 0) throw new VpsStatusFormatError(`${path}.totalBytes`, 'expected a positive number')
  return { totalBytes, usedBytes, usedPct: Math.round(usedBytes / totalBytes * 1000) / 10 }
}

/**
 * Validate a decoded endpoint answer.
 * @param raw - the decoded JSON body, however malformed.
 * @returns the validated status with derived percentages.
 * @throws VpsStatusFormatError on any contract violation.
 */
export function parseVpsStatus(raw: unknown): VpsStatus {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new VpsStatusFormatError('(root)', 'expected a JSON object')
  }
  const source = raw as Record<string, unknown>
  return { disk: readUsage(source.disk, 'disk'), memory: readUsage(source.memory, 'memory') }
}

/** Binary unit steps; the endpoint reports bytes and the reader wants GiB. */
const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const

/**
 * Format a byte count for a human reader.
 * @param bytes - a non-negative finite byte count.
 * @returns the count in its largest whole unit, with one decimal above bytes.
 */
export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return unit === 0 ? `${value} ${UNITS[0]}` : `${value.toFixed(1)} ${UNITS[unit]}`
}

/**
 * Render one validated status as the single line the model and the UI read.
 * @param status - the validated status.
 * @returns one line covering both resources.
 */
export function formatVpsStatus(status: VpsStatus): string {
  const line = (label: string, usage: Usage): string =>
    `${label} ${usage.usedPct}% (${formatBytes(usage.usedBytes)} of ${formatBytes(usage.totalBytes)})`
  return `${line('disk', status.disk)} · ${line('memory', status.memory)}`
}
