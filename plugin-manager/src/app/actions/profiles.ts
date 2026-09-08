"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  KNOWN_PLUGIN_IDS,
  MAX_PROFILE_DESCRIPTION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  type ProfileFieldErrors,
  type ProfileFormState,
} from "@/lib/profiles";

const PROFILES_PATH = "/dashboard/profiles";

/** Campos de um perfil como saem do formulário, já normalizados. */
type ProfileInput = {
  name: string;
  description: string | null;
  plugins: string[];
  skillIds: string[];
};

/**
 * Lê os campos do formulário e valida cada um.
 *
 * `plugins` é conferido contra {@link KNOWN_PLUGIN_IDS} e um valor fora da lista
 * é erro RUIDOSO, não silencioso: o formulário só oferece esses ids, então um
 * valor diferente significa POST adulterado — vale dizer isso em vez de gravar
 * um nome que a casca ignoraria depois.
 * @param formData - corpo do formulário de criação ou edição.
 * @returns os campos normalizados, ou os erros por campo.
 */
function readProfileInput(
  formData: FormData,
):
  | { ok: true; input: ProfileInput }
  | { ok: false; fieldErrors: ProfileFieldErrors } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const plugins = [...new Set(formData.getAll("plugins").map(String))].sort();
  const skillIds = [...new Set(formData.getAll("skills").map(String))];

  const fieldErrors: ProfileFieldErrors = {};

  if (!name) {
    fieldErrors.name = "Informe o nome do perfil.";
  } else if (name.length > MAX_PROFILE_NAME_LENGTH) {
    fieldErrors.name = `O nome passa de ${MAX_PROFILE_NAME_LENGTH} caracteres.`;
  }

  if (description.length > MAX_PROFILE_DESCRIPTION_LENGTH) {
    fieldErrors.description = `A descrição passa de ${MAX_PROFILE_DESCRIPTION_LENGTH} caracteres.`;
  }

  const unknown = plugins.filter((id) => !KNOWN_PLUGIN_IDS.has(id));

  if (unknown.length > 0) {
    fieldErrors.plugins = `Plugin desconhecido: ${unknown.join(", ")}.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    input: {
      name,
      description: description === "" ? null : description,
      plugins,
      skillIds,
    },
  };
}

/**
 * Confere que toda skill selecionada ainda existe.
 *
 * NÃO exige `published`: um admin pode despublicar algo temporariamente e a
 * seleção deve sobreviver. Publicação é exigida na LEITURA, num lugar só
 * (`plugins/skill-library`), que é o que mantém "um perfil só estreita".
 * @param skillIds - ids vindos do formulário.
 * @returns `null` quando todos existem, ou a mensagem de erro.
 */
async function missingSkills(skillIds: string[]): Promise<string | null> {
  if (skillIds.length === 0) return null;

  const found = await prisma.librarySkill.count({
    where: { id: { in: skillIds } },
  });

  return found === skillIds.length
    ? null
    : "Uma das skills selecionadas não existe mais.";
}

/** Verdadeiro para a violação de índice único do Prisma. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/**
 * Cria um perfil para quem está logado.
 *
 * Não há guard de papel, ao contrário das actions de skill: um perfil é escopo
 * pessoal, e um perfil só ESTREITA o que a biblioteca publicada já concede —
 * então deixar cada usuário criar os próprios não concede nada. Sob a regra de
 * fechar-em-vazio, um guest que não pudesse criar um ficaria sem biblioteca.
 * @param prevState - estado anterior do `useActionState`.
 * @param formData - campos do formulário.
 * @returns o estado novo, com `savedCount` incrementado em caso de sucesso.
 */
export async function createProfile(
  prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireSession();
  const read = readProfileInput(formData);

  if (!read.ok) {
    return { ...prevState, error: null, fieldErrors: read.fieldErrors };
  }

  const missing = await missingSkills(read.input.skillIds);

  if (missing) {
    return { ...prevState, error: null, fieldErrors: { skills: missing } };
  }

  try {
    const created = await prisma.profile.create({
      data: {
        userId: session.userId,
        name: read.input.name,
        description: read.input.description,
        plugins: read.input.plugins,
        skills: {
          create: read.input.skillIds.map((skillId) => ({ skillId })),
        },
      },
      select: { id: true },
    });

    // O primeiro perfil de um usuário vira o ativo sozinho: sem perfil ativo a
    // biblioteca vem vazia, e obrigar um segundo clique para sair desse estado
    // seria uma armadilha, não uma escolha.
    await prisma.user.updateMany({
      where: { id: session.userId, activeProfileId: null },
      data: { activeProfileId: created.id },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...prevState,
        error: null,
        fieldErrors: {
          name: `Você já tem um perfil chamado "${read.input.name}".`,
        },
      };
    }

    console.error("Falha ao criar perfil:", error);

    return {
      ...prevState,
      error: "Não foi possível criar o perfil. Tente novamente.",
      fieldErrors: {},
    };
  }

  revalidatePath(PROFILES_PATH);

  return { savedCount: prevState.savedCount + 1, error: null, fieldErrors: {} };
}

/**
 * Salva a edição de um perfil, incrementando a revisão.
 *
 * A posse é conferida ANTES da escrita, com um `findFirst` por `(id, userId)`:
 * um `update({ where: { id } })` cru deixaria um POST forjado editar o perfil de
 * outra pessoa.
 * @param prevState - estado anterior do `useActionState`.
 * @param formData - campos do formulário, mais o `id` do perfil editado.
 * @returns o estado novo, com `savedCount` incrementado em caso de sucesso.
 */
export async function updateProfile(
  prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return {
      ...prevState,
      error: "O perfil que você está editando não foi identificado.",
      fieldErrors: {},
    };
  }

  const read = readProfileInput(formData);

  if (!read.ok) {
    return { ...prevState, error: null, fieldErrors: read.fieldErrors };
  }

  const owned = await prisma.profile.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });

  if (owned === null) {
    return { ...prevState, error: "Perfil não encontrado.", fieldErrors: {} };
  }

  const missing = await missingSkills(read.input.skillIds);

  if (missing) {
    return { ...prevState, error: null, fieldErrors: { skills: missing } };
  }

  try {
    await prisma.$transaction([
      prisma.profileSkill.deleteMany({ where: { profileId: owned.id } }),
      prisma.profileSkill.createMany({
        data: read.input.skillIds.map((skillId) => ({
          profileId: owned.id,
          skillId,
        })),
      }),
      prisma.profile.update({
        where: { id: owned.id },
        data: {
          name: read.input.name,
          description: read.input.description,
          plugins: read.input.plugins,
          revision: { increment: 1 },
        },
      }),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...prevState,
        error: null,
        fieldErrors: {
          name: `Você já tem um perfil chamado "${read.input.name}".`,
        },
      };
    }

    console.error("Falha ao editar perfil:", error);

    return {
      ...prevState,
      error: "Não foi possível salvar o perfil. Tente novamente.",
      fieldErrors: {},
    };
  }

  revalidatePath(PROFILES_PATH);

  return { savedCount: prevState.savedCount + 1, error: null, fieldErrors: {} };
}

/**
 * Torna um perfil o ativo de quem está logado.
 *
 * O `updateMany` filtra por dono no próprio `where`, então um id alheio é um
 * no-op silencioso — a mesma regra da API: não confirmar a existência.
 * @param formData - contém o `id` do perfil.
 */
export async function selectProfile(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) return;

  const owned = await prisma.profile.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });

  if (owned === null) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { activeProfileId: owned.id },
  });

  revalidatePath(PROFILES_PATH);
}

/**
 * Remove um perfil de quem está logado.
 *
 * Apagar o perfil ativo deixa o usuário sem nenhum (`onDelete: SetNull`), e a
 * casca reabre o seletor. `count === 0` é no-op silencioso: um id alheio não
 * responde diferente de um inexistente.
 * @param formData - contém o `id` do perfil.
 */
export async function deleteProfile(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) return;

  await prisma.profile.deleteMany({ where: { id, userId: session.userId } });

  revalidatePath(PROFILES_PATH);
}
