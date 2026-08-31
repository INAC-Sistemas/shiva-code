/** A captured selection awaiting a question. */
export interface PendingQuote {
    text: string;
    messageId?: string;
    role?: string;
    turn?: string;
    selectionStart?: number;
    selectionEnd?: number;
}
/** The immutable store snapshot consumed through useSyncExternalStore. */
export interface SidebarqaStoreSnapshot {
    /** parent session id → child (follow-up) session ids (creation order). */
    parentToChildren: Record<string, string[]>;
    /** child session id → parent session id (reverse index). */
    childToParent: Record<string, string>;
    /** per-session transient pending quote. */
    pendingBySession: Record<string, PendingQuote>;
}
export interface SidebarqaStore {
    getSnapshot(): SidebarqaStoreSnapshot;
    subscribe(fn: () => void): () => void;
    setPendingQuote(sessionId: string, quote: PendingQuote | null): void;
    addChild(parentSessionId: string, childSessionId: string): void;
    childrenOf(parentSessionId: string): readonly string[];
    parentOf(childSessionId: string): string | undefined;
    /** Whether a session is a follow-up session (has a parent in the mapping). */
    isSideSession(sessionId: string): boolean;
    /** The root (main) session of a session, walking the parent chain up. */
    rootOf(sessionId: string): string;
    /** Whether a side session's post-answer retitle has been attempted. */
    isTitled(sessionId: string): boolean;
    /** Mark a side session's post-answer retitle as attempted (fires once). */
    markTitled(sessionId: string): void;
    /** Whether a tree node's follow-up subtree is collapsed in 追问记录 (persisted). */
    isCollapsed(sessionId: string): boolean;
    /** Flip a tree node's collapse state in 追问记录 (persisted). */
    toggleCollapsed(sessionId: string): void;
    /**
     * Remove one session's whole subtree from the mapping (追问记录 "移除" entry
     * for archived / deleted sessions): the id is unlinked from its parent, its
     * descendants lose their rows (they must not resurface as roots), and any
     * derived state (titled / collapsed) for the subtree is cleared.
     */
    removeSession(sessionId: string): void;
}
/** Create one store instance (call once per plugin activation). */
export declare function createSidebarqaStore(): SidebarqaStore;
