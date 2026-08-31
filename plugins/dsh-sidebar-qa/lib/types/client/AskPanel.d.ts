import type { SidebarqaTabComponentProps } from '../context-types.ts';
import { type SidebarqaSidebarStore } from './ensure-panel.ts';
import type { SidebarqaStore } from './store.ts';
interface AskPanelProps extends Omit<SidebarqaTabComponentProps, 'store'> {
    store: SidebarqaStore;
    /** The better-sidebar state store (self-healing panel expansion, issue #6). */
    bsStore?: SidebarqaSidebarStore;
}
export declare function AskPanel(props: AskPanelProps): import("react").JSX.Element;
export {};
