/**
 * Configuration for the host summarize service and the side-session answer
 * model. The user-facing knobs live in the DSH settings service under the
 * `sidebarqa` namespace (schemastery schema); deployments without a settings
 * service fall back to {@link SIDEBARQA_DEFAULTS}.
 */
import z from 'schemastery';
/** Settings namespace id. */
export declare const SIDEBARQA_SETTINGS_NS = "sidebarqa";
/** DSH reasoning-effort vocabulary: Off / High / Max. */
export type SidebarqaReasoningEffort = 'off' | 'high' | 'max';
/**
 * The side-question history strategy: how the parent conversation's context
 * reaches the side session.
 * - `inherit`: fork the parent (full history seed → provider prefix-cache hits).
 * - `compressed`: compress the earlier window with the fast model + verbatim recent.
 * - `trim`: keep the last `trimWindowMessages` messages verbatim, zero LLM cost.
 */
export type SidebarqaHistoryStrategy = 'inherit' | 'compressed' | 'trim';
/** User-editable configuration. */
export interface SidebarqaConfig {
    /** 'inherit' | 'compressed' | 'trim'; the per-ask selector defaults to this. */
    historyStrategy: SidebarqaHistoryStrategy;
    /** How many recent messages `trim` keeps verbatim (no model involved). */
    trimWindowMessages: number;
    /** Registered provider route for the fast model; '' = inherit the main session's provider. */
    summarizeProvider: string;
    /** Fast no-thinking chat model id. */
    summarizeModel: string;
    /** Thinking effort for the fast model: Off / High / Max. */
    summarizeReasoningEffort: SidebarqaReasoningEffort;
    /** Output budget of the generated BACKGROUND summary, in tokens (soft bound). */
    summarizeBudgetTokens: number;
    /** How many recent messages to keep VERBATIM (the current-state anchor). */
    recentWindowMessages: number;
    /** How many earlier messages to send to the model for background compression. */
    backgroundWindowMessages: number;
    /** Provider route for the side session's answer model. */
    answerProvider: string;
    /** Model id for the side session's answer model. */
    answerModel: string;
    /** Thinking effort for the answer model: Off / High / Max. */
    answerReasoningEffort: SidebarqaReasoningEffort;
    /** Output-token cap for the post-answer title generation. */
    titleBudgetTokens: number;
}
/** Schema-backed defaults (also used when the settings service is absent). */
export declare const SIDEBARQA_DEFAULTS: SidebarqaConfig;
/** Schemastery schema for the `sidebarqa` settings namespace. */
export declare const SidebarqaPrefsSchema: z<Schemastery.ObjectS<{
    historyStrategy: z<"inherit" | "compressed" | "trim", "inherit" | "compressed" | "trim">;
    trimWindowMessages: z<number, number>;
    summarizeProvider: z<string, string>;
    summarizeModel: z<string, string>;
    summarizeReasoningEffort: z<"off" | "high" | "max", "off" | "high" | "max">;
    summarizeBudgetTokens: z<number, number>;
    recentWindowMessages: z<number, number>;
    backgroundWindowMessages: z<number, number>;
    answerProvider: z<string, string>;
    answerModel: z<string, string>;
    answerReasoningEffort: z<"off" | "high" | "max", "off" | "high" | "max">;
    titleBudgetTokens: z<number, number>;
}>, Schemastery.ObjectT<{
    historyStrategy: z<"inherit" | "compressed" | "trim", "inherit" | "compressed" | "trim">;
    trimWindowMessages: z<number, number>;
    summarizeProvider: z<string, string>;
    summarizeModel: z<string, string>;
    summarizeReasoningEffort: z<"off" | "high" | "max", "off" | "high" | "max">;
    summarizeBudgetTokens: z<number, number>;
    recentWindowMessages: z<number, number>;
    backgroundWindowMessages: z<number, number>;
    answerProvider: z<string, string>;
    answerModel: z<string, string>;
    answerReasoningEffort: z<"off" | "high" | "max", "off" | "high" | "max">;
    titleBudgetTokens: z<number, number>;
}>>;
