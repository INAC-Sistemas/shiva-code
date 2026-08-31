import type { SidebarqaTabComponentProps } from '../context-types.ts';
import type { SidebarqaStore } from './store.ts';
import { type SidebarqaSidebarStore } from './ensure-panel.ts';
interface HistoryPanelProps extends Omit<SidebarqaTabComponentProps, 'store'> {
    store: SidebarqaStore;
    /** The better-sidebar state store (self-healing panel expansion, issue #6). */
    bsStore?: SidebarqaSidebarStore;
}
export declare function HistoryPanel({ ctx, store, scope, visible, bsStore, tab }: HistoryPanelProps): import("react").JSX.Element;
export {};
