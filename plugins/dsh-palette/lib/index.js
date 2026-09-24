// dsh-palette host half: the `palette_pick` tool and the API the Paletas tab
// uses. The tool opens a request, the tab (opened automatically by its client
// half) shows the picker, and the person's confirmed choice resolves the tool
// call — so the palette reaches the model as a logged tool result.

import { defineTool } from '@deepseek-ai/dsh-tools'
import { assertSelection, assertSuggestions, PRESET_PALETTES } from './palettes.js'
import { PaletteRequests } from './requests.js'

export const inject = ['webServer', 'tools']

/** Tab type the client registers; the model and dsh-sidebar can open it by this id. */
export const TAB_ID = 'dsh-palette:picker'

function log(msg) {
  console.log(`[dsh-palette] ${msg}`)
}

/** What the model is told to do with the answer, next to the colors. */
const NEXT_STEP = 'Follow skill ui-palette from section 4: map these colors to every role in light and dark '
  + '(derive the missing ones), measure contrast, record mds/epics/<epic>/03-palette.md, and write '
  + 'prototype/theme.js, which sets the Tailwind theme colors.'

function createTool(requests) {
  return defineTool({
    name: 'palette_pick',
    description:
      'Let the requester choose the product color palette in the Paletas tab, which this tool opens by itself. ' +
      'The tab shows preset palettes filterable by color and style, a generator, fields for custom hex colors, and ' +
      'your own suggestions first. The call waits until the requester confirms a palette and returns it ' +
      '({source, name, colors, roles}), or {cancelled:true}. Use it at the start of /03-prototype, before any screen, ' +
      'instead of writing a palettes page yourself.',
    parameters: {
      question: { type: 'string', description: 'What to ask, in the requester\'s language (shown above the picker).' },
      suggestions: {
        type: 'array',
        description: 'Up to 8 palettes you propose from the brief, recommended first: [{name, colors:["#RRGGBB",…], note}].',
        items: { type: 'object', additionalProperties: true },
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{
        type: 'text',
        text: value?.cancelled
          ? 'palette_pick: the requester closed the picker without choosing.'
          : `palette_pick: ${JSON.stringify(value)}`,
      }],
    },
    async execute(args, exec) {
      const suggestions = assertSuggestions(args.suggestions)
      const question = typeof args.question === 'string' && args.question.trim() !== ''
        ? args.question.trim().slice(0, 300)
        : 'Escolha a paleta de cores do sistema.'
      const answer = await requests.open(question, suggestions, exec?.signal)
      return answer.cancelled ? { cancelled: true } : { ...answer, next: NEXT_STEP }
    },
    presentCall: () => ({ card: 'generic', title: 'Escolher paleta de cores', kind: 'other' }),
  })
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > limitBytes) { rejectP(new Error('payload too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { rejectP(new Error('invalid JSON body')) } })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

export function apply(ctx) {
  const requests = new PaletteRequests()
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer unavailable — plugin inactive')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/palette/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'presets':
          return json(res, 200, { ok: true, palettes: PRESET_PALETTES })
        case 'pending':
          return json(res, 200, { ok: true, request: requests.pending() })
        case 'choose': {
          const selection = assertSelection(payload.selection)
          if (!requests.answer(String(payload.id ?? ''), selection)) {
            return json(res, 409, { ok: false, error: 'nenhum pedido de paleta aberto — o agente ainda não pediu, ou já recebeu a resposta' })
          }
          log(`palette chosen: ${selection.name} (${selection.source})`)
          return json(res, 200, { ok: true })
        }
        case 'cancel':
          requests.answer(String(payload.id ?? ''), { cancelled: true })
          return json(res, 200, { ok: true })
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/palette/api', handler }), 'dsh-palette: api')

  const tools = ctx.get('tools')
  if (tools && typeof tools.register === 'function') {
    const tool = createTool(requests)
    ctx.effect(() => tools.register(tool), `dsh-palette: tool ${tool.name}`)
    log(`agent tool: ${tool.name}`)
  }
  log('loaded')
}
