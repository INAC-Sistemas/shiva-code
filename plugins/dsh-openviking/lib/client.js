window.__ModuleLoader__.load({ id: 'dsh-openviking', factory: (require) => {
  'use strict'
  var module = { exports: {} }
  var exports = module.exports
  const React = require('react')

// dsh-openviking client half: the Memory tab. States: installing (live log),
// unconfigured (one-screen wizard for the embedding/VLM providers), running
// (status bar + the OpenViking Web Studio framed over same-host :1933).

const TAB_ID = 'dsh-openviking:memory'
const STUDIO_URL = 'http://127.0.0.1:1933/studio'

function api(method, payload) {
  return fetch('/openviking/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }).then((r) => r.json())
}

const PROVIDERS = {
  openrouter: { label: 'OpenRouter (a chave que você já usa no dsh)', base: 'https://openrouter.ai/api/v1', hint: 'Uma chave, vários modelos de embedding (ex.: openai/text-embedding-3-small, qwen/qwen3-embedding-0.6b). VLM também pelo OpenRouter (ex.: google/gemini-2.0-flash).' },
  volcengine: { label: 'Volcengine (Doubao)', base: 'https://ark.cn-beijing.volces.com/api/v3', hint: 'Cota gratuita inicial; recomendo.' },
  openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', hint: 'text-embedding-3-small (1536) e gpt-4o-mini como VLM.' },
  ollama: { label: 'Ollama (local, grátis)', base: 'http://127.0.0.1:11434/v1', hint: 'Sem custo e sem rede — ex.: nomic-embed-text. Precisa do Ollama rodando.' },
  custom: { label: 'Custom (OpenAI-compatível)', base: '', hint: 'Qualquer endpoint compatível com a API OpenAI.' },
}

function injectStyles() {
  const id = 'ov-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `
.ov-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;font-family:inherit}
.ov-bar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,#3a3b44);flex:none;flex-wrap:wrap}
.ov-dot{width:9px;height:9px;border-radius:50%;flex:none}
.ov-dot.on{background:#22c55e}.ov-dot.mid{background:#eab308}.ov-dot.off{background:#ef4444}
.ov-ttl{font-weight:600}
.ov-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9aa5)}
.ov-spacer{flex:1}
.ov-btn{display:inline-flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-2,#31323b);color:var(--dsw-alias-label-primary,#e8e8ea);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}
.ov-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-bg-layer-2,#3a3b46))}
.ov-btn.primary{background:var(--dsw-alias-brand-primary,#2563eb);border-color:transparent;color:var(--dsw-alias-brand-primary-invert,#000);font-weight:600}
.ov-btn:disabled{opacity:.45;cursor:default}
.ov-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:26px;text-align:center;overflow-y:auto}
.ov-center h3{margin:0;font-size:15px}
.ov-center p{margin:0;font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary,#b6b6bf);max-width:420px}
.ov-log{width:100%;max-width:560px;flex:1;min-height:120px;overflow-y:auto;background:var(--dsw-alias-bg-layer-1,#1c1d22);border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:8px;padding:9px;font-size:11px;line-height:1.55;font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary,#c9c9d1);text-align:left;white-space:pre-wrap}
.ov-form{width:100%;max-width:460px;display:flex;flex-direction:column;gap:9px;text-align:left}
.ov-field{display:flex;flex-direction:column;gap:3px}
.ov-field label{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#9a9aa5)}
.ov-field input,.ov-field select{background:var(--dsw-alias-bg-layer-1,#26272e);color:inherit;border:1px solid var(--dsw-alias-border-l2,#4a4b55);border-radius:6px;padding:5px 8px;font-size:12.5px;outline:none;font-family:inherit}
.ov-note{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#7c7c88);line-height:1.5}
.ov-frame{flex:1;min-height:0;border:none;width:100%;background:#fff}
.ov-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2000;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:80vw}
.ov-toast.err{border-color:#7f1d1d;color:#fca5a5}
`
  document.head.appendChild(el)
}

function MemoryView() {
  const h = React.createElement
  const [st, setSt] = React.useState(null)
  const [models, setModels] = React.useState(null)
  const [form, setForm] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [toast, setToast] = React.useState(null)
  const toastTimer = React.useRef(null)

  const say = React.useCallback((msg, err) => {
    setToast({ msg, err })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), err ? 6000 : 2500)
  }, [])

  const refresh = React.useCallback(() => {
    api('status').then((r) => { if (r.ok) setSt(r) }).catch(() => {})
  }, [])

  React.useEffect(() => { refresh() }, [refresh])
  React.useEffect(() => {
    api('models').then((r) => { if (r.ok) setModels(r) }).catch(() => {})
  }, [])
  const slow = st?.phase === 'installing'
  React.useEffect(() => {
    const t = setInterval(refresh, slow ? 1200 : 6000)
    return () => clearInterval(t)
  }, [refresh, slow])

  const startInstall = async () => {
    setBusy(true)
    await api('install')
    setBusy(false)
    refresh()
  }

  const restart = async () => {
    setBusy(true)
    const r = await api('restart')
    setBusy(false)
    say(r.ok ? 'Server reiniciado' : (r.error || 'falhou'), !r.ok)
    refresh()
  }

  const saveConfig = async () => {
    setBusy(true)
    const r = await api('configure', {
      embedding: form.embedding.provider ? form.embedding : null,
      vlm: form.vlm?.api_base ? form.vlm : null,
    })
    setBusy(false)
    if (!r.ok) return say(r.error || 'falhou ao salvar', true)
    say('Configuração salva — server reiniciando')
    refresh()
  }

  const setEmb = (patch) => setForm({ ...form, embedding: { ...form.embedding, ...patch } })
  const setVlm = (patch) => setForm({ ...form, vlm: { ...form.vlm, ...patch } })

  const field = (key, label, value, onChange, type = 'text', placeholder = '') =>
    h('div', { className: 'ov-field', key },
      h('label', null, label),
      h('input', { type, value: value ?? '', onChange: (e) => onChange(e.target.value), placeholder }))

  if (!st) {
    return h('div', { className: 'ov-root' },
      h('div', { className: 'ov-center' }, h('p', null, 'Loading…')),
      toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  const dotClass = st.running ? 'on' : (st.phase === 'installing' || st.phase === 'error' ? 'mid' : 'off')

  // ── instalando ──
  if (st.phase === 'installing') {
    return h('div', { className: 'ov-root' },
      h('div', { className: 'ov-center' },
        h('h3', null, 'Instalando OpenViking…'),
        h('p', null, 'Isso acontece uma vez só: baixa o wheel (≈26 MB) e prepara tudo. As próximas aberturas do dsh sobem o viking junto, automaticamente.'),
        h('div', { className: 'ov-log' }, st.log.join('\n') || 'preparando…')),
      toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  // ── erro de instalação ──
  if (st.phase === 'error') {
    return h('div', { className: 'ov-root' },
      h('div', { className: 'ov-center' },
        h('h3', null, 'A instalação falhou'),
        h('div', { className: 'ov-log' }, st.log.join('\n')),
        h('button', { className: 'ov-btn primary', disabled: busy, onClick: startInstall }, 'Tentar novamente')),
      toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  // ── ainda não instalado (botão manual só aparece se o boot não instalou) ──
  if (!st.installed) {
    return h('div', { className: 'ov-root' },
      h('div', { className: 'ov-center' },
        h('h3', null, 'OpenViking — memória de longo prazo'),
        h('p', null, 'O contexto do seu agente como um banco de dados: memórias, recursos e skills em um filesystem semântico. Será instalado e iniciado junto com o dsh.'),
        h('button', { className: 'ov-btn primary', disabled: busy, onClick: startInstall }, busy ? 'Iniciando…' : 'Instalar agora'),
        h('div', { className: 'ov-log' }, st.log.join('\n'))),
      toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  // ── wizard de configuração (uma tela) ──
  if (!st.configured) {
    if (!form) {
      setForm({
        embedding: { provider: 'openrouter', api_base: PROVIDERS.openrouter.base, api_key: '', model: '', dimension: '' },
        vlm: { provider: '', api_base: PROVIDERS.openrouter.base, api_key: '', model: '' },
      })
      return h('div', { className: 'ov-root' }, h('div', { className: 'ov-center' }, h('p', null, 'Loading…')))
    }
    const ep = PROVIDERS[form.embedding.provider] ?? PROVIDERS.custom
    const isOpenRouter = form.embedding.provider === 'openrouter'
    const embList = isOpenRouter && models?.embedding ? models.embedding : []
    const visList = isOpenRouter && models?.vision ? models.vision : []
    const keyFromDsh = isOpenRouter && st?.openrouterKey
    const needKey = !isOpenRouter && form.embedding.provider !== 'ollama'
    // Se a lista do OpenRouter chegou e o modelo atual não está selecionado de
    // fato, escolhe o primeiro modelo de embedding disponível.
    React.useEffect(() => {
      if (embList.length && !embList.includes(form.embedding.model)) {
        setEmb({ model: embList[0] })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embList])
    return h('div', { className: 'ov-root' },
      h('div', { className: 'ov-center' },
        h('h3', null, 'Conectar a memória semântica'),
        h('p', null, 'O OpenViking precisa de um serviço de embeddings para indexar memórias.')),
      h('div', { style: { display: 'flex', justifyContent: 'center', paddingBottom: 24 } },
        h('div', { className: 'ov-form' },
          h('div', { className: 'ov-field' },
            h('label', null, 'Provedor de embeddings'),
            h('select', {
              value: form.embedding.provider,
              onChange: (e) => { const p = PROVIDERS[e.target.value]; setEmb({ provider: e.target.value, api_base: p.base }); if (p.base) setVlm({ ...form.vlm, api_base: p.base }) },
            },
              Object.entries(PROVIDERS).map(([k, v]) => h('option', { key: k, value: k }, v.label)))),
          h('p', { className: 'ov-note' }, ep.hint),
          field('eb', 'API base', form.embedding.api_base, (v) => setEmb({ api_base: v })),
          keyFromDsh
            ? h('p', { className: 'ov-note', style: { margin: 0, color: 'var(--dsw-alias-state-success-primary,#22c55e)' } },
              '✓ Chave OpenRouter importada do seu dsh — não precisa digitar.')
            : field('ek', 'API key', form.embedding.api_key, (v) => setEmb({ api_key: v }), 'password', form.embedding.provider === 'ollama' ? '(ollama não exige)' : 'sk-…'),
          h('div', { className: 'ov-field' },
            h('label', null, 'Modelo de embedding'),
            embList.length
              ? h('select', { value: form.embedding.model ?? '', onChange: (e) => setEmb({ model: e.target.value }) },
                  embList.map((m) => h('option', { key: m, value: m }, m)))
              : h('input', { type: 'text', value: form.embedding.model ?? '', onChange: (e) => setEmb({ model: e.target.value }), placeholder: 'openai/text-embedding-3-small' })),
          field('ed', 'Dimensão', form.embedding.dimension, (v) => setEmb({ dimension: v }), 'text', 'ex.: 1536 (text-embedding-3-small), 1024 (voyage-4) — se não souber, deixe como está'),
          h('details', { open: isOpenRouter },
            h('summary', { style: { fontSize: 11, cursor: 'pointer', color: 'var(--dsw-alias-label-secondary,#9a9aa5)' } }, 'VLM (opcional — para entender imagens/recursos visuais)'),
            h('div', { className: 'ov-form', style: { marginTop: 8 } },
              field('vb', 'API base', form.vlm.api_base, (v) => setVlm({ api_base: v })),
              isOpenRouter
                ? h('p', { className: 'ov-note', style: { margin: 0, color: 'var(--dsw-alias-state-success-primary,#22c55e)' } }, '✓ Chave do dsh — não precisa digitar.')
                : field('vk', 'API key', form.vlm.api_key, (v) => setVlm({ api_key: v }), 'password'),
              h('div', { className: 'ov-field' },
                h('label', null, 'Modelo de visão (deixe em branco se não quiser VLM)'),
                visList.length
                  ? h('select', { value: form.vlm.model ?? '', onChange: (e) => setVlm({ model: e.target.value }) },
                      h('option', { value: '' }, '— nenhum (opcional) —'),
                      visList.map((m) => h('option', { key: m, value: m }, m)))
                  : h('input', { type: 'text', value: form.vlm.model ?? '', onChange: (e) => setVlm({ model: e.target.value }), placeholder: 'google/gemini-2.0-flash' })))),
          h('button', { className: 'ov-btn primary', disabled: busy || (needKey && !form.embedding.api_key), onClick: saveConfig },
            busy ? 'Salvando…' : 'Salvar e conectar'),
          h('p', { className: 'ov-note' },
            'Privacidade: os dados ficam no seu computador; o texto das memórias é enviado ao provedor de embeddings escolhido para vetorização. Ollama mantém tudo local.')),
      ),
      toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
  }

  // ── rodando: barra de status + Studio ──
  return h('div', { className: 'ov-root' },
    h('div', { className: 'ov-bar' },
      h('span', { className: 'ov-dot ' + dotClass }),
      h('span', { className: 'ov-ttl' }, 'OpenViking'),
      h('span', { className: 'ov-sub' },
        st.running ? `${st.adopted ? 'adotado' : 'gerenciado pelo dsh'} · porta ${st.port}${st.studio ? ' · studio ok' : ''}` : 'iniciando…'),
      h('span', { className: 'ov-spacer' }),
      h('button', { className: 'ov-btn', disabled: busy, onClick: restart, title: 'Reiniciar o servidor OpenViking' }, '⟳ Reiniciar'),
      h('a', { className: 'ov-btn', href: STUDIO_URL, target: '_blank', rel: 'noreferrer' }, 'Abrir externo')),
    st.running
      ? h('iframe', { className: 'ov-frame', src: STUDIO_URL, title: 'OpenViking Studio' })
      : h('div', { className: 'ov-center' },
        h('p', null, 'O servidor não está respondendo.'),
        h('div', { className: 'ov-log' }, (st.spawnLog ?? []).join('\n')),
        h('button', { className: 'ov-btn primary', disabled: busy, onClick: restart }, 'Tentar novamente')),
    toast && h('div', { className: 'ov-toast' + (toast.err ? ' err' : '') }, toast.msg))
}

function MemoryIcon(size) {
  return React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('path', { d: 'M8 1.5c-2.5 0-4.5 1.7-4.5 3.8 0 1.2.6 2.2 1.5 2.9v1.3h6V8.2c.9-.7 1.5-1.7 1.5-2.9 0-2.1-2-3.8-4.5-3.8z' }),
    React.createElement('path', { d: 'M6 12.5h4M6.8 14.5h2.4' }),
  )
}

function apply(ctx) {
  injectStyles()
  ctx.plugin({
    inject: ['betterSidebar'],
    apply(sidebarCtx) {
      const betterSidebar = sidebarCtx.betterSidebar
      if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return
      ctx.effect(() => betterSidebar.registerTab({
        id: TAB_ID,
        title: 'Memory',
        order: 35,
        single: true,
        icon: (size) => MemoryIcon(size),
        component: (props) => React.createElement(MemoryView, props),
      }))
    },
  })
}

  exports.apply = apply
  return module.exports
} })
