/**
 * The ask orchestration: resolve the parent session's workspace and model,
 * assemble the parent context per the chosen history strategy, create the
 * side session, rename it `❓<主题>`, then prompt with the context +
 * quoted text + question. The parent session is never opened — its agent,
 * message stream, and queue are untouched.
 *
 * History strategies:
 * - `inherit`: fork the parent from its latest completed-turn boundary. The
 *   child inherits the FULL history as a frozen seed, so its first request
 *   reuses the parent's message prefix — DeepSeek's automatic prefix cache
 *   hits, no compression loss. The child keeps the parent's model (no
 *   selectModel — a different model would break the shared prefix). When the
 *   parent has no completed turn yet (agent mid-turn), the fork fails with
 *   `fork-unavailable` and the flow DEGRADES to `compressed`.
 * - `compressed`: the host compresses the earlier window with the fast model
 *   and keeps the recent band verbatim (default; existing behavior).
 * - `trim`: the host keeps the last N messages verbatim — no model, no cost.
 *
 * `parentSessionId` is ANY session (main or a nested 追问 session): nested
 * follow-ups are supported by the same flow.
 */
import type { Context } from '../context-types.ts';
import type { SidebarqaHistoryStrategy } from '../config.ts';
import type { PendingQuote, SidebarqaStore } from './store.ts';
import type { SidebarqaHistoryEntry, SidebarqaModelSelection } from '../context-types.ts';
/** Result of one ask. */
export interface AskResult {
    sideSessionId: string;
    parentSessionId: string;
    degraded: boolean;
    /** The strategy actually used (equals the requested one unless a fallback fired). */
    strategy: SidebarqaHistoryStrategy;
}
/** Progress phases reported to the panel (准备中 → 回答中). */
export type AskPhase = 'preparing' | 'answering';
/**
 * Run the full ask flow and return the created side session id.
 * @throws when create or prompt fails (the panel surfaces the error).
 */
export declare function askFollowUp(ctx: Context, store: SidebarqaStore, input: {
    parentSessionId: string;
    quote: PendingQuote;
    question: string;
    strategy?: SidebarqaHistoryStrategy;
    /** Model picked in the panel for the next ask (compressed/trim children;
     *  inherit children keep the parent's model by construction). */
    modelOverride?: SidebarqaModelSelection;
}, onPhase?: (phase: AskPhase) => void): Promise<AskResult>;
/**
 * Send a follow-up message inside an existing side session (no summary — only
 * the first message carries the compressed parent context, per PRD 6).
 */
export declare function sendFollowUp(ctx: Context, sideSessionId: string, question: string): Promise<void>;
/**
 * One-shot post-answer retitle: after the side session's FIRST turn completes,
 * fold the question + answer into a compact input, ask the fast no-thinking
 * title model (the summarize route: fixed flash / thinking off) for a ≤15-char
 * subject, and overwrite the placeholder `❓<topicFromQuote>` title.
 * Fires at most once per side session (the store flag), never blocks the
 * panel, and degrades silently to the placeholder on any failure.
 */
export declare function titleSideSessionOnce(ctx: Context, store: SidebarqaStore, input: {
    sideSessionId: string;
    parentSessionId: string;
    events: readonly SidebarqaHistoryEntry[];
}): Promise<void>;
