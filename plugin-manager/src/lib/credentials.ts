import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";

// Hash descartável, usado para gastar tempo parecido com o de um usuário real
// quando o e-mail não existe. Dificulta enumerar contas por timing.
const DUMMY_HASH = "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";

/**
 * Valida e-mail + senha. Devolve os dados da sessão ou `null`.
 * Usado tanto pelo login web quanto pelo login da API.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
