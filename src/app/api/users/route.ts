import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

/**
 * GET /api/users
 * Header: Authorization: Bearer <token>
 *
 * Mesma regra da tela: admin lista todos, guest só a si mesmo.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  const { session } = auth;
  const isAdmin = session.role === "ADMIN";

  const users = await prisma.user.findMany({
    where: isAdmin ? undefined : { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ users });
}
