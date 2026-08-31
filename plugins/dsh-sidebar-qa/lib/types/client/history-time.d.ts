export type HistoryTimeUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years';
export interface HistoryRelativeTime {
    unit: HistoryTimeUnit;
    n: number;
}
/** Bucket an epoch-ms `updatedAt` relative to `now` (both injected for pure rendering). */
export declare function relativeTime(updatedAt: number, now: number): HistoryRelativeTime;
/** The compact label ("刚刚" / "5分钟" / … in zh; "now" / "5m" / … in en) —
 *  mirror of the left panel row label. The en forms are unit abbreviations,
 *  which need no plural rules and fit the row chip better than "5 minutes". */
export declare function timeLabel(updatedAt: number, now: number): string;
