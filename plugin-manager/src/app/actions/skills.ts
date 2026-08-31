"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import {
  MAX_CONTENT_BYTES,
  MAX_DESCRIPTION_LENGTH,
  SKILL_NAME_HINT,
  SKILL_NAME_PATTERN,
  type SkillFieldErrors,
  type SkillFormState,
} from "@/lib/skills";
import {
  SkillFrontmatterError,
  parseSkillFile,
} from "@/lib/skill-frontmatter";

const SKILLS_PATH = "/dashboard/skills";

/** Campos de uma skill como saem do formulário, já normalizados. */
type SkillInput = {
  name: string;
  description: string;
  whenToUse: string | null;
  content: string;
  modelInvocable: boolean;
  userInvocable: boolean;
  published: boolean;
};

/**
 * Recusa quem não é ADMIN.
 *
 * Esconder o formulário no cliente não é controle de acesso: uma action é um
 * endpoint, e é aqui que o papel é verificado.
 * @returns `null` quando a sessão pode escrever, ou o estado de erro a devolver.
 */
async function requireAdmin(
  prevState: SkillFormState,
): Promise<SkillFormState | null> {
  const session = await requireSession();

  if (session.role !== Role.ADMIN) {
    return {
      ...prevState,
      error: "Apenas administradores podem alterar a biblioteca de skills.",
      fieldErrors: {},
    };
  }

  return null;
}

/** O mesmo guard para as actions sem estado de formulário. */
async function assertAdmin(): Promise<void> {
  const session = await requireSession();

  if (session.role !== Role.ADMIN) {
    throw new Error("Apenas administradores podem alterar a biblioteca.");
  }
}

function checkbox(formData: FormData, field: string): boolean {
  return formData.get(field) !== null;
}

/**
 * Lê os campos do formulário e valida cada um.
 *
 * A validação é do servidor porque o formulário é entrada não confiável, e
 * porque `name` e `description` têm consequência no cliente do `dsh`: um nome
 * fora do kebab-case é inendereçável pelo modelo, e uma descrição vazia deixa o
 * catálogo sem o texto pelo qual o modelo decide carregar a skill.
 * @param formData - corpo do formulário de criação ou edição.
 * @returns os campos normalizados, ou os erros por campo.
 */
function readSkillInput(
  formData: FormData,
): { ok: true; input: SkillInput } | { ok: false; fieldErrors: SkillFieldErrors } {
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const whenToUse = String(formData.get("whenToUse") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  const fieldErrors: SkillFieldErrors = {};

  if (!name) {
    fieldErrors.name = "Informe o nome da skill.";
  } else if (!SKILL_NAME_PATTERN.test(name)) {
    fieldErrors.name = SKILL_NAME_HINT;
  }

  if (!description) {
    fieldErrors.description = "Informe a descrição — é o que o modelo lê para decidir usar a skill.";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    fieldErrors.description = `A descrição passa de ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  }

  if (!content) {
    fieldErrors.content = "Informe o corpo da skill.";
  } else if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    fieldErrors.content = `O corpo passa de ${Math.floor(MAX_CONTENT_BYTES / 1024)} KiB.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    input: {
      name,
      description,
      whenToUse: whenToUse === "" ? null : whenToUse,
      content,
      modelInvocable: checkbox(formData, "modelInvocable"),
      userInvocable: checkbox(formData, "userInvocable"),
      published: checkbox(formData, "published"),
    },
  };
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
 * Cadastra uma skill na biblioteca.
 *
 * Aceita dois modos: os campos separados, ou um `SKILL.md` inteiro colado no
 * campo `source` — que é como as skills que já existem em disco entram sem
 * redigitação.
 * @param prevState - estado anterior do `useActionState`.
 * @param formData - campos do formulário.
 * @returns o estado novo, com `savedCount` incrementado em caso de sucesso.
 */
export async function createSkill(
  prevState: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const denied = await requireAdmin(prevState);

  if (denied) return denied;

  const source = String(formData.get("source") ?? "").trim();
  let input: SkillInput;

  if (source) {
    try {
      const parsed = parseSkillFile(source);

      input = { ...parsed, published: checkbox(formData, "published") };
    } catch (error) {
      if (error instanceof SkillFrontmatterError) {
        return {
          ...prevState,
          error: null,
          fieldErrors: { source: error.message },
        };
      }

      throw error;
    }
  } else {
    const read = readSkillInput(formData);

    if (!read.ok) {
      return { ...prevState, error: null, fieldErrors: read.fieldErrors };
    }

    input = read.input;
  }

  try {
    await prisma.librarySkill.create({ data: input });
  } catch (error) {
    // Corrida entre um cadastro simultâneo e este insert: o índice único é a
    // garantia real, então a mensagem amigável sai da exceção, não de um SELECT
    // prévio que poderia estar desatualizado no instante da escrita.
    if (isUniqueViolation(error)) {
      return {
        ...prevState,
        error: null,
        fieldErrors: {
          [source ? "source" : "name"]: `Já existe uma skill chamada "${input.name}".`,
        },
      };
    }

    console.error("Falha ao criar skill:", error);

    return {
      ...prevState,
      error: "Não foi possível criar a skill. Tente novamente.",
      fieldErrors: {},
    };
  }

  revalidatePath(SKILLS_PATH);

  return { savedCount: prevState.savedCount + 1, error: null, fieldErrors: {} };
}

/**
 * Salva a edição de uma skill existente, incrementando a revisão.
 * @param prevState - estado anterior do `useActionState`.
 * @param formData - campos do formulário, mais o `id` da skill editada.
 * @returns o estado novo, com `savedCount` incrementado em caso de sucesso.
 */
export async function updateSkill(
  prevState: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const denied = await requireAdmin(prevState);

  if (denied) return denied;

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return {
      ...prevState,
      error: "A skill que você está editando não foi identificada.",
      fieldErrors: {},
    };
  }

  const read = readSkillInput(formData);

  if (!read.ok) {
    return { ...prevState, error: null, fieldErrors: read.fieldErrors };
  }

  try {
    await prisma.librarySkill.update({
      where: { id },
      data: { ...read.input, revision: { increment: 1 } },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...prevState,
        error: null,
        fieldErrors: {
          name: `Já existe uma skill chamada "${read.input.name}".`,
        },
      };
    }

    console.error("Falha ao editar skill:", error);

    return {
      ...prevState,
      error: "Não foi possível salvar a skill. Tente novamente.",
      fieldErrors: {},
    };
  }

  revalidatePath(SKILLS_PATH);

  return { savedCount: prevState.savedCount + 1, error: null, fieldErrors: {} };
}

/**
 * Publica ou despublica uma skill.
 *
 * Despublicada, a skill some da API e de todo cliente, mas continua editável no
 * painel — é a saída para tirar de circulação sem perder o texto.
 * @param formData - contém `id` e o `published` desejado.
 */
export async function toggleSkillPublished(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) return;

  await prisma.librarySkill.update({
    where: { id },
    data: { published: formData.get("published") === "true" },
  });

  revalidatePath(SKILLS_PATH);
}

/**
 * Remove uma skill da biblioteca em definitivo.
 * @param formData - contém o `id` da skill.
 */
export async function deleteSkill(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) return;

  await prisma.librarySkill.delete({ where: { id } });

  revalidatePath(SKILLS_PATH);
}
