import type { Context } from '../context-types.ts';
import type { SidebarqaModelSelection } from '../context-types.ts';
import type { ModelSeatMode } from './model-seat.ts';
export interface ModelSelectProps {
    ctx: Context;
    /**
     * The session whose model directory this selector READS — and, in `commit`
     * mode only, writes. `draft` / `readonly` never write it (issue #10: a new
     * ask used to rewrite the asked session's model before its follow-up existed).
     */
    sessionId: string;
    /** How a pick lands. Default `commit` — submit it to `sessionId`. */
    mode?: ModelSeatMode;
    /** The selection to DISPLAY, overriding the directory's own current. */
    value?: SidebarqaModelSelection | null;
    /** Hover hint (the read-only seat's explainer); absent leaves the tooltip off. */
    hint?: string;
    disabled?: boolean;
    /**
     * Called with the accepted selection: after a switch lands in `commit` mode,
     * immediately in `draft` mode. Lets the owner record "the model the next ask
     * should use".
     */
    onChange?: (selection: SidebarqaModelSelection) => void;
}
/**
 * The compact model seat for the side panel. `ctx.connection.api.sessions`
 * carries both verbs; the RPC surface mirrors the host's `session.models` /
 * `session.selectModel` exactly, so no plugin-to-plugin import is involved.
 */
export declare function ModelSelect({ ctx, sessionId, mode, value, hint, disabled, onChange, }: ModelSelectProps): import("react").JSX.Element;
