import type { Context } from '../context-types.ts';
/** Services required before mounting (provided by the client runtime; betterSidebar by dsh-better-sidebar). */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - the client cordis context (betterSidebar, sessions, connection, workspaces).
 */
export declare function apply(ctx: Context): void;
