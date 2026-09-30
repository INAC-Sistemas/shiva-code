// A preset row that registers one tool named from config, so a test can read
// which composition an agent joined from its tool catalog. Import-free: the
// Loader resolves entry modules through Node's ESM resolver.
export const name = 'role-tool'
export const inject = ['tools']

export function apply(ctx, config) {
  ctx.effect(() => ctx.tools.register({
    name: config.tool,
    description: `fixture tool ${config.tool}`,
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: String(value) }] },
    execute: () => Promise.resolve(config.tool),
  }))
}
