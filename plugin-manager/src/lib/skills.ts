// Constantes e tipos compartilhados entre o formulário (cliente) e as actions.
// Não pode viver no arquivo "use server": lá só é permitido exportar funções async.

/**
 * Nome de skill: kebab-case, a mesma regra que o registry de skills do `dsh`
 * impõe (`isSkillName`). Um nome fora dela é inendereçável pelo modelo, então é
 * recusado no cadastro em vez de virar uma linha que ninguém consegue carregar.
 */
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Papéis de agente que uma skill pode servir. Cada papel é um preset do `dsh`
 * (`team`, `team-backend`, `team-frontend`, `team-tester`) cuja linha
 * `skill-library` declara o papel; o servidor serve a esse agente só as skills
 * do perfil marcadas com ele.
 */
export const KNOWN_AGENT_ROLES = ["pm", "backend", "frontend", "tester"] as const;

/** Um papel de {@link KNOWN_AGENT_ROLES}. */
export type AgentRole = (typeof KNOWN_AGENT_ROLES)[number];

/**
 * Se um valor é um papel conhecido.
 * @param value - valor vindo de wire, formulário ou frontmatter.
 * @returns verdadeiro quando é um de {@link KNOWN_AGENT_ROLES}.
 */
export function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && (KNOWN_AGENT_ROLES as readonly string[]).includes(value);
}

/** Texto do erro de nome, repetido no cliente e no servidor. */
export const SKILL_NAME_HINT =
  "Use apenas minúsculas, números e hífen — por exemplo, 01-arquitetura.";

/**
 * Teto do corpo de uma skill. O corpo inteiro entra no contexto do modelo
 * quando a skill é carregada, então um valor muito acima disto é quase sempre
 * um arquivo colado por engano, não uma instrução.
 */
export const MAX_CONTENT_BYTES = 256 * 1024;

/** Teto da descrição: é o que o catálogo do modelo mostra, uma linha por skill. */
export const MAX_DESCRIPTION_LENGTH = 500;

/** Campos do formulário que podem receber erro individual. */
export type SkillFieldErrors = Partial<
  Record<"name" | "description" | "whenToUse" | "content" | "source", string>
>;

/** Estado devolvido pelas actions de criação e edição para o `useActionState`. */
export type SkillFormState = {
  /** Incrementado a cada gravação bem-sucedida, para o form saber quando limpar. */
  savedCount: number;
  error: string | null;
  fieldErrors: SkillFieldErrors;
};

/** Estado inicial das duas actions de formulário. */
export const initialSkillFormState: SkillFormState = {
  savedCount: 0,
  error: null,
  fieldErrors: {},
};
