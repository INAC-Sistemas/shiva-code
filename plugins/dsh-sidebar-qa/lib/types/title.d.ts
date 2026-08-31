/**
 * Pure helpers for the post-answer retitle flow: the strict "title-only"
 * system prompt, the Q+A input framing with a truncation budget, and
 * UTF-8-safe title normalization. The normalization rules mirror DSH's
 * session-title package (control-sequence stripping + UTF-8 byte truncation
 * that never splits a code point), copied here so a third-party plugin
 * resolves outside the DSH monorepo without a runtime value import. Kept
 * dependency-free (TextEncoder only) for unit testing and shared by both the
 * host title route and the client input builder.
 *
 * The prompt text itself lives in `prompt-locale.ts`; the locale enters as a
 * trailing parameter defaulting to `'zh'`, so pre-i18n callers are unaffected.
 */
import { type PromptLocale } from './prompt-locale.ts';
/**
 * System prompt: emit ONLY the title, plain single line, with a dual budget
 * (≤15 CJK chars / ≤6 words). It tells the model to use the language of the
 * question and answer — the title follows the CONTENT, not the UI language.
 * @param locale - which language the instruction itself is written in.
 */
export declare function titleSystem(locale?: PromptLocale): string;
/** The zh system prompt — the pre-i18n constant, kept for callers and tests
 *  that predate the locale parameter. */
export declare const TITLE_SYSTEM: string;
/** Max chars of the question part admitted into the title input. */
export declare const TITLE_QUESTION_MAX = 400;
/** Max chars of the answer part admitted into the title input. */
export declare const TITLE_ANSWER_MAX = 1200;
/** Defensive cap on the whole input the host hands to the model. */
export declare const TITLE_INPUT_MAX = 4000;
/** Max UTF-8 bytes of an accepted title. Script-adaptive by construction:
 *  60 bytes ≈ 20 CJK chars ≈ 60 Latin chars ≈ 10 English words. */
export declare const TITLE_MAX_BYTES = 60;
/**
 * Truncate a string to a UTF-8 byte budget without splitting a Unicode code
 * point.
 */
export declare function truncateTitleUtf8(input: string, maxBytes: number): string;
/**
 * Normalize one model-produced title: strip terminal/control/invisible
 * sequences, collapse whitespace to a single trimmed line, and enforce the
 * UTF-8 byte budget.
 */
export declare function normalizeTitle(input: string, maxBytes: number): string;
/**
 * Build the labeled `question / answer` input for the title model, each part
 * bounded. The labels are the ones `titleSystem` refers to, so both come from
 * the same bundle.
 */
export declare function buildTitleInput(question: string, answer: string, locale?: PromptLocale): string;
/** Defensive whole-input cap for the host route (idempotent with the framing). */
export declare function boundTitleInput(input: string): string;
