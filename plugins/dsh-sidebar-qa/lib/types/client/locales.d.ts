/**
 * The plugin's zh/en copy dictionary and the module-level `t()` it resolves
 * through. ZERO imports by design: every pure module and every component may
 * read copy from here without dragging a dependency (and without tripping the
 * client-bundle purity gate).
 *
 * The active language follows the DSH locale service (`ctx.locale`, attached by
 * the client `apply()`): the Host-backed preference (`locale.preference` in
 * settings.yaml) wins over the browser language, exactly like every first-party
 * DSH surface. Without the service — a build without the locale plugin, or a
 * unit test — `activeLocaleId()` degrades to `navigator.language`, then `'en'`.
 *
 * `zh` is the key-set source of truth; `en` is typed as `Record<CopyKey, string>`,
 * so a missing translation is a COMPILE error, and `tests/locales.spec.ts`
 * additionally pins key parity and rejects empty values at runtime.
 *
 * This dictionary holds UI copy only. Model-facing prompt text lives in
 * `src/prompt-locale.ts` — it is protocol (markers the prompts name and the
 * transcript parser reads back), not translatable chrome, and must never be
 * mixed in here.
 */
/** Namespace this plugin's dictionaries register under in the DSH locale
 *  registry. `sidebar` is DSH's own ui-sidebar and `betterSidebar` is the
 *  framework's, so neither is available. */
export declare const LOCALE_NS = "sidebarQa";
/** Chinese copy — the key-set source of truth. */
export declare const zh: {
    commonCancel: string;
    commonRetry: string;
    commonRemove: string;
    commonLoading: string;
    commonCopy: string;
    commonCopied: string;
    commonDefault: string;
    askTabTitle: string;
    askPopoverButton: string;
    askNewAsk: string;
    askQuoteHead: string;
    askNoQuoteHint: string;
    askEmptyHint: string;
    askPreparing: string;
    askComposerPlaceholder: string;
    askSend: string;
    askGenerating: string;
    askSeedDivider: string;
    askSeedDividerMore: string;
    askDegradedToCompressed: string;
    histTabTitle: string;
    histEmptyAll: string;
    histEmptyWorkspace: string;
    histWorkspace: string;
    histArchived: string;
    histDeleted: string;
    histRemoveTitle: string;
    histExpand: string;
    histCollapse: string;
    modelFallbackLabel: string;
    modelTrigger: string;
    modelMenuLabel: string;
    modelCellModel: string;
    modelCellEffort: string;
    modelProviderDefault: string;
    modelLoadFailed: string;
    modelFailureDetail: string;
    modelEmpty: string;
    modelNoEfforts: string;
    modelInheritSeatHint: string;
    strategyInherit: string;
    strategyCompressed: string;
    strategyTrim: string;
    strategyAria: string;
    cfgLoading: string;
    cfgCatalogInherit: string;
    cfgHistoryStrategyLabel: string;
    cfgHistoryStrategyDesc: string;
    cfgTrimWindowLabel: string;
    cfgTrimWindowDesc: string;
    cfgAnswerProviderLabel: string;
    cfgAnswerProviderDesc: string;
    cfgAnswerModelLabel: string;
    cfgAnswerModelDesc: string;
    cfgAnswerEffortLabel: string;
    cfgSummarizeProviderLabel: string;
    cfgSummarizeProviderDesc: string;
    cfgSummarizeModelLabel: string;
    cfgSummarizeModelDesc: string;
    cfgSummarizeEffortLabel: string;
    cfgEffortDesc: string;
    meterSystem: string;
    meterTools: string;
    meterMessages: string;
    meterUsed: string;
    meterHeadline: string;
    meterPanelLabel: string;
    timeNow: string;
    timeMinutes: string;
    timeHours: string;
    timeDays: string;
    timeMonths: string;
    timeYears: string;
    errSaveFailed: string;
    errSaveConflict: string;
    errAskFailed: string;
    errModelFailed: string;
};
/** Every copy key (the `zh` key set is authoritative). */
export type CopyKey = keyof typeof zh;
/** English copy. The annotation makes a missing key a compile error. */
export declare const en: Record<CopyKey, string>;
/** The slice of the DSH locale service this module reads (structural). */
interface AttachedLocale {
    getSnapshot(): {
        active: string;
    };
    subscribe(fn: () => void): () => void;
}
/**
 * Attach (or, with `undefined`, detach) the DSH locale service.
 * @param service - `ctx.locale`, or undefined to fall back to the browser language.
 */
export declare function attachLocale(service: AttachedLocale | undefined): void;
/**
 * The active locale id.
 *
 * MUST return a stable primitive: it backs `useSyncExternalStore` through
 * `useLocaleRevision`, and returning a fresh object per call (e.g. the whole
 * `getSnapshot()`) would make React re-render forever.
 */
export declare function activeLocaleId(): string;
/**
 * Subscribe to locale switches. Without an attached service the copy can never
 * change, so this is an inert disposer rather than an error.
 * @param fn - called after every locale change.
 * @returns the unsubscribe disposer.
 */
export declare function subscribeLocale(fn: () => void): () => void;
/** Whether the active locale is Chinese (the dictionary choice is binary). */
export declare function isZh(): boolean;
/**
 * The model-facing prompt locale for the active language — the wire value sent
 * to the host's context/title routes (see `src/prompt-locale.ts`).
 */
export declare function promptLocale(): 'zh' | 'en';
/**
 * Translate one copy key, interpolating `{name}` placeholders.
 * @param key - a key of the `zh` dictionary.
 * @param params - placeholder values, substituted by name.
 */
export declare function t(key: CopyKey, params?: Record<string, string | number>): string;
export {};
