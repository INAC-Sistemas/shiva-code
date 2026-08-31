/**
 * Pure helpers for the AskPanel's context-occupancy meter (port of the host
 * composer's ContextMeter arithmetic). Dependency-free for unit testing; the
 * projection value shape is the structural mirror from context-types.
 */
import type { SidebarqaContextPressure } from '../context-types.ts';
/** One meter reading: occupancy percent + its numerator/denominator. */
export interface SidebarqaContextOccupancy {
    percent: number;
    usedTokens: number;
    contextWindow: number;
}
/**
 * Compact token count: 517 / 12.2K / 517K / 1.2M (one decimal under three
 * digits). Port of the host StatsLine helper so both meters read identically.
 */
export declare function formatTokens(n: number): string;
/**
 * Approximate context occupancy: `projectedTokens` (the provider sample
 * carried forward over the surface's movement since) falls back to the bare
 * `pressureTokens`; both numerator and capacity must be known, else null.
 * @param pressure - the session's `contextPressure` projection value.
 * @returns occupancy, or null until both values are known.
 */
export declare function contextOccupancy(pressure: SidebarqaContextPressure | undefined): SidebarqaContextOccupancy | null;
