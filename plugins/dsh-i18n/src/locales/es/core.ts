/** Spanish: the panel's shared vocabulary and its smaller surfaces. */

import type { LocaleBundle } from '../types.ts'

export const core = {
  command: {
    'search.placeholder': 'Buscar…',
    'search.aria': 'Filtrar opciones',
    'status.loading': 'Cargando opciones…',
    'status.applying': 'Aplicando…',
    'status.empty': 'Sin opciones',
    'overlay.aria': 'opciones de /{command}',
    'listbox.aria': 'coincidencias de /{command}',
    'notice.imagesUnsupported': '/{command} no acepta imágenes adjuntas; quítalas primero',
  },

  common: {
    ok: 'Aceptar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    copy: 'Copiar',
    copied: 'Copiado',
    retry: 'Reintentar',
    loading: 'Cargando…',
    'load.failed': 'Error al cargar',
    submit: 'Enviar',
    submitting: 'Enviando…',
    next: 'Siguiente',
    previous: 'Anterior',
    skip: 'Omitir',
    delete: 'Eliminar',
    edit: 'Editar',
    save: 'Guardar',
    search: 'Buscar',
    more: 'Más',
    collapse: 'Contraer',
    expand: 'Expandir',
    back: 'Atrás',
    unknown: 'Desconocido',
    none: 'Ninguno',
    truncated: 'Truncado',
  },

  deliverables: {
    'produced.label': 'Producidos',
    'produced.moreOne': '+ 1 archivo',
    'produced.more': '+ {count} archivos',
    'produced.open': 'Abrir {name}',
    'produced.showInFolder': 'Mostrar en la carpeta',
  },

  feedback: {
    'action.like': 'Buena respuesta',
    'action.likeActive': 'Quitar valoración',
    'action.dislike': 'Mala respuesta',
    'action.dislikeActive': 'Quitar valoración',
    'note.open': 'Añadir una nota',
    'note.dialog': 'Comentarios',
    'note.placeholder': '¿Qué estuvo bien, o qué salió mal? (opcional)',
    'note.save': 'Guardar',
    'note.cancel': 'Cancelar',
    'note.aria': 'Nota de comentarios',
    'error.conflict': 'Estos comentarios cambiaron en otro sitio; se muestra el estado más reciente',
    'error.load': 'No se pudieron cargar los comentarios',
    'error.generic': 'No se pudieron guardar los comentarios',
  },

  goal: {
    'phase.active': 'Objetivo en curso',
    'phase.paused': 'Objetivo pausado',
    'phase.blocked': 'Objetivo bloqueado',
    'objective.aria': 'Objetivo',
    'commandInput.aria': 'Entrada de comando',
    'action.save': 'Guardar objetivo',
    'action.cancel': 'Cancelar edición',
    'action.pause': 'Pausar objetivo',
    'action.resume': 'Reanudar objetivo',
    'action.edit': 'Editar objetivo',
    'action.clear': 'Borrar objetivo',
  },

  'permission.access': {
    'confirm.title': '¿Activar acceso total?',
    'confirm.description': 'El acceso total reduce los pasos de confirmación y permite al agente realizar más acciones directamente, incluidas operaciones sensibles, cambios en archivos y comandos externos. Úsalo solo cuando confíes en la tarea actual.',
    'confirm.acknowledge': 'Entiendo los riesgos y quiero continuar',
    'confirm.cancel': 'Cancelar',
    'confirm.enable': 'Activar acceso total',
  },

  plan: {
    'chip.on.aria': 'Modo de planificación activado, pulsa para desactivarlo',
    'chip.on.title': 'Modo de planificación activado — haz clic para desactivarlo (/plan off)',
    'chip.off.aria': 'Modo de planificación desactivado, pulsa para activarlo',
    'chip.off.title': 'Modo de planificación desactivado — haz clic para activarlo (/plan)',
  },

  reference: {
    'section.files': 'Archivos y carpetas',
    'section.sessions': 'Conversaciones de sesión',
    'candidate.file': 'Archivo',
    'candidate.folder': 'Carpeta',
    'candidate.session': 'Sesión',
    'candidate.noCwd': '(sin directorio de trabajo)',
  },

  'session-log-download': {
    'dialog.preparingTitle': 'Exportando la sesión',
    'dialog.preparingDescription': 'Preparando un ZIP con esta sesión, sus subsesiones y los adjuntos.',
    'dialog.successTitle': 'Descarga de la sesión iniciada',
    'dialog.successDescription': 'El navegador está descargando el ZIP de la sesión.',
    'dialog.errorTitle': 'Error al exportar la sesión',
    'dialog.close': 'Cerrar',
    'dialog.commandFailed': 'No se pudo iniciar la exportación de la sesión.',
  },

  sidebar: {
    'session.new': 'Nueva sesión',
    'session.new.label': 'Nueva sesión',
    'toggle.open': 'Abrir barra lateral',
    'toggle.collapse': 'Contraer barra lateral',
  },

  skill: {
    'row.running': 'Cargando skill',
    'row.failed': 'Error al cargar la skill',
    'row.stopped': 'Carga de la skill detenida',
    'row.instructions': 'Instrucciones',
    'menu.userOnly': 'solo del usuario',
  },

  'slash.menu': {
    command: 'Comandos',
    skill: 'Skills',
    subagent: 'Subagentes',
    loading: 'Cargando…',
    'suggestions.aria': 'Sugerencias del activador',
  },
} satisfies LocaleBundle
