// Automated regression for the full-scope web agent.
//
// Drives the real page target through the desktop bridge and asserts that no
// operation ever hangs: long navigation/read cycles, a page `prompt`/`confirm`
// (native dialogs must be neutralized in agent mode), a `beforeunload` +
// reload, and a Basic-auth 401 (must fail fast, never a credential dialog).
//
// Requires the app running with --remote-debugging-port=<port>:
//   node scripts/web-agent-stress.mjs 9335
//
// Exit code 0 = every step resolved inside its own timeout; 1 = at least one
// step failed or hung.

const PORT = process.argv[2] ?? process.env.DSH_DEBUG_PORT ?? '9335'
const BASE = `http://127.0.0.1:${PORT}`

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A real local file for the upload op (the main process reads it from disk). */
function makeUploadFixture() {
  const file = join(tmpdir(), 'dsh-stress-upload.txt')
  writeFileSync(file, 'dsh web-agent stress fixture\n', 'utf8')
  return file
}

async function main() {
  const list = await (await fetch(`${BASE}/json/list`)).json()
  const pages = list.filter((t) => t.type === 'page')
  const target =
    pages.find((t) => /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(t.url)) ??
    pages.find((t) => /127\.0\.0\.1/.test(t.url) && !/windows-menu/.test(t.url) && !/railway\.app/.test(t.url))
  if (!target) {
    console.error('main window target not found on CDP. targets:')
    for (const t of list) console.error(` - ${t.type} ${t.url}`)
    process.exit(2)
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })

  await send('Runtime.enable', {})
  const uploadFile = makeUploadFixture()
  const script = `(${pageScript.toString()})(${JSON.stringify(uploadFile)})`
  const res = await send('Runtime.evaluate', {
    expression: script,
    awaitPromise: true,
    returnByValue: true,
    timeout: 600000,
  })
  if (res.result?.exceptionDetails) {
    console.error('page evaluation threw:', JSON.stringify(res.result.exceptionDetails).slice(0, 800))
    process.exit(1)
  }
  const out = res.result?.result?.value
  ws.close()
  if (!out) {
    console.error('no result from the page')
    process.exit(1)
  }
  if (out.fatal) {
    console.error('FATAL:', out.fatal)
    process.exit(1)
  }

  const steps = out.steps
  const failures = steps.filter((s) => !s.ok)
  const maxMs = steps.reduce((m, s) => Math.max(m, s.ms), 0)
  for (const s of steps) {
    const flag = s.ok ? 'ok  ' : 'FAIL'
    console.log(`${flag} ${String(s.ms).padStart(6)}ms  ${s.label}${s.detail ? '  -> ' + String(s.detail).slice(0, 160) : ''}`)
  }
  console.log('\n=== motion (measured numbers) ===')
  console.log(JSON.stringify(out.motion ?? null, null, 1).slice(0, 900))
  console.log('\n=== audit (findings) ===')
  const a = out.audit
  if (a && a.findings) {
    console.log(`count=${a.count} scanned=${a.scanned} inventory=${(a.motionInventory || []).length}`)
    for (const f of a.findings) console.log(` - [${f.rule}] ${String(f.detail).slice(0, 90)} :: ${String(f.measured).slice(0, 90)}`)
  } else {
    console.log(JSON.stringify(a ?? null).slice(0, 400))
  }
  console.log(`\ntotal steps: ${steps.length} | failures: ${failures.length} | slowest: ${maxMs}ms`)
  process.exit(failures.length === 0 ? 0 : 1)
}

