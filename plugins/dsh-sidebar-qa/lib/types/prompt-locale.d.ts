/**
 * The MODEL-FACING text of the plugin, in zh and en — the follow-up intro, the
 * background-compression and title system prompts, and the structural markers
 * those prompts name (`用户：` / `助手：`, `【背景】`, `问题：`).
 *
 * This is deliberately NOT part of `client/locales.ts`:
 *
 * - it is protocol, not chrome. `backgroundSystem` literally names the role
 *   prefixes `formatSegments` emits, so a bundle is an ATOMIC unit — translate
 *   the prompt without its markers and the model loses its parsing contract
 *   (`tests/prompt-locale.spec.ts` asserts the pairing);
 * - it is SHARED by both halves (the host builds the summary and title prompts,
 *   the client builds the first message), so it must stay free of node-only
 *   APIs and of any import at all;
 * - it is never registered into the DSH locale registry — publishing it there
 *   would invite "translating" a marker the transcript parser reads back.
 *
 * OUTPUT LANGUAGE. The prompts do not bind the answer to the UI language: they
 * tell the model to answer in the language of the QUESTION (falling back to the
 * quoted text), mirroring DSH's own session titler. A zh-UI user quoting an
 * English paper should get an English answer, and vice versa.
 *
 * BACK-COMPAT. `PROMPTS.zh` is a byte-for-byte move of the pre-i18n strings, and
 * `promptLocaleOf` defaults an absent locale to `'zh'` — an old client calling a
 * new host produces exactly today's prompts.
 */
/** The two languages the model-facing text exists in (mirror of DSH's LocaleId). */
export type PromptLocale = 'zh' | 'en';
/**
 * Normalize a wire value to a prompt locale.
 *
 * ABSENT → `'zh'`: this is the back-compat contract with clients that predate
 * the `locale` field. Any unknown language falls to `'en'`; never throws.
 * @param raw - the payload's `locale` field, unvalidated.
 */
export declare function promptLocaleOf(raw: unknown): PromptLocale;
/** One language's complete model-facing text. */
export interface PromptBundle {
    /** System prompt of the background compression pass. */
    backgroundSystem: string;
    /** Role prefix `formatSegments` emits, separator included — NAMED verbatim
     *  by `backgroundSystem`, so the two must always be translated together. */
    roleUser: string;
    /** Role prefix `formatSegments` emits — NAMED by `backgroundSystem`. */
    roleAssistant: string;
    /** Section marker of the compressed background. */
    sectionBackground: string;
    /** Section marker of the verbatim recent window. */
    sectionRecent: string;
    /** System prompt of the title pass. */
    titleSystem: string;
    /** Question label of the title input (client-emitted, host-consumed). */
    titleQuestionLabel: string;
    /** Answer label of the title input. */
    titleAnswerLabel: string;
    /** The governing instruction opening the side session's first message. */
    followUpIntro: string;
    /** Heading of the injected main-conversation context block. */
    contextHeading: string;
    /** Label prefixing the user's question — see {@link QUESTION_LABELS}. */
    questionLabel: string;
    /** `<quoted_context label>` value for a quote taken from a user message. */
    quoteLabelUser: string;
    /** `<quoted_context label>` value for a quote taken from an agent reply. */
    quoteLabelAgent: string;
    /** Placeholder topic when the quote has no usable first line. */
    fallbackTopic: string;
}
/**
 * Every question marker this plugin has EVER emitted.
 *
 * APPEND-ONLY: never reorder, never remove. These messages are persisted in the
 * DSH session log and re-parsed on every panel render, so a marker dropped here
 * would make historical follow-ups display a bare `问题：` prefix forever.
 * `tests/prompt-locale.spec.ts` pins that every bundle's `questionLabel` is a
 * member of this list, so a new language cannot be added without teaching the
 * parser about it.
 */
export declare const QUESTION_LABELS: readonly string[];
/** The model-facing text, per language. */
export declare const PROMPTS: Record<PromptLocale, PromptBundle>;
/**
 * One language's model-facing text.
 * @param locale - the resolved prompt locale (defaults to the pre-i18n zh).
 */
export declare function promptsOf(locale?: PromptLocale): PromptBundle;
