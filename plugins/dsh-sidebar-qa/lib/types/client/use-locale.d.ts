/**
 * Re-render this component when the DSH locale switches.
 * @returns the active locale id — a stable primitive, as `useSyncExternalStore`
 *          requires (a fresh object per call would loop forever).
 */
export declare function useLocaleRevision(): string;
