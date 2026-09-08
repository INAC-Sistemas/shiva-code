// Constantes e tipos compartilhados entre o formulário (cliente), as actions e o
// módulo puro do plugin. Não pode viver no arquivo "use server": lá só é
// permitido exportar funções async.

/**
 * Plugins que a release do cliente traz.
 *
 * Lista no código, e não tabela no banco: a VPS não instala plugin nenhum — o
 * conjunto é propriedade do build do `dsh`/desktop —, então uma tabela só
 * poderia espelhar esta constante e adicionaria uma classe inteira de bugs de
 * "linha do catálogo divergiu do que o cliente tem". É a mesma escolha do
 * `KNOWN_OPS` em `plugins/prototype/index.ts`.
 *
 * `plane` diz o que desabilitar o plugin custa no cliente:
 * - `agent` — a linha vive no preset do agente; entra e sai sem reiniciar nada.
 * - `host` — a linha vive na composição do processo; trocar exige reiniciar o
 *   app, porque um plugin de host só deixa de carregar se sumir do boot.
 */
export const KNOWN_PLUGINS = [
  {
    id: "dsh-skill-library",
    label: "Biblioteca de skills",
    hint: "Publica as skills selecionadas neste perfil para o modelo.",
    plane: "agent",
  },
  {
    id: "dsh-vps-status",
    label: "Status da VPS",
    hint: "Ferramenta que lê disco e memória do servidor.",
    plane: "agent",
  },
  {
    id: "dsh-mds",
    label: "MDS (markdown)",
    hint: "Aba de documentos markdown do workspace.",
    plane: "host",
  },
  {
    id: "dsh-prototype",
    label: "Protótipo",
    hint: "Aba que renderiza a pasta prototype/ e deixa o agente dirigi-la.",
    plane: "host",
  },
  {
    id: "dsh-docs-panel",
    label: "Docs",
    hint: "Aba de leitura da documentação.",
    plane: "host",
  },
  {
    id: "dsh-skill-manager",
    label: "Gerenciador de skills",
    hint: "Aba para criar e editar as skills locais da máquina.",
    plane: "host",
  },
  {
    id: "dsh-openviking",
    label: "Memória",
    hint: "Servidor de memória em Python, com ferramentas MCP para o modelo.",
    plane: "host",
  },
  {
    id: "dsh-flowglass",
    label: "Flow",
    hint: "Aba de visualização de fluxo da sessão.",
    plane: "host",
  },
  {
    id: "dsh-sidebar-qa",
    label: "Perguntar",
    hint: "Painel de pergunta sobre a seleção, com sub-sessão própria.",
    plane: "host",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  hint: string;
  plane: "agent" | "host";
}[];

/** Os ids de {@link KNOWN_PLUGINS}, para validar o que veio do formulário ou do banco. */
export const KNOWN_PLUGIN_IDS: ReadonlySet<string> = new Set(
  KNOWN_PLUGINS.map((plugin) => plugin.id),
);

/**
 * Plugins do perfil "Padrão" criado pelo seed e pelo backfill da migration.
 *
 * Conservador de propósito: o padrão é o que um usuário recebe sem nunca ter
 * aberto o painel, então habilita o que a aplicação precisa para ser útil e
 * deixa o resto como escolha explícita.
 */
export const DEFAULT_PROFILE_PLUGINS: readonly string[] = [
  "dsh-skill-library",
  "dsh-vps-status",
  "dsh-mds",
  "dsh-prototype",
];

/** Nome do perfil que o seed e o backfill criam. */
export const DEFAULT_PROFILE_NAME = "Padrão";

/** Teto do nome: é o rótulo do seletor de perfil na casca, não um título. */
export const MAX_PROFILE_NAME_LENGTH = 60;

/** Teto da descrição, exibida como subtítulo no seletor. */
export const MAX_PROFILE_DESCRIPTION_LENGTH = 200;

/** Campos do formulário que podem receber erro individual. */
export type ProfileFieldErrors = Partial<
  Record<"name" | "description" | "plugins" | "skills", string>
>;

/** Estado devolvido pelas actions de criação e edição para o `useActionState`. */
export type ProfileFormState = {
  /** Incrementado a cada gravação bem-sucedida, para o form saber quando limpar. */
  savedCount: number;
  error: string | null;
  fieldErrors: ProfileFieldErrors;
};

/** Estado inicial das duas actions de formulário. */
export const initialProfileFormState: ProfileFormState = {
  savedCount: 0,
  error: null,
  fieldErrors: {},
};