function pageScript(uploadPath) {
  return (async () => {
    const out = { steps: [], fatal: null }
    const b = window.dshDesktopWebAgent
    if (!b) {
      out.fatal = 'window.dshDesktopWebAgent missing (is this the DSH main window?)'
      return out
    }
    const ops = await fetch('/browser/api/ops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).then((r) => r.json())
    const attach = await b.attach({ x: 40, y: 90, width: 900, height: 620 }, ops.source)
    if (!attach || !attach.ok) {
      out.fatal = 'attach failed: ' + JSON.stringify(attach)
      return out
    }
    const step = async (label, fn) => {
      const t0 = Date.now()
      try {
        const r = await fn()
        out.steps.push({ label, ms: Date.now() - t0, ok: !!(r && r.ok), detail: r && r.ok ? undefined : r && r.error })
      } catch (e) {
        out.steps.push({ label, ms: Date.now() - t0, ok: false, detail: String((e && e.message) || e) })
      }
    }
    const probe = async (label, fn) => {
      try {
        const r = await fn()
        return r && r.ok ? { data: r.data } : { data: null, error: r && r.error }
      } catch (e) {
        return { data: null, error: String((e && e.message) || e) }
      }
    }

    // 1) long cycle: 10 x (navigate -> eval -> navigate -> eval) = 40 ops
    for (let i = 1; i <= 10; i++) {
      await step(`nav-ex#${i}`, () => b.navigate('https://example.com/?i=' + i))
      await step(`eval-title-ex#${i}`, () => b.run({ op: 'eval', code: 'document.title' }))
      await step(`nav-org#${i}`, () => b.navigate('https://example.org/?i=' + i))
      await step(`eval-h1-org#${i}`, () => b.run({ op: 'eval', code: 'document.querySelector("h1") ? document.querySelector("h1").textContent : null' }))
    }

    // 2) real interaction on a form page
    await step('nav-form', () => b.navigate('https://httpbin.org/forms/post'))
    await step('fill-custname', () => b.run({ op: 'fill', selector: 'input[name="custname"]', value: 'dsh-agent' }))
    await step('read-custname', () => b.run({ op: 'read', selector: 'input[name="custname"]' }))
    await step('click-submit', () => b.run({ op: 'click', selector: 'form button' }))
    await step('screenshot-form', () => b.run({ op: 'screenshot' }))

    // 3) native-dialog guard: prompt/confirm must return instantly, no dialog
    await step('nav-ex2', () => b.navigate('https://example.com'))
    await step('prompt-guard', () => b.run({ op: 'eval', code: "(function(){ return String(window.prompt('o que esta sendo enviado')) })()" }))
    await step('confirm-guard', () => b.run({ op: 'eval', code: '(function(){ return String(window.confirm("x")) })()' }))

    // 4) beforeunload + reload must not park the channel
    await step('beforeunload-reload', () => b.run({ op: 'eval', code: "(function(){ window.onbeforeunload = function(){ return 'x' }; location.reload(); return 'reloading' })()" }))
    await step('eval-after-reload', () => b.run({ op: 'eval', code: 'document.title' }))

    // 5) Basic-auth 401 must fail fast (never a credential dialog)
    await step('basic-auth', () => b.run({ op: 'eval', code: "(function(){ return fetch('https://httpbin.org/basic-auth/u/p').then(function(r){ return 'status:' + r.status }).catch(function(e){ return 'err:' + e.message }) })()" }))

    // 6) new ops — all deterministic, self-injected content
    await step('nav-ex3', () => b.navigate('https://example.com'))
    await step('eval-mark', () => b.run({ op: 'eval', code: "(function(){ document.title = 'MARCADOR'; return document.title })()" }))
    await step('reload', () => b.run({ op: 'reload' }))
    await step('eval-after-reload-op', () => b.run({ op: 'eval', code: 'document.title' }))

    await step('eval-tall-page', () => b.run({ op: 'eval', code: "(function(){ document.body.innerHTML = '<div style=\"height:6000px\">alto</div><button id=\"rodape\" aria-label=\"ACEITAR\">ok</button>'; return document.body.scrollHeight })()" }))
    await step('scroll-bottom', () => b.run({ op: 'scroll', to: 'bottom' }))
    await step('scroll-to-selector', () => b.run({ op: 'scroll', selector: '#rodape' }))
    await step('click-by-role-name', () => b.run({ op: 'click', role: 'button', name: 'aceitar' }))

    await step('eval-inject-input', () => b.run({ op: 'eval', code: "(function(){ document.body.insertAdjacentHTML('afterbegin', '<input aria-label=\"email do cliente\" />'); return true })()" }))
    await step('fill-by-role-name', () => b.run({ op: 'fill', role: 'textbox', name: 'email do cliente', value: 'entregador@teste.dev' }))
    await step('read-back-fill', () => b.run({ op: 'eval', code: "document.querySelector('input[aria-label=\\'email do cliente\\']').value" }))

    await step('eval-inject-file-input', () => b.run({ op: 'eval', code: "(function(){ document.body.insertAdjacentHTML('afterbegin', '<input type=\"file\" id=\"foto\" />'); return true })()" }))
    await step('upload', () => b.run({ op: 'upload', selector: '#foto', path: uploadPath }))
    await step('read-uploaded-name', () => b.run({ op: 'eval', code: "document.querySelector('#foto').files.length + ':' + document.querySelector('#foto').files[0].name" }))

    await step('eval-late-mount', () => b.run({ op: 'eval', code: "(function(){ setTimeout(function(){ document.body.insertAdjacentHTML('beforeend', '<p id=\"tarde\">montou tarde</p>') }, 700); return 'agendado' })()" }))
    await step('wait_stable', () => b.run({ op: 'wait_stable', quietMs: 400, timeoutMs: 8000 }))
    await step('read-late-mount', () => b.run({ op: 'eval', code: "document.getElementById('tarde') ? 'presente' : 'ausente'" }))

    await step('screenshot-viewport', () => b.run({ op: 'screenshot' }))
    await step('screenshot-full', () => b.run({ op: 'screenshot', full: true }))

    // 7) motion measurement (numbers, not impressions)
    await step('eval-setup-motion', () => b.run({ op: 'eval', code: "(function(){ var d=document.createElement('div'); d.id='mv'; d.style.cssText='position:fixed;left:20px;top:20px;width:40px;height:40px;background:#111;transform:translateY(8px);opacity:0;transition:transform 180ms cubic-bezier(0.23,1,0.32,1), opacity 180ms ease-out'; document.body.appendChild(d); return 'ok' })()" }))
    const before = await probe('motion-before', () => b.run({ op: 'motion', selector: '#mv', ms: 300 }))
    await step('eval-run-motion', () => b.run({ op: 'eval', code: "(function(){ var d=document.getElementById('mv'); requestAnimationFrame(function(){ d.style.transform='translateY(0)'; d.style.opacity='1' }); return 'go' })()" }))
    const after = await probe('motion-after', () => b.run({ op: 'motion', selector: '#mv', ms: 600 }))

    // 8) audit with planted violations
    await step('eval-setup-audit', () => b.run({ op: 'eval', code: "(function(){ var s=document.createElement('style'); s.textContent='.bad{transition:all 500ms ease-in}.hov:hover{transform:scale(1.05)}'; document.head.appendChild(s); document.body.insertAdjacentHTML('beforeend','<div class=\"bad\" id=\"bad1\">x</div><div id=\"cd\" onclick=\"void 0\">clicavel</div><input id=\"tiny\" style=\"font-size:12px\"><div class=\"hov\" id=\"hov\">hover</div><button id=\"small\" style=\"width:20px;height:20px\">a</button>'); return 'ok' })()" }))
    const audit = await probe('audit', () => b.run({ op: 'audit' }))

    out.motion = { before: before && before.data, after: after && after.data }
    out.audit = audit && audit.data
    await step('eval-final', () => b.run({ op: 'eval', code: 'document.title' }))

    return out
  })()
}

main().catch((e) => {
  console.error('stress runner failed:', e)
  process.exit(1)
})
