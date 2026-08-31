import type { Context } from './context-types.ts';
export { SIDEBARQA_DEFAULTS, SIDEBARQA_SETTINGS_NS } from './config.ts';
export type { SidebarqaConfig, SidebarqaHistoryStrategy, SidebarqaReasoningEffort } from './config.ts';
export type { Context } from './context-types.ts';
export { PROMPTS, promptLocaleOf, promptsOf, QUESTION_LABELS } from './prompt-locale.ts';
export type { PromptBundle, PromptLocale } from './prompt-locale.ts';
export { assembleText, BACKGROUND_SYSTEM, backgroundSystem, buildTrimContext, composeSummary, extractSegments, formatBackground, formatSegments, splitRecent, textOfEvent, } from './summarize.ts';
export { TITLE_SYSTEM, boundTitleInput, buildTitleInput, normalizeTitle, titleSystem, truncateTitleUtf8 } from './title.ts';
/** Plugin identity for cordis.yml rows. */
export declare const name = "dsh-sidebar-qa";
/** Services required before mounting: the webserver routes, the session query engine, the llm runtime, and the loader's connection row (trust fence). */
export declare const inject: string[];
/** Result of one context call (the client branches on `degraded`). */
export interface SidebarqaContextResult {
    degraded: boolean;
    /** The injected context text (`null` for `inherit` or on failure). */
    text: string | null;
    sourceSeq: number;
    reason?: string;
}
/** Result of one title call (the client branches on `degraded`). */
export interface TitleResult {
    degraded: boolean;
    title: string | null;
    reason?: string;
}
/**
 * Plugin body: mount the fenced route and the optional settings namespace.
 * @param ctx - host plugin context (webServer, sessionQuery, llm, loader).
 */
export declare function apply(ctx: Context): void;
