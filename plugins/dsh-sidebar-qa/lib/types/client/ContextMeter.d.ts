import type { Context } from '../context-types.ts';
export interface ContextMeterProps {
    ctx: Context;
    /** The session whose context occupancy is shown. */
    sessionId: string;
}
export declare function ContextMeter({ ctx, sessionId }: ContextMeterProps): import("react").JSX.Element | null;
