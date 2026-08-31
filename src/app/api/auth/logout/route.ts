import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { revokeApiToken } from "@/lib/token-revocation";

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 *
 * Revoga o token usado na própria requisição: a partir daqui ele é recusado
 * pelas rotas da API, mesmo antes de expirar. Não mexe no cookie de sessão do
 * navegador — esse é o botão "Sair" do dashboard.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  await revokeApiToken({
    jti: auth.token.jti,
    userId: auth.session.userId,
    expiresAt: auth.token.expiresAt,
  });

  return NextResponse.json({ revoked: true });
}
