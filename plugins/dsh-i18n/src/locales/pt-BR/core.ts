/** Brazilian Portuguese: the panel's shared vocabulary and its smaller surfaces. */

import type { LocaleBundle } from '../types.ts'

export const core = {
  command: {
    'search.placeholder': 'Buscar…',
    'search.aria': 'Filtrar opções',
    'status.loading': 'Carregando opções…',
    'status.applying': 'Aplicando…',
    'status.empty': 'Nenhuma opção',
    'overlay.aria': 'opções de /{command}',
    'listbox.aria': 'resultados de /{command}',
    'notice.imagesUnsupported': '/{command} não aceita imagens anexadas; remova-as antes',
  },

  common: {
    ok: 'OK',
    cancel: 'Cancelar',
    close: 'Fechar',
    copy: 'Copiar',
    copied: 'Copiado',
    retry: 'Tentar de novo',
    loading: 'Carregando…',
    'load.failed': 'Falha ao carregar',
    submit: 'Enviar',
    submitting: 'Enviando…',
    next: 'Próximo',
    previous: 'Anterior',
    skip: 'Pular',
    delete: 'Excluir',
    edit: 'Editar',
    save: 'Salvar',
    search: 'Buscar',
    more: 'Mais',
    collapse: 'Recolher',
    expand: 'Expandir',
    back: 'Voltar',
    unknown: 'Desconhecido',
    none: 'Nenhum',
    truncated: 'Truncado',
  },

  deliverables: {
    'produced.label': 'Produzidos',
    'produced.moreOne': '+ 1 arquivo',
    'produced.more': '+ {count} arquivos',
    'produced.open': 'Abrir {name}',
    'produced.showInFolder': 'Mostrar na pasta',
  },

  feedback: {
    'action.like': 'Boa resposta',
    'action.likeActive': 'Remover avaliação',
    'action.dislike': 'Resposta ruim',
    'action.dislikeActive': 'Remover avaliação',
    'note.open': 'Adicionar observação',
    'note.dialog': 'Feedback',
    'note.placeholder': 'O que foi bom, ou o que deu errado? (opcional)',
    'note.save': 'Salvar',
    'note.cancel': 'Cancelar',
    'note.aria': 'Observação de feedback',
    'error.conflict': 'Este feedback mudou em outro lugar; o estado mais recente está sendo mostrado',
    'error.load': 'Não foi possível carregar o feedback',
    'error.generic': 'Não foi possível salvar o feedback',
  },

  goal: {
    'phase.active': 'Objetivo em andamento',
    'phase.paused': 'Objetivo pausado',
    'phase.blocked': 'Objetivo bloqueado',
    'objective.aria': 'Objetivo',
    'commandInput.aria': 'Entrada de comando',
    'action.save': 'Salvar objetivo',
    'action.cancel': 'Cancelar edição',
    'action.pause': 'Pausar objetivo',
    'action.resume': 'Retomar objetivo',
    'action.edit': 'Editar objetivo',
    'action.clear': 'Limpar objetivo',
  },

  'permission.access': {
    'confirm.title': 'Ativar acesso total?',
    'confirm.description': 'O acesso total reduz as etapas de confirmação e deixa o agente executar mais ações diretamente, inclusive operações sensíveis, alterações em arquivos e comandos externos. Use apenas quando confiar na tarefa atual.',
    'confirm.acknowledge': 'Entendo os riscos e quero continuar',
    'confirm.cancel': 'Cancelar',
    'confirm.enable': 'Ativar acesso total',
  },

  plan: {
    'chip.on.aria': 'Modo de planejamento ligado, pressione para desligar',
    'chip.on.title': 'Modo de planejamento ligado — clique para desligar (/plan off)',
    'chip.off.aria': 'Modo de planejamento desligado, pressione para ligar',
    'chip.off.title': 'Modo de planejamento desligado — clique para ligar (/plan)',
  },

  reference: {
    'section.files': 'Arquivos e pastas',
    'section.sessions': 'Conversas de sessão',
    'candidate.file': 'Arquivo',
    'candidate.folder': 'Pasta',
    'candidate.session': 'Sessão',
    'candidate.noCwd': '(sem diretório de trabalho)',
  },

  'session-log-download': {
    'dialog.preparingTitle': 'Exportando a sessão',
    'dialog.preparingDescription': 'Preparando um ZIP com esta sessão, as subsessões e os anexos.',
    'dialog.successTitle': 'Download da sessão iniciado',
    'dialog.successDescription': 'O navegador está baixando o ZIP da sessão.',
    'dialog.errorTitle': 'Falha ao exportar a sessão',
    'dialog.close': 'Fechar',
    'dialog.commandFailed': 'Não foi possível iniciar a exportação da sessão.',
  },

  sidebar: {
    'session.new': 'Nova sessão',
    'session.new.label': 'Nova sessão',
    'toggle.open': 'Abrir barra lateral',
    'toggle.collapse': 'Recolher barra lateral',
  },

  skill: {
    'row.running': 'Carregando skill',
    'row.failed': 'Falha ao carregar a skill',
    'row.stopped': 'Carregamento da skill interrompido',
    'row.instructions': 'Instruções',
    'menu.userOnly': 'só do usuário',
  },

  'slash.menu': {
    command: 'Comandos',
    skill: 'Skills',
    subagent: 'Subagentes',
    loading: 'Carregando…',
    'suggestions.aria': 'Sugestões do gatilho',
  },
} satisfies LocaleBundle
