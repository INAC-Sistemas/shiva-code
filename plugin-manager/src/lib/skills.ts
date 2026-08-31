// Constantes e tipos compartilhados entre o formulário (cliente) e as actions.
// Não pode viver no arquivo "use server": lá só é permitido exportar funções async.

/**
 * Nome de skill: kebab-case, a mesma regra que o registry de skills do `dsh`
 * impõe (`isSkillName`). Um nome fora dela é inendereçável pelo modelo, então é
 * recusado no cadastro em vez de virar uma linha que ninguém consegue carregar.
 */
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Texto do erro de nome, repetido no cliente e no servidor. */
export const SKILL_NAME_HINT =
  "Use apenas minúsculas, números e hífen — por exemplo, 03-prototype.";

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
