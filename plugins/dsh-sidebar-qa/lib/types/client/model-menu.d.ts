/**
 * Pure helpers for the AskPanel's model selector: flatten the advisory
 * `session.models` directory into selectable rows and resolve a picked row
 * back to a complete provider/model/effort selection (mirror of
 * ui-model-selection's own helpers, restated dependency-free so the compact
 * selector shares the exact same host data facts).
 */
import type { SidebarqaCatalogModel, SidebarqaModelSelection, SidebarqaSessionModels } from '../context-types.ts';
/** One selectable model row with an opaque row id. */
export interface SidebarqaModelChoice {
    /** Opaque row id: `${provider}/${model}` (resolved by lookup, never parsed). */
    id: string;
    provider: string;
    model: string;
    name: string;
    /** Provider name, plus the model description when present (row detail). */
    detail: string;
    reasoning?: SidebarqaCatalogModel['reasoning'];
}
/** Build the opaque row id for one provider/model pair. */
export declare function modelChoiceId(provider: string, model: string): string;
/**
 * Flatten the advisory directory into selectable rows in provider order.
 * @param models - the directory snapshot from `session.models`.
 */
export declare function modelChoicesOf(models: SidebarqaSessionModels): SidebarqaModelChoice[];
/**
 * Resolve a picked row id back to a complete selection. The reasoning effort
 * carries the provider default unless the row IS the current route (then the
 * host's reported current effort wins — it may differ from the default).
 * @param models - the directory snapshot the rows were built from.
 * @param id - the picked row id.
 * @returns the selection, or undefined for stale/unknown ids.
 */
export declare function modelSelectionOf(models: SidebarqaSessionModels, id: string): SidebarqaModelSelection | undefined;
/**
 * The effort a selection would actually run with: its explicit effort, else the
 * catalog model's advertised `defaultEffort`, else undefined (the provider
 * decides). A selection whose model is absent from the directory keeps its
 * explicit effort verbatim — nothing is invented for a route we cannot describe.
 * @param models - the directory snapshot (its groups carry the reasoning metadata).
 * @param selection - the selection to normalize; null yields undefined.
 * @returns the effective effort id, or undefined.
 */
export declare function effectiveEffortOf(models: SidebarqaSessionModels, selection: SidebarqaModelSelection | null): string | undefined;
/**
 * Whether submitting `next` would change nothing: same provider, same model AND
 * the same EFFECTIVE effort. The seat's earlier provider/model-only guard
 * ignored `reasoningEffort` and therefore swallowed every effort switch
 * (issue #10) — an effort-only pick keeps the route by construction. An unknown
 * current selection is never a no-op.
 * @param models - directory snapshot used to fold in default efforts.
 * @param current - the selection the seat displays, or null.
 * @param next - the selection the user picked.
 * @returns true when the submission would be a pure no-op.
 */
export declare function isNoopSelection(models: SidebarqaSessionModels, current: SidebarqaModelSelection | null, next: SidebarqaModelSelection): boolean;
