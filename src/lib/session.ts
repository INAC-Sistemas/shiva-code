import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

// Este módulo é propositalmente edge-safe (só usa `jose`), para poder ser
// importado tanto pelo proxy quanto pelo runtime Node.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias
export const API_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

/**
 * Tokens de sessão (cookie do navegador) e tokens de API são assinados com o
 * mesmo segredo, então a claim `typ` é o que impede usar um no lugar do outro.
 */
export type TokenType = "session" | "api";

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

type TokenClaims = SessionPayload & { typ: TokenType };

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET não está definida");
  }

  return new TextEncoder().encode(secret);
}

export async function encodeToken(
  payload: SessionPayload,
  type: TokenType,
  maxAgeSeconds: number,
) {
  return new SignJWT({ ...payload, typ: type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecret());
}

export async function decodeToken(
  token: string | undefined,
  expectedType: TokenType,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<TokenClaims>(token, getSecret());

    if (payload.typ !== expectedType) {
      return null;
    }

    return {
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // token inválido, expirado ou assinado com outro segredo
    return null;
  }
}

export function encodeSession(payload: SessionPayload) {
  return encodeToken(payload, "session", SESSION_MAX_AGE_SECONDS);
}

export function decodeSession(token: string | undefined) {
  return decodeToken(token, "session");
}

export function encodeApiToken(payload: SessionPayload) {
  return encodeToken(payload, "api", API_TOKEN_MAX_AGE_SECONDS);
}

export function decodeApiToken(token: string | undefined) {
  return decodeToken(token, "api");
}
