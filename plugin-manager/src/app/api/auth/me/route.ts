import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Serve para o cliente conferir se o token ainda é válido.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  return NextResponse.json({
    user: {
      id: auth.session.userId,
      name: auth.session.name,
      email: auth.session.email,
      role: auth.session.role,
    },
  });
}
