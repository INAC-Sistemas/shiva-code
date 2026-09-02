// dsh-profiles host half: a KISS multiuser profile layer. One dsh, one home;
// a profile just decides which preset, which skills and which better-sidebar
// plugins are in play. Switching is logout → `location.reload()`. The active
// profile is persisted in ~/.dsh/profiles/profiles.json.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const inject = ['webServer', 'sessions']
export const PROFILES_FILE = join(homedir(), '.dsh', 'profiles', 'profiles.json')

// Raízes de skills conhecidas: o tier do nosso plugin (versionado no repo),
// o user-dsh e o user-agents. O modal mostra cada skill como um check.
const PLUGIN_SKILLS_DIR = fileURLToPath(new URL('../../dsh-skill-manager/skills/', import.meta.url))
const SKILL_ROOTS = [
  PLUGIN_SKILLS_DIR,
  join(homedir(), '.dsh', 'skills'),
  join(homedir(), '.agents', 'skills'),
]

/** Nomes de todas as skills disponíveis (dir bundle + .md flat). */
async function listSkills() {
  const names = new Set()
  for (const root of SKILL_ROOTS) {
    if (!existsSync(root)) continue
    let entries = []
    try { entries = await readdir(root, { withFileTypes: true }) } catch { continue }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      if (ent.isDirectory() && existsSync(join(root, ent.name, 'SKILL.md'))) names.add(ent.name)
      else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) names.add(ent.name.replace(/\.md$/i, ''))
    }
  }
  return [...names].sort()
}

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

