// dsh-web-search host half: registers a keyless DuckDuckGo search provider on
// the harness web seam (`ctx.web.registerSearchProvider`), so the agents'
// native web_search tool works with no API key at all — the same provider
// interface DeepSeek/Exa/Perplexity plug into. A small HTTP route backs the
// sidebar tab's live search box; both paths share one scraper.

export const inject = ['web', 'webServer']

// DuckDuckGo's HTML endpoints: no API, no key, plain POST/GET + form parsing.
// The lite endpoint is the fallback when the HTML one throttles or reshapes.
const DDG_HTML = 'https://html.duckduckgo.com/html/'
const DDG_LITE = 'https://lite.duckduckgo.com/lite/'
const REQUEST_TIMEOUT_MS = 15_000
// Sent so the endpoints answer with the regular result markup instead of a
// bot-walled page; a plain fetch has no cookie/session state to carry.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&laquo;': '«',
  '&raquo;': '»',
}

/**
 * Decode the HTML entities DuckDuckGo puts in titles and snippets, including
 * numeric references (`&#83;`, `&#x53;`).
 * @param s - raw HTML-escaped text.
 * @returns the decoded text.
 */
export function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|#x27|#39|nbsp|hellip|mdash|ndash|laquo|raquo);/g, (m) => ENTITIES[m] ?? m)
}

/**
 * Strip tags and collapse whitespace out of one scraped fragment.
 * @param s - raw HTML fragment.
 * @returns the plain text content.
 */
export function stripTags(s) {
  return decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/**
 * Resolve a DuckDuckGo result href into the real target URL. Results point at
 * `//duckduckgo.com/l/?uddg=<encoded>&rut=…` redirects; anything else (already
 * absolute, or protocol-relative) passes through normalized to https.
 * @param href - the href attribute value from a result anchor.
 * @returns the absolute target URL, or '' when the href is unusable.
 */
export function unwrapDdgHref(href) {
  const raw = String(href ?? '').trim()
  if (!raw) return ''
  try {
    const abs = raw.startsWith('//') ? `https:${raw}` : raw
    const u = new URL(abs, 'https://duckduckgo.com')
    const uddg = u.searchParams.get('uddg')
    if (uddg) {
      const target = decodeURIComponent(uddg)
      return /^https?:\/\//i.test(target) ? target : `https://${target}`
    }
    if (u.hostname.includes('duckduckgo.com')) return ''
    return u.toString()
  } catch { return '' }
}

function anchorAttrs(tag) {
  return tag
}

/**
 * Parse one anchor tag's attributes into `{href, cls}`.
 * @param tag - the full `<a …>` opening tag text.
 * @returns the href and class attribute values.
 */
function parseAnchor(tag) {
  const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag)
  const cls = /class\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag)
  return {
    href: href ? (href[2] ?? href[3] ?? '') : '',
    cls: cls ? (cls[2] ?? cls[3] ?? '') : '',
  }
}

function collectAnchors(html, className, limit) {
  const out = []
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null && out.length <= limit) {
    const { href, cls } = parseAnchor(m[1])
    if (!cls.split(/\s+/).includes(className)) continue
    out.push({ href, text: m[2] })
  }
  return out
}

function collectBlocks(html, tagPattern, limit) {
  const out = []
  const re = tagPattern
  let m
  while ((m = re.exec(html)) !== null && out.length <= limit) out.push(m[1])
  return out
}

/**
 * Parse the html.duckduckgo.com result page into normalized sources.
 * @param html - the response body.
 * @param limit - how many results to keep at most.
 * @returns `{url, title, snippet}` entries; result without a usable URL are dropped.
 */
export function parseHtmlResults(html, limit) {
  const anchors = collectAnchors(html, 'result__a', limit + 1)
  const snippets = collectBlocks(html, /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi, limit + 1)
  const results = []
  for (let i = 0; i < anchors.length && results.length < limit + 1; i++) {
    const url = unwrapDdgHref(anchors[i].href)
    if (!url) continue
    results.push({
      url,
      title: stripTags(anchors[i].text),
      snippet: snippets[i] ? stripTags(snippets[i]) : '',
    })
  }
  return results
}

/**
 * Parse the lite.duckduckgo.com result page (simpler table markup) into the
 * same normalized shape.
 * @param html - the response body.
 * @param limit - how many results to keep at most.
 * @returns `{url, title, snippet}` entries.
 */
