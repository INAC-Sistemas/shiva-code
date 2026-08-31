/**
 * Selection capture layer: listen for pointer/keyboard selections inside the
 * conversation, validate them (single message node, not streaming, bounded),
 * and expose the latest valid selection through a small external-store
 * controller the floating popover renders from. Pure DOM — no React here.
 */
/** Maximum selected-text length admitted (task-book bound). */
export declare const MAX_SELECTION_CHARS = 2000;
/** One validated selection, ready for the popover. */
export interface SelectionSnapshot {
    text: string;
    kind: string;
    anchorKey: string | undefined;
    rect: {
        left: number;
        top: number;
        width: number;
        bottom: number;
    };
    sessionId: string;
}
/** The popover-ready controller state. */
export interface SelectionState {
    selection: SelectionSnapshot | null;
}
/** Derive the quoted_context role from the chat-flow kind. */
export declare function roleOfKind(kind: string): 'user' | 'assistant';
/** Capture and validate the current window selection, or null when invalid. */
export declare function captureSelection(currentSessionId: string): SelectionSnapshot | null;
export interface SelectionController {
    getSnapshot(): SelectionState;
    subscribe(fn: () => void): () => void;
    clear(): void;
    dispose(): void;
}
/** Create one selection controller (call once per plugin activation). */
export declare function createSelectionController(getSessionId: () => string): SelectionController;
