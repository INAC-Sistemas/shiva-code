"use server";

import { requireSession } from "@/lib/auth";
import { API_TOKEN_MAX_AGE_SECONDS, encodeApiToken } from "@/lib/session";
import type { ApiTokenState } from "@/lib/api-token";

/**
 * Emite um token de API para o usuário logado — o equivalente de
 * `POST /api/auth/login`, só que autenticando pelo cookie de sessão em vez de
 * pedir a senha de novo.
 *
 * O token carrega o papel de quem gerou, então um guest não consegue emitir um
 * token de admin: as rotas continuam checando `session.role`.
 */
export async function generateApiToken(): Promise<ApiTokenState> {
  // Checagem no servidor: a página só é renderizada para quem tem sessão, mas
  // uma action é um endpoint POST público — a validação precisa estar aqui.
  const session = await requireSession();

  try {
    return {
      token: await encodeApiToken(session),
      expiresIn: API_TOKEN_MAX_AGE_SECONDS,
      issuedAt: Date.now(),
      error: null,
    };
  } catch (error) {
    console.error("Falha ao gerar token de API:", error);

    return {
      token: null,
      expiresIn: 0,
      issuedAt: null,
      error: "Não foi possível gerar o token. Tente novamente.",
    };
  }
}
