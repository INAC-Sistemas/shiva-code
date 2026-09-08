/**
 * What a preset's layer keeps to itself, and what the global layer hands to
 * everyone.
 *
 * This is the property the VPS-owned profile feature rests on. A profile turns
 * plugins on and off by putting their rows in the `profile` agent preset rather
 * than in the host composition — and that only works because a registration
 * files into the layer of its calling context's scope. A row on the host plane
 * lands in the GLOBAL layer instead, which every agent reads no matter which
 * preset it joined; `dsh-skill-library` sat there and reached every agent in
 * every profile until it moved.
 *
 * The scenario issues no model request, so it needs no replay fixture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-agent-presets'
import type {} from '@deepseek-ai/dsh-skill'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'

/** A skill only the `cordis` preset's own composition contributes. */
const PRESET_SCOPED_SKILL = 'cordis-plugin-development'

describe('agent preset scope isolation', () => {
  let scaffold: WebScaffold
  let onCordis: AgentHandle
  let onStandard: AgentHandle
  let disposeGlobalSection: () => void

  beforeAll(async () => {
    scaffold = await launchWebScaffold()
    disposeGlobalSection = scaffold.ctx.systemPrompt.section({
      name: 'test:host-plane-section',
      order: 998,
      text: 'CONTRIBUTED ON THE HOST PLANE.',
    })
    const create = (id: string, preset: string): Promise<AgentHandle> =>
      scaffold.ctx.agents.create({
        sessionId: SessionId(id),
        meta: { cwd: scaffold.workspaceCwd, agentPreset: preset },
        agentOptions: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
        setup: agentCtx => scaffold.ctx.agentPresets.mount(agentCtx, preset).then(() => undefined),
      })
    onCordis = await create('preset-scope-cordis', 'cordis')
    onStandard = await create('preset-scope-standard', 'standard')
  })

  afterAll(async () => {
    const failures: unknown[] = []
    await onCordis?.dispose().catch((error: unknown) => failures.push(error))
    await onStandard?.dispose().catch((error: unknown) => failures.push(error))
    try {
      disposeGlobalSection?.()
    } catch (error: unknown) {
      failures.push(error)
    }
    await scaffold?.close().catch((error: unknown) => failures.push(error))
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) throw new AggregateError(failures, 'preset scope isolation teardown failed')
  })

  it('keeps a skill provider mounted inside one preset out of another preset', async () => {
    // `cordis` mounts its own skill-filesystem row with `customSkillDirs`
    // pointing at the preset's own directory. That registration files into the
    // cordis layer, so it reaches agents parented under that mount and nobody
    // else. Moving `dsh-skill-library` from the desktop patch into the
    // `profile` preset buys exactly this.
    const named = async (agent: AgentHandle): Promise<boolean> => {
      const skills = await scaffold.ctx.skills.list({
        cwd: scaffold.workspaceCwd,
        scope: agent.agent,
      })
      return skills.some(skill => skill.name === PRESET_SCOPED_SKILL)
    }

    expect(await named(onCordis)).toBe(true)
    expect(await named(onStandard)).toBe(false)
  })

  it('keeps a tool mounted inside one preset out of another preset', () => {
    const toolNames = (agent: AgentHandle): string[] =>
      scaffold.ctx.tools.schemas(agent.agent).map(tool => tool.name).sort()

    // `cordis` is `standard` plus the self-referential toolset.
    const cordisOnly = toolNames(onCordis).filter(name => !toolNames(onStandard).includes(name))

    expect(cordisOnly).toContain('cordis_define')
    expect(toolNames(onStandard)).not.toContain('cordis_define')
  })

  it('hands a host-plane prompt section to every preset, which is why rows must move rather than be hidden', async () => {
    // The failing direction, asserted on purpose. The three scope-aware
    // registries all seed their read from the global layer, and only
    // `ToolRuntime.restrict()` can subtract — nothing can subtract a prompt
    // section or a skill provider. So "the row is not in the host composition"
    // is the whole mechanism; there is no runtime filter to fall back on.
    for (const agent of [onCordis, onStandard]) {
      const assembly = await scaffold.ctx.systemPrompt.assemble({ scope: agent.agent })
      expect(assembly.sections.map(section => section.name))
        .toContain('test:host-plane-section')
    }
  })
})
