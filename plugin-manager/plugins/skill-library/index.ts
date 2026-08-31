// Leitura da biblioteca de skills pelo cliente `dsh`.
//
// A escrita não passa por aqui: quem cadastra é o painel, por server action com
// sessão de cookie (`src/app/actions/skills.ts`). Este módulo é só o lado que o
// provider remoto do `dsh` consome com token Bearer, e por isso não ramifica em
// papel nenhum — toda sessão autenticada lê a mesma biblioteca.

import "server-only";
import { prisma } from "@/lib/db";
import { SKILL_NAME_PATTERN } from "@/lib/skills";

/**
 * Uma skill no catálogo: tudo que o modelo precisa para decidir carregá-la,
 * menos o corpo. É o que o `list` devolve.
 */
export type SkillLibrarySummary = {
  name: string;
  description: string;
  whenToUse?: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
  revision: number;
};

/** Uma skill com o corpo. É o que o `get` devolve. */
export type SkillLibraryEntry = SkillLibrarySummary & { content: string };

/** Erro de argumento vindo do cliente. A rota o traduz em status. */
export class SkillLibraryRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SkillLibraryRequestError";
  }
}

/**
 * Valida o nome antes de ele virar chave de busca.
 *
 * O nome chega pela URL, que é fronteira de wire: um valor fora do formato é
 * recusado com 400 em vez de virar um `findUnique` que responderia 404 e
 * esconderia o erro de quem chamou.
 * @param value - segmento de caminho recebido.
 * @returns o nome validado.
 * @throws SkillLibraryRequestError 400 quando não é kebab-case.
 */
export function assertSkillName(value: unknown): string {
  if (typeof value !== "string" || !SKILL_NAME_PATTERN.test(value)) {
    throw new SkillLibraryRequestError(
      "O nome da skill precisa ser kebab-case.",
      400,
    );
  }

  return value;
}

/** Projeta uma linha nos campos do wire, omitindo o `whenToUse` ausente. */
function toSummary(row: {
  name: string;
  description: string;
  whenToUse: string | null;
  modelInvocable: boolean;
  userInvocable: boolean;
  revision: number;
}): SkillLibrarySummary {
  return {
    name: row.name,
    description: row.description,
    ...(row.whenToUse === null ? {} : { whenToUse: row.whenToUse }),
    invocation: {
      modelInvocable: row.modelInvocable,
      userInvocable: row.userInvocable,
    },
    revision: row.revision,
  };
}

/**
 * O catálogo publicado, ordenado por nome.
 *
 * Sem corpo, de propósito: o cliente relê o catálogo a cada refresh de
 * descoberta, e mandar as instruções inteiras nessa chamada colocaria a
 * biblioteca completa na requisição mais frequente. O corpo sai só pelo `get`,
 * que é uma escolha explícita do modelo.
 * @returns os sumários e a revisão máxima da biblioteca.
 */
export async function listSkills(): Promise<{
  revision: number;
  skills: SkillLibrarySummary[];
}> {
  const rows = await prisma.librarySkill.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      description: true,
      whenToUse: true,
      modelInvocable: true,
      userInvocable: true,
      revision: true,
      updatedAt: true,
    },
  });

  // Revisão da biblioteca como um todo: soma das revisões das linhas publicadas.
  // Muda quando qualquer skill muda, e também quando uma entra ou sai — o que um
  // `max()` não pegaria, já que remover a skill de maior revisão baixaria o
  // número e pareceria um retrocesso.
  const revision = rows.reduce((total, row) => total + row.revision, 0);

  return { revision, skills: rows.map(toSummary) };
}

/**
 * Uma skill publicada, com o corpo.
 *
 * Uma skill despublicada responde como inexistente: quem consome não precisa
 * distinguir "não existe" de "existe como rascunho", e distinguir vazaria a
 * existência de trabalho que ainda não foi liberado.
 * @param name - nome já validado por {@link assertSkillName}.
 * @returns a skill, ou `null` quando não existe ou não está publicada.
 */
export async function readSkill(
  name: string,
): Promise<SkillLibraryEntry | null> {
  const row = await prisma.librarySkill.findFirst({
    where: { name, published: true },
    select: {
      name: true,
      description: true,
      whenToUse: true,
      modelInvocable: true,
      userInvocable: true,
      revision: true,
      content: true,
    },
  });

  return row === null ? null : { ...toSummary(row), content: row.content };
}
