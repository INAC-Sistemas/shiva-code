"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  type ProfileDraft,
  ProfileRequestError,
  createProfile as createOwnedProfile,
  isUniqueViolation,
  profileDraftErrors,
} from "@plugins/profile";
import type { ProfileFieldErrors, ProfileFormState } from "@/lib/profiles";

const PROFILES_PATH = "/dashboard/profiles";

/** Campos de um perfil como saem do formulário, já normalizados. */
type ProfileInput = ProfileDraft;

/**
 * Lê os campos do formulário e valida cada um.
 *
 * As regras em si moram em `@plugins/profile`, junto da API: o formulário e a
 * casca propõem o mesmo rascunho, e recusá-lo em dois lugares deixaria as duas
 * telas divergirem sobre o que é um perfil válido.
 * @param formData - corpo do formulário de criação ou edição.
 * @returns os campos normalizados, ou os erros por campo.
 */
function readProfileInput(
  formData: FormData,
):
  | { ok: true; input: ProfileInput }
  | { ok: false; fieldErrors: ProfileFieldErrors } {
  const description = String(formData.get("description") ?? "").trim();
  const input: ProfileInput = {
    name: String(formData.get("name") ?? "").trim(),
    description: description === "" ? null : description,
    plugins: [...new Set(formData.getAll("plugins").map(String))].sort(),
    skillIds: [...new Set(formData.getAll("skills").map(String))],
  };

  const fieldErrors = profileDraftErrors(input);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, input };
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

/**
 * Cria um perfil para quem está logado.
 *
 * A gravação é a mesma de `POST /api/profiles`: o painel e a casca criam pelo
 * mesmo caminho, então só muda como o erro é mostrado — aqui, sob o campo
 * culpado, que é o que o `field` do erro carrega.
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

  try {
    await createOwnedProfile({ userId: session.userId }, read.input);
  } catch (error) {
    if (error instanceof ProfileRequestError) {
      return error.field === undefined
        ? { ...prevState, error: error.message, fieldErrors: {} }
        : {
            ...prevState,
            error: null,
            fieldErrors: { [error.field]: error.message },
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
