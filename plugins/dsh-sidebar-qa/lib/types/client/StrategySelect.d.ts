import type { SidebarqaHistoryStrategy } from '../config.ts';
export interface StrategySelectProps {
    value: SidebarqaHistoryStrategy;
    onChange: (value: SidebarqaHistoryStrategy) => void;
    disabled?: boolean;
}
/**
 * The strategy chip: current strategy glyph + label + chevron, opening an
 * anchored dropdown (side top — the composer row sits at the panel bottom).
 */
export declare function StrategySelect({ value, onChange, disabled }: StrategySelectProps): import("react").JSX.Element;
