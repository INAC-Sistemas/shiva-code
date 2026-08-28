"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mensagem genérica de propósito: não revela se o e-mail existe.
  const invalid = { error: "E-mail ou senha inválidos." };

  if (!user) {
    // Hash descartável para manter o tempo de resposta parecido com o caso
    // em que o usuário existe, dificultando enumeração por timing.
    await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinva");
    return invalid;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return invalid;
  }

  await createSessionCookie({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logout() {
  await destroySessionCookie();
  redirect("/login");
}
