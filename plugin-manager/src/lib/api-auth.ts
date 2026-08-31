import "server-only";
import { NextResponse } from "next/server";
import { type SessionPayload, decodeApiTokenClaims } from "@/lib/session";
import { isApiTokenRevoked } from "@/lib/token-revocation";

export type ApiAuthResult =
  | {
      ok: true;
      session: SessionPayload;
      /** Identidade do token em si — o que o logout precisa para revogá-lo. */
      token: { jti: string; expiresAt: Date };
    }
  | { ok: false; response: NextResponse };

function unauthorized(message: string) {
  return NextResponse.json(
    { error: message },
    {
      status: 401,
      // Informa ao cliente o esquema esperado, conforme a RFC 6750.
      headers: { "WWW-Authenticate": 'Bearer realm="api"' },
    },
  );
}

/**
 * Lê e valida o header `Authorization: Bearer <token>`.
 *
 * Uso numa route handler:
 *   const auth = await authenticateRequest(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.session está disponível daqui pra frente
 */
export async function authenticateRequest(
  request: Request,
): Promise<ApiAuthResult> {
  const header = request.headers.get("authorization");

  if (!header) {
    return { ok: false, response: unauthorized("Token não informado.") };
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return {
      ok: false,
      response: unauthorized("Formato esperado: Authorization: Bearer <token>."),
    };
  }

  const claims = await decodeApiTokenClaims(token);

  if (!claims) {
    return { ok: false, response: unauthorized("Token inválido ou expirado.") };
  }

  if (!claims.jti) {
    // Token emitido antes da revogação existir: sem `jti` não há como fazer
    // logout dele, então não é aceito.
    return {
      ok: false,
      response: unauthorized("Token em formato antigo. Gere um novo."),
    };
  }

  if (await isApiTokenRevoked(claims.jti)) {
    return { ok: false, response: unauthorized("Token revogado.") };
  }

  return {
    ok: true,
    session: claims.session,
    token: { jti: claims.jti, expiresAt: claims.expiresAt },
  };
}

/** Barra quem não é admin. Use depois de `authenticateRequest`. */
export function requireApiAdmin(session: SessionPayload) {
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Requer papel de administrador." },
      { status: 403 },
    );
  }

  return null;
}
