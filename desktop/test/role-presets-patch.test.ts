import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import * as packagedSubagent from '@deepseek-ai/dsh-subagent'

// Behavior of the harness patches under patches/ that let a delegated child
// mount its own agent preset (the `team` presets depend on them), exercised on
// the packaged 0.1.2-alpha.4 modules the desktop actually runs.
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'role-presets')

/**
* The patched `dsh-subagent` surface. The patches change the packaged JS only,
* so the packaged declarations do not name these members.
*/
interface PatchedSubagent {
  prepareChildComposition(parent: unknown, composition: { agentPreset?: string }): Promise<unknown>
  childSessionMeta(parent: unknown, childDepth: number, isSeeded: boolean, composition: unknown): Record<string, unknown>
  applyChildComposition(childCtx: Context, parent: unknown, composition: unknown): void
  snapshotSubagentDescriptor(input: Record<string, unknown>): Record<string, unknown>
  foldSubagentDescriptor(events: readonly unknown[]): Record<string, unknown> | undefined
}
const {
  applyChildComposition,
  childSessionMeta,
  foldSubagentDescriptor,
  prepareChildComposition,
  snapshotSubagentDescriptor,
} = packagedSubagent as unknown as PatchedSubagent

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

async function harness(): Promise<Context> {
  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = pathToFileURL(FIXTURES).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt, {})
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(AgentPresets, {
    default: 'manager',
    roots: [{ path: path.join(FIXTURES, 'presets'), trust: 'system' }],
    includeShippedRoot: false,
    includeUserRoot: false,
  })
  return ctx
}

const toolNames = (ctx: Context, agent: unknown): string[] =>
  ctx.tools.schemas(agent as never).map((schema: { name: string }) => schema.name).sort()

describe('delegated children on their own agent preset', () => {
  it('composes the child from the role preset while the parent keeps its own', async () => {
    const ctx = await harness()
    const parent = (await ctx.agents.create({
      sessionId: SessionId('manager'),
      setup: async (agentCtx: Context) => void await ctx.agentPresets.mount(agentCtx, 'manager'),
    })).agent

    const composition = await prepareChildComposition(parent, { agentPreset: 'role' })
    const child = (await ctx.agents.create({
      sessionId: SessionId('role-child'),
      meta: childSessionMeta(parent, 1, false, composition),
      setup: (childCtx: Context) => { applyChildComposition(childCtx, parent, composition) },
    })).agent

    expect(toolNames(ctx, parent)).toEqual(['manager_only'])
    expect(toolNames(ctx, child)).toEqual(['role_only'])
    expect(child.session.header.agentPreset).toBe('role')
  })

  it('rejects an unknown role preset before a child exists', async () => {
    const ctx = await harness()
    const parent = (await ctx.agents.create({
      sessionId: SessionId('manager-unknown'),
      setup: async (agentCtx: Context) => void await ctx.agentPresets.mount(agentCtx, 'manager'),
    })).agent

    await expect(prepareChildComposition(parent, { agentPreset: 'ghost' }))
      .rejects.toMatchObject({ code: 'AGENT_PRESET_UNAVAILABLE' })
  })

  it('keeps hidden role presets out of the picker', async () => {
    const ctx = await harness()

    const roster = await ctx.agentPresets.remoteExportList()

    expect(roster.presets.map((row: { id: string }) => row.id)).toEqual(['manager'])
  })

  it('records the role preset in a version-4 continuable descriptor that folds back', () => {
    const descriptor = snapshotSubagentDescriptor({
      mode: 'continuable', provider: 'spawn', label: 'backend', agentPreset: 'team-backend',
    })

    expect(descriptor).toMatchObject({ version: 4, agentPreset: 'team-backend' })
    expect(foldSubagentDescriptor([{ type: 'subagent/descriptor', data: descriptor }]))
      .toEqual(descriptor)
  })
})
