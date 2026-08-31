import type { SelectionController } from './selection.ts';
import type { PendingQuote } from './store.ts';
interface SelectionPopoverProps {
    controller: SelectionController;
    onAsk: (quote: PendingQuote, sessionId: string) => void;
}
export declare function SelectionPopover({ controller, onAsk }: SelectionPopoverProps): import("react").JSX.Element | null;
export {};
