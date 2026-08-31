// Tipos compartilhados entre o gerador (cliente) e a action.
// Não pode viver no arquivo "use server": lá só é permitido exportar funções async.

export type ApiTokenState = {
  token: string | null;
  /** Validade do token em segundos, ecoada pela action para o cliente exibir. */
  expiresIn: number;
  /** Epoch em ms de quando o token foi emitido — usado para mostrar a expiração. */
  issuedAt: number | null;
  error: string | null;
};

export const initialApiTokenState: ApiTokenState = {
  token: null,
  expiresIn: 0,
  issuedAt: null,
  error: null,
};