export function parseLiteResults(html, limit) {
  const anchors = collectAnchors(html, 'result-link', limit + 1)
  const snippets = collectBlocks(html, /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi, limit + 1)
  const results = []
  for (let i = 0; i < anchors.length && results.length < limit + 1; i++) {
    const url = unwrapDdgHref(anchors[i].href)
    if (!url) continue
    results.push({
      url,
      title: stripTags(anchors[i].text),
      snippet: snippets[i] ? stripTags(snippets[i]) : '',
    })
  }
  return results
}

function mergeSignal(signal) {
  const signals = [signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)].filter(Boolean)
  return signals.length === 1 ? signals[0] : AbortSignal.any(signals)
}

/**
 * Run one keyless search: POST the HTML endpoint first, fall back to the lite
 * endpoint when the HTML one answers but yields too little.
 * @param query - the search query.
 * @param opts - `maxResults` (default 10) and an optional abort `signal`.
 * @returns normalized `{url, title, snippet}` entries.
 * @throws when both endpoints fail or yield nothing (network block, reshaped markup).
 */
export async function ddgSearch(query, opts = {}) {
  const q = String(query ?? '').trim()
  if (!q) throw new Error('consulta vazia')
  const limit = Number(opts.maxResults) > 0 ? Math.min(Number(opts.maxResults), 25) : 10
  const signal = mergeSignal(opts.signal)
  const headers = { 'user-agent': BROWSER_UA, accept: 'text/html' }
  let results = []
  try {
    const r = await fetch(DDG_HTML, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q }).toString(),
      signal,
    })
    if (r.ok) results = parseHtmlResults(await r.text(), limit)
  } catch (e) {
    if (signal?.aborted) throw e
  }
  if (results.length < 2) {
    try {
      const r = await fetch(`${DDG_LITE}?q=${encodeURIComponent(q)}`, { headers, signal })
      if (r.ok) {
        const lite = parseLiteResults(await r.text(), limit)
        if (lite.length > results.length) results = lite
      }
    } catch (e) {
      if (signal?.aborted) throw e
    }
  }
  if (!results.length) throw new Error('DuckDuckGo não retornou resultados (rede bloqueada ou markup alterado)')
  return results
}

const PROVIDER_ID = 'ddg'

/** The WebSearchProvider implementation registered on the harness web seam. */
export const ddgProvider = {
  id: PROVIDER_ID,
  /** Keyless: always usable; no credential to check. */
  available() {
    return true
  },
  /**
   * One search through {@link ddgSearch}, shaped as the seam's WebSearchResult.
   * Fetches one extra entry so `truncated` reports the provider-side cut.
   * @param request - `{query, maxResults?}` from the web capability.
   * @param signal - cancellation from the tool call.
   * @returns `{sources, truncated}` (no `content`: DDG has no generated answer).
   */
  async search(request, signal) {
    const max = Number(request?.maxResults) > 0 ? Number(request.maxResults) : 10
    const raw = await ddgSearch(request.query, { maxResults: max + 1, signal })
    const truncated = raw.length > max
    return {
      sources: raw.slice(0, max).map(({ url, title, snippet }) => ({ url, title, snippet })),
      truncated,
    }
  },
}

// ── API (backs the sidebar tab's live search box) ─────────────────────────
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

export function apply(ctx, config = {}) {
  const log = (msg) => console.log(`[dsh-web-search] ${msg}`)
  const web = ctx.get('web')
  if (!web || typeof web.registerSearchProvider !== 'function') {
    log('web capability unavailable — provider not registered')
    return
  }
  ctx.effect(() => web.registerSearchProvider(ddgProvider), 'dsh-web-search: provider ddg')
  log('search provider "ddg" registrado (sem chave de API)')

  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer service unavailable — test route not registered')
    return
  }
  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/web-search/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'status':
          return json(res, 200, { ok: true, provider: PROVIDER_ID, keyless: true })
        case 'search': {
          const query = String(payload.query ?? '').trim()
          if (!query) return json(res, 400, { ok: false, error: 'query obrigatória' })
          const sources = await ddgSearch(query, { maxResults: Number(payload.maxResults) || 10 })
          return json(res, 200, { ok: true, provider: PROVIDER_ID, sources })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 200, { ok: false, error: String((e && e.message) || e) })
    }
  }
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/web-search/api', handler }), 'dsh-web-search: api')
  log('loaded')
}