// Tela inicial standalone (antes do app). HTML puro + JS vanilla; o "banco" é
// a mesma API /profiles/api. Sem React, sem dependência do harness.
const SPLASH_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>dsh — Perfis</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#141519;color:#e8e8ea;font-family:Segoe UI,Roboto,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.wrap{width:100%;max-width:820px;text-align:center}
h1{margin:0 0 6px;font-size:22px;letter-spacing:.02em}
.lead{font-size:13px;line-height:1.6;color:#b6b6bf;max-width:480px;margin:0 auto 22px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:20px}
.card{background:#1d1e25;border:1px solid #33343d;border-radius:12px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;gap:6px}
.card:hover{border-color:#f0b90b}
.card .nm{font-weight:600;font-size:14px}
.card .meta{font-size:11px;color:#9a9aa5;line-height:1.5}
.card .acts{display:flex;gap:6px;margin-top:8px}
button{background:#2a2b32;color:#e8e8ea;border:1px solid #43444d;border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
button:hover{background:#3a3b46}
button.primary{background:#f0b90b;border-color:transparent;color:#111;font-weight:600}
button.danger{color:#f87171;border-color:#7f1d1d}
button.danger:hover{background:#3b1212}
.add{font-size:13px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.68);display:none;align-items:center;justify-content:center;padding:24px}
.overlay.open{display:flex}
.modal{background:#1d1e25;border:1px solid #33343d;border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:20px;text-align:left}
.modal h2{margin:0 0 12px;font-size:16px}
.f{display:flex;flex-direction:column;gap:5px;margin-bottom:10px}
.f label{font-size:11px;font-weight:600;color:#9a9aa5}
.f input{background:#14151a;color:inherit;border:1px solid #33343d;border-radius:7px;padding:7px 10px;font-size:13px;outline:none;font-family:inherit}
.checks{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px}
.checks label{display:flex;gap:6px;align-items:center;cursor:pointer;color:#b6b6bf}
.acts{margin-top:14px;display:flex;gap:8px;justify-content:flex-end}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#111827;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;max-width:80vw;display:none}
.toast.show{display:block}.toast.err{border-color:#7f1d1d;color:#fca5a5}
</style></head><body>
<div class="wrap">
<h1>Quem está entrando?</h1>
<p class="lead">Cada perfil tem seu próprio preset, suas skills e seus plugins na barra lateral. Escolha um, ou crie o seu.</p>
<div class="grid" id="grid"></div>
<button class="primary add" id="add">+ Criar perfil</button>
</div>
<div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
<div class="toast" id="toast"></div>
<script>
var PLUGIN_LABELS={"dsh-skill-manager:skills":"Skills","dsh-mds:artifacts":"MDS (markdown)","dsh-prototype:view":"Prototype","dsh-openviking:memory":"Memory (OpenViking)","dsh-ssh-tunnel":"SSH Tunnel","dsh-docs-panel:docs":"Docs Panel","dsh-flowglass:flow":"Flowglass","dsh-sidebar-qa:ask":"Sidebar QA — Perguntar","dsh-sidebar-qa:history":"Sidebar QA — Histórico"};
var KEY={};
function api(m,p){return fetch('/profiles/api/'+m,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p||{})}).then(function(r){return r.json()})}
function toast(msg,err){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(err?' err':'');clearTimeout(KEY.t);KEY.t=setTimeout(function(){t.className='toast'},3000)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function render(list,plugins){var g=document.getElementById('grid');g.innerHTML=list.map(function(p){
  return '<div class="card"><div class="nm">'+esc(p.label)+'</div><div class="meta">Preset: '+esc(p.preset||'default')+' · '+(p.plugins||[]).length+' plugins · '+(p.skills||[]).length+' skills</div>'+
  '<div class="acts"><button class="primary" data-enter="'+esc(p.id)+'">Entrar</button><button data-edit="'+esc(p.id)+'">Editar</button><button class="danger" data-del="'+esc(p.id)+'">Excluir</button></div></div>'
}).join('')||'<p class="lead">Nenhum perfil ainda. Crie o primeiro.</p>'}
function openModal(draft,plugins,skillsList,isEdit){var m=document.getElementById('modal');
  var chk=plugins.map(function(id){return '<label class="pck"><input type="checkbox" class="pick-plugin" '+(draft.plugins.indexOf(id)>=0?'checked':'')+' value="'+esc(id)+'"> '+esc(PLUGIN_LABELS[id]||id)+'</label>'}).join('');
  var sk='<p class="dim">Nenhuma skill disponível ainda — crie em Skills.</p>';
  if(skillsList&&skillsList.length){var sel=(draft.skills||[]);
    sk=skillsList.map(function(s){var on=sel.indexOf(s)>=0||sel.length===0;return '<label class="skx"><input type="checkbox" class="pick-skill" '+(on?'checked':'')+' value="'+esc(s)+'"> '+esc(s)+'</label>'}).join('')}
  m.innerHTML='<h2>'+(isEdit?'Editar perfil':'Criar perfil')+'</h2>'+
  '<div class="f"><label>Identificador (minúsculas, 1-32)</label><input id="f-id" value="'+esc(draft.id)+'" placeholder="games | web | eri…"></div>'+
  '<div class="f"><label>Nome de exibição</label><input id="f-label" value="'+esc(draft.label)+'" placeholder="Games | Sistemas Web…"></div>'+
  '<div class="f"><label>Preset padrão</label><input id="f-preset" value="'+esc(draft.preset||'default')+'"></div>'+
  '<div class="f"><label>Plugins visíveis na barra lateral</label><div class="checks">'+chk+'</div></div>'+
  '<div class="f"><label>Skills do perfil</label><div class="checks">'+sk+'</div></div>'+
  '<div class="acts"><button id="m-cancel">Cancelar</button><button class="primary" id="m-save">Salvar</button></div>';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('m-cancel').onclick=closeModal;
  document.getElementById('m-save').onclick=function(){
    var plugins=[].map.call(m.querySelectorAll('.pick-plugin:checked'),function(c){return c.value});
    var skills=[].map.call(m.querySelectorAll('.pick-skill:checked'),function(c){return c.value});
    api(isEdit?'update':'create',{id:document.getElementById('f-id').value.trim().toLowerCase(),label:document.getElementById('f-label').value.trim(),preset:document.getElementById('f-preset').value.trim()||'default',plugins:plugins,skills:skills}).then(function(r){
      if(!r.ok)return toast(r.error||'falhou',true);closeModal();bootstrap();toast(isEdit?'Perfil atualizado':'Perfil criado')})
  }}
function closeModal(){document.getElementById('overlay').classList.remove('open')}
function bootstrap(){api('bootstrap').then(function(r){if(!r.ok)return;KEY.plugins=r.plugins||[];KEY.skills=r.availableSkills||[];render(r.profiles,r.plugins)})}
document.addEventListener('click',function(e){var et=e.target.dataset&&e.target.dataset.enter;var ed=e.target.dataset&&e.target.dataset.edit;var dd=e.target.dataset&&e.target.dataset.del;
  if(et){api('setActive',{active:et}).then(function(){location.href='/'})}
  else if(ed){loadOne(ed,function(p){openModal(p,KEY.plugins,KEY.skills,true)})}
  else if(dd){if(!confirm('Excluir perfil?'))return;api('delete',{id:dd}).then(function(r){if(!r.ok)return toast(r.error,true);bootstrap();toast('Perfil excluído')})}
  else if(e.target.id==='add'){api('bootstrap').then(function(r){KEY.plugins=r.plugins;KEY.skills=r.availableSkills||[];openModal({id:'',label:'',preset:'default',plugins:r.plugins.slice(),skills:[]},r.plugins,r.availableSkills,false)})}
})
function loadOne(id,cb){api('list').then(function(r){var p=r.profiles.find(function(x){return x.id===id});if(p)return cb(p)})}
document.addEventListener('click',function(e){if(e.target.className==='overlay')closeModal()})
bootstrap();
</script></body></html>`

function log(msg) {
  console.log(`[dsh-profiles] ${msg}`)
}

async function readStore() {
  try {
    const raw = JSON.parse(await readFile(PROFILES_FILE, 'utf8'))
    return { profiles: Array.isArray(raw.profiles) ? raw.profiles : [], active: raw.active ?? null }
  } catch { return { profiles: [], active: null } }
}

async function writeStore(store) {
  await mkdir(join(homedir(), '.dsh', 'profiles'), { recursive: true })
  await writeFile(PROFILES_FILE, JSON.stringify(store, null, 2), 'utf8')
}

async function getActive() {
  const s = await readStore()
  return s.profiles.find((p) => p.id === s.active) ?? null
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolveP, rejectP) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > 256 * 1024) { rejectP(new Error('payload too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { rejectP(new Error('invalid JSON')) } })
    req.on('error', rejectP)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host ?? '') } catch { return false }
}

// Plugin ids the profile can toggle. Kept as the source of truth for the
// create/edit modal so a profile only ever offers real tabs.
// Cada entrada é o `id` exato passado a `betterSidebar.registerTab`:
// `__profileTabEnabled` compara por igualdade, então um curinga nunca casa.
export const KNOWN_PLUGINS = [
  'dsh-skill-manager:skills',
  'dsh-mds:artifacts',
  'dsh-prototype:view',
  'dsh-openviking:memory',
  'dsh-ssh-tunnel',
  'dsh-docs-panel:docs',
  'dsh-flowglass:flow',
  'dsh-sidebar-qa:ask',
  'dsh-sidebar-qa:history',
]

// First-run seed: "Profile Epic" — todos os plugins, todas as skills (as
// skills já são todas visíveis via skill-manager; o epic as herda). Só roda
// quando ainda não existe nenhum perfil, para o usuário nunca começar vazio.
async function seedProfileEpic(store) {
  if (store.profiles.length > 0) return store
  const epic = {
    id: 'epic',
    label: 'Profile Epic',
    preset: 'default',
    plugins: [...KNOWN_PLUGINS],
    skills: [],
    createdAt: new Date().toISOString(),
  }
  store.profiles.push(epic)
  await writeStore(store)
  log('first run: criado "Profile Epic" com todos os plugins')
  return store
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    log('webServer indisponível — perfil inativo')
    return
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = url.pathname.slice('/profiles/api/'.length) || ''
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload = {}
    try { payload = await readBody(req) } catch (e) { return json(res, 400, { ok: false, error: e.message }) }
    try {
      switch (method) {
        case 'bootstrap': {
          const store = await seedProfileEpic(await readStore())
          const active = store.profiles.find((p) => p.id === store.active) ?? null
          return json(res, 200, { ok: true, active, profiles: store.profiles, plugins: KNOWN_PLUGINS, availableSkills: await listSkills() })
        }
        case 'list': {
          const store = await readStore()
          return json(res, 200, { ok: true, profiles: store.profiles, active: store.active, availableSkills: await listSkills() })
        }
        case 'create': {
          const id = String(payload.id ?? '').trim().toLowerCase()
          const label = String(payload.label ?? '').trim()
          if (!NAME_RE.test(id)) return json(res, 400, { ok: false, error: `id inválido "${id}" (minúsculas, 1-32 chars)` })
          if (!label) return json(res, 400, { ok: false, error: 'label obrigatório' })
          const store = await readStore()
          if (store.profiles.some((p) => p.id === id)) return json(res, 409, { ok: false, error: 'já existe' })
          const profile = {
            id,
            label,
            preset: String(payload.preset ?? 'default'),
            plugins: Array.isArray(payload.plugins) ? payload.plugins.map(String) : [],
            skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [],
            createdAt: new Date().toISOString(),
          }
          store.profiles.push(profile)
          await writeStore(store)
          log(`criado perfil "${id}"`)
          return json(res, 200, { ok: true, profile })
        }
        case 'update': {
          const id = String(payload.id ?? '')
          const store = await readStore()
          const p = store.profiles.find((x) => x.id === id)
          if (!p) return json(res, 404, { ok: false, error: 'não encontrado' })
          if (payload.label !== undefined) p.label = String(payload.label)
          if (payload.preset !== undefined) p.preset = String(payload.preset)
          if (payload.plugins !== undefined) p.plugins = Array.isArray(payload.plugins) ? payload.plugins.map(String) : []
          if (payload.skills !== undefined) p.skills = Array.isArray(payload.skills) ? payload.skills.map(String) : []
          await writeStore(store)
          return json(res, 200, { ok: true, profile: p })
        }
        case 'delete': {
          const id = String(payload.id ?? '')
          const store = await readStore()
          const before = store.profiles.length
          store.profiles = store.profiles.filter((p) => p.id !== id)
          if (store.active === id) store.active = null
          await writeStore(store)
          return json(res, 200, { ok: true, deleted: store.profiles.length < before })
        }
        case 'setActive': {
          const id = payload.active === null ? null : String(payload.active ?? '')
          const store = await readStore()
          if (id !== null && !store.profiles.some((p) => p.id === id)) return json(res, 404, { ok: false, error: 'perfil não encontrado' })
          store.active = id
          await writeStore(store)
          log(`perfil ativo: ${id ?? '(nenhum)'}`)
          return json(res, 200, { ok: true, active: id })
        }
        case 'logout': {
          const store = await readStore()
          store.active = null
          await writeStore(store)
          log('logout')
          return json(res, 200, { ok: true })
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (e) {
      return json(res, 400, { ok: false, error: String((e && e.message) || e) })
    }
  }

  // Tela inicial REAL: página standalone servida em /profiles, antes de
  // carregar o app. O cliente redireciona pra cá quando não há perfil ativo.
  const splashHandler = async (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(SPLASH_HTML)
  }

  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/profiles/api', handler }), 'dsh-profiles: api')
  // /profiles (splash) vence apenas quando /profiles/api não casa (prefixo mais
  // longo ganha), então o JSON segue intacto.
  ctx.effect(() => webServer.register({ kind: 'prefix', path: '/profiles', handler: splashHandler }), 'dsh-profiles: splash')
  log('loaded')
}
