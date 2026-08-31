// Constantes e tipos compartilhados entre o formulário (cliente) e a action.
// Não pode viver no arquivo "use server": lá só é permitido exportar funções async.

export const MIN_PASSWORD_LENGTH = 8;

export type CreateUserFieldErrors = Partial<
  Record<"name" | "email" | "password" | "role", string>
>;

export type CreateUserState = {
  /** Incrementado a cada criação bem-sucedida, para o form saber quando limpar. */
  createdCount: number;
  error: string | null;
  fieldErrors: CreateUserFieldErrors;
};

export const initialCreateUserState: CreateUserState = {
  createdCount: 0,
  error: null,
  fieldErrors: {},
};
