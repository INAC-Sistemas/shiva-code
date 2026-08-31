/**
 * Pure helpers for the host summarize service. Kept dependency-free so they
 * are unit-testable without a cordis runtime.
 *
 * Context-engineering strategy (asymmetric window):
 * - The surface is split into a RECENT window (near-verbatim, no model) and
 *   an EARLIER background (heavy compression by the fast model).
 * - The model only ever compresses the EARLIER part; the recent part carries
 *   the current state verbatim, so "对最新一条消息提问" keeps its anchor.
 */
import type { SidebarqaStreamChunk, SidebarqaSurfaceEvent } from './context-types.ts';
import { type PromptLocale } from './prompt-locale.ts';
/** Per-segment char cap for the verbatim recent window. */
export declare const RECENT_SEGMENT_MAX = 400;
/** Per-segment char cap for the background window handed to the model. */
export declare const BACKGROUND_SEGMENT_MAX = 400;
/** Per-segment char cap for the `trim` strategy's verbatim tail. */
export declare const TRIM_SEGMENT_MAX = 1000;
/** One user/assistant text segment in model-history order. */
export interface SurfaceSegment {
    role: 'user' | 'assistant';
    text: string;
}
/** Extract the semantic text of one surface event ('' when non-text). */
export declare function textOfEvent(event: SidebarqaSurfaceEvent): string;
/**
 * Fold the surface into ordered user/assistant segments (newest-last).
 * @param events - current surface events in model-history order.
 */
export declare function extractSegments(events: readonly SidebarqaSurfaceEvent[]): SurfaceSegment[];
/** Split segments into the EARLIER background and the RECENT verbatim window. */
export declare function splitRecent(segments: readonly SurfaceSegment[], recentCount: number): {
    earlier: SurfaceSegment[];
    recent: SurfaceSegment[];
};
/**
 * Render segments as role-labeled, turn-separated text (the model input for
 * the background, or the verbatim recent window).
 */
export declare function formatSegments(segments: readonly SurfaceSegment[], maxPerSegment: number, locale?: PromptLocale): string;
/**
 * The `trim` strategy's injected context: the last `count` segments VERBATIM
 * (role-labeled, per-segment bounded) — deterministic, zero LLM cost. A count
 * of 0 or negative yields an empty string; a count ≥ the segment count keeps
 * the whole tail.
 */
export declare function buildTrimContext(segments: readonly SurfaceSegment[], count: number, maxPerSegment?: number, locale?: PromptLocale): string;
/**
 * Render the EARLIER background window for the model, NEWEST-FIRST. We want
 * the current progress (the tail of the earlier window — the messages just
 * before the verbatim recent band) to land at the model's strongest attention
 * position, instead of a flat chronological wall that ends with the opening
 * topic. The newest `count` of `earlier` are taken and reversed.
 */
export declare function formatBackground(earlier: readonly SurfaceSegment[], count: number, maxPerSegment: number, locale?: PromptLocale): string;
/**
 * Compose the final injected context: the model-compressed background plus the
 * verbatim recent window. Either part may be absent.
 */
export declare function composeSummary(background: string, recent: string, locale?: PromptLocale): string;
/** Result of assembling one stream: the accumulated text plus the terminal outcome. */
export interface AssembledText {
    text: string;
    failed: boolean;
}
/**
 * Accumulate the text deltas of one model stream until the terminal finish.
 * @param chunks - the `ctx.llm.stream` chunk iterable.
 * @returns the assembled text and whether the call errored or was aborted.
 */
export declare function assembleText(chunks: AsyncIterable<SidebarqaStreamChunk>): Promise<AssembledText>;
/**
 * The system prompt for the background compression. It only ever sees the
 * EARLIER part; the recent state is handled verbatim elsewhere. The prompt
 * forces a done/current/pending split so an early instruction already carried
 * out (e.g. "生成计划" before the plan was actually produced) is never
 * reported as a pending task.
 *
 * The input is handed NEWEST-FIRST (see the background helper in index.ts), so
 * the current progress sits at the model's strongest attention position. The
 * prompt mirrors that ordering and tells the model to anchor on the newest
 * state first, not on the opening topic.
 */
export declare function backgroundSystem(locale?: PromptLocale): string;
/** The zh system prompt — the pre-i18n constant, kept for callers and tests
 *  that predate the locale parameter. */
export declare const BACKGROUND_SYSTEM: string;
