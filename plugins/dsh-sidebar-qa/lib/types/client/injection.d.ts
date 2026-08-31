/**
 * Context-injection formatting for the side session's first message: the
 * context block, the `<quoted_context>` XML block (own parser contract,
 * XML-escaped and sanitized), and the question. Kept pure and dependency-free
 * (its one import, `prompt-locale.ts`, is itself dependency-free) for unit
 * testing.
 *
 * The model-facing wording lives in `../prompt-locale.ts`; every builder takes
 * the locale as a trailing parameter defaulting to `'zh'`, so a caller that
 * predates i18n produces byte-identical output.
 */
import { type PromptLocale } from '../prompt-locale.ts';
import type { PendingQuote } from './store.ts';
/** Maximum quoted-text length admitted into the XML block. */
export declare const QUOTE_MAX_LEN = 2000;
/** Maximum topic length for CJK text (the subject of the `❓<主题>` title). */
export declare const TOPIC_MAX_LEN = 12;
/**
 * Maximum topic length for non-CJK text. A Latin script carries far less
 * information per character, so the CJK budget would cut mid-phrase.
 */
export declare const TOPIC_MAX_LEN_LATIN = 24;
/** Escape the five XML special characters in a text node or attribute. */
export declare function escapeXml(input: string): string;
/** Reverse of {@link escapeXml} (display the quoted body back unescaped). */
export declare function unescapeXml(input: string): string;
/** Strip control characters and NUL that would corrupt the XML/text block. */
export declare function sanitizeText(input: string): string;
/** Bound a string to `max` characters with an ellipsis (Unicode-safe slice). */
export declare function boundText(input: string, max: number): string;
/**
 * Build the `<quoted_context>` XML block for one captured selection.
 * Selection offsets are only meaningful when the message id is known; they are
 * omitted otherwise.
 */
export declare function buildQuotedContext(quote: PendingQuote, label: string): string;
/**
 * The governing instruction prepended to the side session's first message.
 * It sits at the very start of the input so the model reads it under the
 * highest attention weight, before the (heavier) context blocks: it sets the
 * frame that this is a sidebar follow-up anchored on a SELECTED snippet, that
 * the answer must stay on the snippet's topic instead of over-indexing on the
 * main conversation's theme, and that the ANSWER LANGUAGE follows the user's
 * question (not the UI language).
 * @param locale - which language the instruction itself is written in.
 */
export declare function followUpIntro(locale?: PromptLocale): string;
/** The zh intro — the pre-i18n constant, kept for callers and tests that
 *  predate the locale parameter. */
export declare const FOLLOWUP_INTRO: string;
/**
 * Build the side session's first user message: the governing intro, optional
 * summary block, quoted context block, then the question. Later follow-up
 * messages pass `summary` as null (only the first message carries the
 * compressed main context).
 */
export declare function buildFirstMessage(summary: string | null, quote: PendingQuote, question: string, label: string, locale?: PromptLocale): string;
/** Build a follow-up message inside an existing side session (no summary). */
export declare function buildFollowUpMessage(quote: PendingQuote | null, question: string, label: string, locale?: PromptLocale): string;
/**
 * Derive the `❓<主题>` subject: the first non-blank line of the quote,
 * whitespace-collapsed, bounded to a script-aware budget; falls back to
 * `fallback` (the caller passes the locale's placeholder topic).
 */
export declare function topicFromQuote(text: string, fallback?: string): string;
/**
 * Build the full side-session title from a subject. The emoji alone marks a
 * follow-up session, so the title carries no translatable word (and no locale
 * switch can ever leave a session list with mixed-language prefixes).
 */
export declare function followUpTitle(subject: string): string;
/** Parsed display form of one user message in the transcript. */
export interface ParsedUserMessage {
    /** The quoted_context body (unescaped), or null when the message has none. */
    quote: string | null;
    /** The question text (summary + labels stripped). */
    question: string;
}
/**
 * Parse a user message into its display parts. The governing intro and the
 * context summary blocks are stripped (they were consumed as model context,
 * not shown to the reader) — structurally, by slicing past the quote block, so
 * no localized heading is ever matched; the `<quoted_context>` body is
 * unescaped for display; the question is whatever follows the quote (first
 * message) or the whole message (plain follow-up).
 */
export declare function parseUserMessage(text: string): ParsedUserMessage;
