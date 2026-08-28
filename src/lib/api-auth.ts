import "server-only";
import { NextResponse } from "next/server";
import { type SessionPayload, decodeApiToken } from "@/lib/session";

export type ApiAuthResult =
  | { ok: true; session: SessionPayload }
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

  const session = await decodeApiToken(token);

  if (!session) {
    return { ok: false, response: unauthorized("Token inválido ou expirado.") };
  }

  return { ok: true, session };
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
