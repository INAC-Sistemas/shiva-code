"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import {
  MIN_PASSWORD_LENGTH,
  type CreateUserFieldErrors,
  type CreateUserState,
} from "@/lib/users";

function isRole(value: string): value is Role {
  return value === Role.ADMIN || value === Role.GUEST;
}

export async function createUser(
  prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await requireSession();

  // Checagem no servidor: esconder o formulário no cliente não é controle de acesso.
  if (session.role !== Role.ADMIN) {
    return {
      ...prevState,
      error: "Apenas administradores podem criar usuários.",
      fieldErrors: {},
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  const fieldErrors: CreateUserFieldErrors = {};

  if (!name) {
    fieldErrors.name = "Informe o nome.";
  }

  if (!email) {
    fieldErrors.email = "Informe o e-mail.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "E-mail inválido.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (!isRole(role)) {
    fieldErrors.role = "Selecione um papel válido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ...prevState, error: null, fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return {
      ...prevState,
      error: null,
      fieldErrors: { email: "Já existe um usuário com este e-mail." },
    };
  }

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: role as Role,
      },
    });
  } catch (error) {
    // Corrida entre a checagem acima e o insert: o índice único é a garantia real.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ...prevState,
        error: null,
        fieldErrors: { email: "Já existe um usuário com este e-mail." },
      };
    }

    console.error("Falha ao criar usuário:", error);

    return {
      ...prevState,
      error: "Não foi possível criar o usuário. Tente novamente.",
      fieldErrors: {},
    };
  }

  revalidatePath("/dashboard");

  return {
    createdCount: prevState.createdCount + 1,
    error: null,
    fieldErrors: {},
  };
}
