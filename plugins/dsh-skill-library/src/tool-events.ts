/**
 * The part of the tool registry's `tools/post-execute` waterfall this plugin
 * listens to, declared structurally.
 *
 * The plugin does not depend on `@deepseek-ai/dsh-tools`: the desktop resolves
 * it against a packaged harness whose tool types differ from this repository's
 * source, and only these members are identical in both. Keep them in step with
 * the `Events` merge in `packages/core/tools/src/index.ts`.
 * @module dsh-skill-library/tool-events
 */
import '@deepseek-ai/cordis'

/** One content block of a tool result; only text blocks are produced here. */
export interface TextBlock {
  type: 'text'
  text: string
}

/** The call that just ran, as `tools/post-execute` passes it. */
export interface PostExecuteCall {
  /** Registered tool name. */
  readonly name: string
  /** Parsed arguments the model sent. */
  readonly arguments: unknown
  /** Cancellation of the caller. */
  readonly signal?: AbortSignal
}

/** The dispatch outcome; only whether it failed is read. */
export interface PostExecuteResult {
  readonly isError: boolean
}

/** A post-dispatch decision: accept the result, or replace it with an error carrying `feedback`. */
export type PostExecuteDecision =
  | { kind: 'accept', [key: string]: unknown }
  | { kind: 'block', feedback: TextBlock[], [key: string]: unknown }

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Accept, replace, enrich, or block a normalized dispatch result. `next()`
     * accepts it unchanged; thrown tools still reach this waterfall as errors.
     * @param exec - the call that just ran.
     * @param result - the dispatch outcome.
     * @mode waterfall
     */
    'tools/post-execute'(
      exec: PostExecuteCall,
      result: Readonly<PostExecuteResult>,
      next: () => Promise<PostExecuteDecision>,
    ): Promise<PostExecuteDecision>
  }
}
