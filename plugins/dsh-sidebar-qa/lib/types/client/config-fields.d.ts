/**
 * Declarative model of the webview config panel rows (pure and testable; its
 * only import is the dependency-free copy dictionary).
 * The panel edits the host's `sidebarqa` namespace through the revision-guarded
 * /sidebarqa/api config routes; this module only describes the field surface and
 * the number coercion, so it stays free of React and the fetch layer.
 *
 * The row tables are FUNCTIONS, not consts: module-level tables would freeze
 * their labels at import time and never follow a DSH language switch.
 */
import type { SidebarqaConfigView } from './api.ts';
import type { SidebarqaCatalogProvider } from '../context-types.ts';
/** One editable config key. */
export type ConfigFieldKey = keyof SidebarqaConfigView;
/** One config panel row control type. */
export type ConfigFieldType = 'text' | 'number' | 'select' | 'catalog';
/** One choice of a select row. */
export interface ConfigFieldOption {
    value: string;
    label: string;
}
/** What a `catalog` row draws its options from. */
export type CatalogFieldSource = 'answerProvider' | 'answerModel' | 'summarizeProvider' | 'summarizeModel';
/** The inherit sentinel stored for the summarize channel: '' (follow the asked session). */
export declare const CATALOG_INHERIT_VALUE = "";
/** One config panel row: a text field, a clamped number field, a select, or a
 *  provider/model dropdown sourced from the live model catalog. */
export interface ConfigField {
    key: ConfigFieldKey;
    label: string;
    type: ConfigFieldType;
    /** Clamp bounds for number fields (mirror of the schemastery schema). */
    min?: number;
    max?: number;
    /** Input placeholder (text fields). */
    placeholder?: string;
    /** One-line description under the label. */
    desc?: string;
    /** Choices for select fields. */
    options?: readonly ConfigFieldOption[];
    /**
     * For `type: 'catalog'` rows, the role this row plays. A provider row names
     * the provider it lists; a model row names the provider whose `…Model`
     * options it is scoped by.
     */
    source?: CatalogFieldSource;
}
/** DSH reasoning-effort vocabulary (mirror of the host `off | high | max`). */
export type SidebarqaReasoningEffort = 'off' | 'high' | 'max';
/** The three thinking modes shown as a dropdown. */
export declare const REASONING_EFFORT_OPTIONS: readonly ConfigFieldOption[];
/** The three history strategies shown as a dropdown (mirror of the host union).
 *  A FUNCTION, not a const: a module-level table would freeze its labels at
 *  import time and never follow a locale switch. The `value`s are the persisted
 *  protocol keys and never change. */
export declare function historyStrategyOptions(): readonly ConfigFieldOption[];
/** The config panel's editable rows, in display order. Only the knobs users
 *  plausibly tune are surfaced; the compression internals (summary budget,
 *  window sizes, title budget) keep their defaults and stay settable through
 *  the `sidebarqa` settings namespace in settings.yaml.
 *
 *  A FUNCTION for the same reason as {@link historyStrategyOptions}: the copy
 *  is resolved per call, so the panel re-localizes on a language switch. */
export declare function configFields(): readonly ConfigField[];
/**
 * Parse + clamp one number row's raw input. A non-finite input returns null so
 * the row can revert to the stored value (mirror of the host rows' behavior).
 */
export declare function coerceNumberField(raw: string, min?: number, max?: number): number | null;
/**
 * The provider catalog row's choices, in provider order. The summarize channel
 * prepends its "inherit the asked session" sentinel (empty value) so the
 * default `''` stays selectable from the dropdown.
 * @param catalog - the live model catalog.
 * @param source - the row's role; only `summarizeProvider` gets the inherit entry.
 */
export declare function providerOptionsOf(catalog: readonly SidebarqaCatalogProvider[], source: string): ConfigFieldOption[];
/**
 * The model catalog row's choices for one provider route: that provider's
 * catalog models, or [] while the provider is unknown/unchosen.
 */
export declare function modelOptionsOf(catalog: readonly SidebarqaCatalogProvider[], provider: string): ConfigFieldOption[];
