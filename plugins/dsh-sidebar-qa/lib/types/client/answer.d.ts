/**
 * Conversation-stream extraction from a side session's history feed. The panel
 * polls `ctx.connection.api.sessions.history` (the same tail-feed pattern
 * better-sidebar's SubagentView uses) and folds the raw events into an ordered
 * message transcript: user messages, settled assistant messages, plus the
 * in-flight chunk deltas of the running answer. Pure helpers here are
 * unit-testable without a runtime.
 */
import type { SidebarqaHistoryEntry, SidebarqaSessionEvent } from '../context-types.ts';
/** Extract the text blocks of an assistant/message event (reasoning excluded). */
export declare function textOfAssistantMessage(event: SidebarqaSessionEvent): string;
/** Extract the text blocks of a user/message event. */
export declare function textOfUserMessage(event: SidebarqaSessionEvent): string;
/** One transcript message (user or assistant). */
export interface TranscriptMessage {
    role: 'user' | 'assistant';
    text: string;
}
/** One transcript row plus the seq of its last event (anchoring + pagination). */
export interface TranscriptRow extends TranscriptMessage {
    seq: number;
}
/**
 * Locate the LAST `session/end-seed` event in a history page. A fork child's
 * log is `[seed…, session/end-seed, live…]`; the end-seed marks where the
 * inherited parent history ends and the child's own messages begin. Nested
 * forks can carry several markers, so the LAST one is the child's own
 * boundary (mirror of the core session contract's rule for stored history).
 * @returns the index of the last marker, or -1 when the page has none.
 */
export declare function lastEndSeedIndex(events: readonly SidebarqaHistoryEntry[]): number;
/** Whether the page contains a fork-seed boundary (i.e. inherited history). */
export declare function hasSeedHistory(events: readonly SidebarqaHistoryEntry[]): boolean;
/**
 * Fold one history page into an ordered message transcript. Chunks belonging
 * to the in-flight answer (seq past the last settled assistant message) are
 * appended as a trailing assistant message marked with `streaming`.
 */
export declare function transcriptOf(events: readonly SidebarqaHistoryEntry[]): TranscriptMessage[];
/**
 * Like {@link transcriptOf}, but each row also carries the seq of its last
 * event: settled messages use their event seq, the in-flight chunk aggregate
 * uses the last chunk's seq. The panel uses the seq to split inherited
 * (fork-seed) rows from the child's own rows and to anchor the initial view.
 */
export declare function transcriptRowsOf(events: readonly SidebarqaHistoryEntry[]): TranscriptRow[];
/**
 * Fold one history page into the current answer text: every settled assistant
 * message (in order) plus the in-flight chunk deltas that follow the last
 * settled message. (Legacy single-string form; transcriptOf is preferred.)
 */
export declare function answerTextOf(events: readonly SidebarqaHistoryEntry[]): string;
/** Whether the history feed contains a finished answering turn. */
export declare function hasTurnEnded(events: readonly SidebarqaHistoryEntry[]): boolean;
