"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/credentials";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email.trim() || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const session = await verifyCredentials(email, password);

  if (!session) {
    // Mensagem genérica de propósito: não revela se o e-mail existe.
    return { error: "E-mail ou senha inválidos." };
  }

  await createSessionCookie(session);

  redirect("/dashboard");
}

export async function logout() {
  await destroySessionCookie();
  redirect("/login");
}
