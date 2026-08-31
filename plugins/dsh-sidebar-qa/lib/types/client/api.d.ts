/**
 * Typed fetch wrapper over the /sidebarqa JSON API (the host half's context
 * method — the three history strategies — plus title and config). Mirrors the
 * wire envelope `{ok: true, value} | {ok: false, error}`.
 */
import type { Context } from '../context-types.ts';
import type { SidebarqaHistoryStrategy } from '../config.ts';
import type { SidebarqaCatalog } from '../context-types.ts';
/** One wire failure. */
export declare class SidebarqaApiError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
/** Result of one context call (mirror of the host SidebarqaContextResult). */
export interface ContextResult {
    degraded: boolean;
    /** The injected context text (`null` for `inherit` or on failure). */
    text: string | null;
    sourceSeq: number;
    reason?: string;
}
/** Result of one title call (mirror of the host TitleResult). */
export interface TitleResult {
    degraded: boolean;
    title: string | null;
    reason?: string;
}
/** Resolved sidebarqa configuration (mirror of the host SidebarqaConfig). */
export interface SidebarqaConfigView {
    historyStrategy: SidebarqaHistoryStrategy;
    trimWindowMessages: number;
    summarizeProvider: string;
    summarizeModel: string;
    summarizeReasoningEffort: string;
    summarizeBudgetTokens: number;
    recentWindowMessages: number;
    backgroundWindowMessages: number;
    answerProvider: string;
    answerModel: string;
    answerReasoningEffort: string;
    titleBudgetTokens: number;
}
/** The config namespace envelope (value + revision for revision-guarded writes). */
export interface SidebarqaConfigEnvelope {
    value?: SidebarqaConfigView;
    revision?: number;
}
/** The sidebarqa API surface (session scope-free; the route fences itself). */
export declare const sidebarqaApi: {
    context: (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<ContextResult>;
    title: (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<TitleResult>;
    config: (signal?: AbortSignal) => Promise<SidebarqaConfigView>;
    catalog: (signal?: AbortSignal) => Promise<SidebarqaCatalog>;
    configGet: (signal?: AbortSignal) => Promise<SidebarqaConfigEnvelope>;
    configUpdate: (patch: Record<string, unknown>, expectedRevision?: number) => Promise<SidebarqaConfigEnvelope>;
};
/** Resolve a session's current model selection (used to inherit the summarize provider). */
export declare function currentModelOf(ctx: Context, sessionId: string): Promise<{
    provider: string;
    model: string;
    reasoningEffort?: string;
} | undefined>;
