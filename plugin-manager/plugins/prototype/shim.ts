// Shim de automação injetado em toda página HTML do protótipo.
//
// Esta é a fonte de verdade do shim. A casca (`dsh-prototype`) o busca daqui,
// guarda em cache e o serve na origem dela — a página nunca fala com a VPS
// direto, porque um `<script src>` não carrega o header `Authorization` e o
// iframe precisa continuar same-origin. Corrigir a automação do browser passa
// a ser um deploy aqui, sem reinstalar plugin em máquina de cliente.
//
// A casca embarca uma cópia congelada como fallback offline. `SHIM_VERSION`
// existe para que os logs dos dois lados digam qual cópia está no ar.

/** Versão da fonte. Suba a cada mudança de comportamento do shim. */
export const SHIM_VERSION = "1";

/**
 * Código do shim, em ES5 e sem dependências: ele roda dentro do protótipo do
 * usuário, que pode ser qualquer coisa, e não pode assumir bundler nem polyfill.
 *
 * Contrato com a aba (via `postMessage`):
 * - recebe `{source:'dsh-prototype', id, op, ...args}`
 * - responde `{source:'dsh-prototype-shim', id, ok, result|error, consoleTail}`
 * - emite `{source:'dsh-prototype-shim', console:{level,text,time}}` a cada
 *   `console.error`/`warn`, erro não capturado e rejeição não tratada.
 */
export const SHIM_JS = `(function(){
if (window.__DSH_PROTOTYPE_SHIM__) return;
window.__DSH_PROTOTYPE_SHIM__ = ${JSON.stringify(SHIM_VERSION)};
var buffer = [];
var MAX = 200;
function push(level, text) {
  var entry = { level: level, text: String(text), time: new Date().toISOString() };
  buffer.push(entry); if (buffer.length > MAX) buffer.shift();
  try { parent.postMessage({ source: 'dsh-prototype-shim', console: entry }, '*'); } catch (e) {}
}
['error','warn'].forEach(function (level) {
  var original = console[level].bind(console);
  console[level] = function () {
    var parts = []; for (var i = 0; i < arguments.length; i++) { try { parts.push(typeof arguments[i] === 'object' ? JSON.stringify(arguments[i]) : String(arguments[i])); } catch (e) { parts.push('[unserializable]'); } }
    push(level, parts.join(' '));
    original.apply(null, arguments);
  };
});
window.addEventListener('error', function (e) { push('error', 'Uncaught: ' + e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0)); });
window.addEventListener('unhandledrejection', function (e) { push('error', 'Unhandled rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || String(e.reason))); });
function findByText(text) {
  var nodes = document.querySelectorAll('button, a, [role=button], input[type=button], input[type=submit], label, li, span, div');
  var needle = String(text).trim().toLowerCase();
  for (var i = 0; i < nodes.length; i++) {
    var t = (nodes[i].textContent || '').trim().toLowerCase();
    if (t && t.indexOf(needle) !== -1 && nodes[i].offsetParent !== null) return nodes[i];
  }
  return null;
}
function one(el) { el.scrollIntoView({ block: 'center' }); el.click(); return { clicked: true, tag: el.tagName, text: (el.textContent || el.value || '').trim().slice(0, 120) }; }
function setNative(el, value) {
  var proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
var ops = {
  click: function (a) {
    var el = a.selector ? document.querySelector(a.selector) : findByText(a.text);
    if (!el) throw new Error('element not found: ' + (a.selector || a.text));
    return one(el);
  },
  fill: function (a) {
    var el = document.querySelector(a.selector);
    if (!el) throw new Error('element not found: ' + a.selector);
    setNative(el, String(a.value));
    return { filled: true, value: String(a.value).slice(0, 120) };
  },
  read: function (a) {
    var el = document.querySelector(a.selector);
    if (!el) throw new Error('element not found: ' + a.selector);
    if (a.attr) return el.getAttribute(a.attr);
    return el.value !== undefined && el.tagName !== 'DIV' && el.tagName !== 'SPAN' ? el.value : (el.textContent || '').trim();
  },
  eval: function (a) {
    var fn = new Function('return (' + a.code + ')');
    return fn();
  },
  wait_for: function (a) {
    var deadline = Date.now() + (a.timeoutMs || 5000);
    return new Promise(function (resolveP, rejectP) {
      (function check() {
        var el = document.querySelector(a.selector);
        if (el) return resolveP({ found: true });
        if (Date.now() > deadline) return rejectP(new Error('wait_for timeout: ' + a.selector));
        setTimeout(check, 120);
      })();
    });
  },
  console_dump: function () { return { entries: buffer }; },
};
window.addEventListener('message', function (e) {
  var cmd = e.data;
  if (!cmd || cmd.source !== 'dsh-prototype' || !cmd.id) return;
  var op = ops[cmd.op];
  if (!op) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: false, error: 'unknown op ' + cmd.op }, '*'); return; }
  Promise.resolve().then(function () { return op(cmd); })
    .then(function (result) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: true, result: result, consoleTail: buffer.slice(-20) }, '*'); })
    .catch(function (err) { parent.postMessage({ source: 'dsh-prototype-shim', id: cmd.id, ok: false, error: String((err && err.message) || err) }, '*'); });
});
})();
`;
