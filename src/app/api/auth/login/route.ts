import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import { API_TOKEN_MAX_AGE_SECONDS, encodeApiToken } from "@/lib/session";

/**
 * POST /api/auth/login
 * Body: { "email": "...", "password": "..." }
 * 200:  { token, tokenType, expiresIn, user }
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição deve ser JSON válido." },
      { status: 400 },
    );
  }

  const { email, password } =
    (body as { email?: unknown; password?: unknown }) ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Campos obrigatórios: email e password (strings)." },
      { status: 400 },
    );
  }

  const session = await verifyCredentials(email, password);

  if (!session) {
    // Mensagem genérica de propósito: não revela se o e-mail existe.
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    token: await encodeApiToken(session),
    tokenType: "Bearer",
    expiresIn: API_TOKEN_MAX_AGE_SECONDS,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
}
