// Leitura da biblioteca de skills pelo cliente `dsh`.
//
// A escrita não passa por aqui: quem cadastra é o painel, por server action com
// sessão de cookie (`src/app/actions/skills.ts`). Este módulo é só o lado que o
// provider remoto do `dsh` consome com token Bearer.
//
// Não ramifica em PAPEL: um admin e um guest com o mesmo perfil leem a mesma
// coisa. Ramifica em PERFIL — a leitura é a interseção entre as linhas
// publicadas e as marcadas no perfil selecionado de quem chama. Um perfil só
// estreita: nunca alcança uma linha despublicada, o que é o que torna seguro
// deixar cada usuário editar os próprios perfis.

import "server-only";
import { prisma } from "@/lib/db";
import { SKILL_NAME_PATTERN } from "@/lib/skills";
import {
  type ProfileScope,
  readSelectedProfileId,
  selectableWhere,
} from "@plugins/profile";

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
 * Cláusula que recorta a biblioteca ao perfil selecionado.
 *
 * {@link selectableWhere} entra mesmo com o id já conferido por
 * {@link readSelectedProfileId}: custa nada e fecha a corrida de um perfil
 * desativado ou tornado privado entre as duas consultas.
 */
function scopedWhere(scope: ProfileScope, selectedProfileId: string) {
  return {
    published: true,
    profiles: {
      some: {
        profile: { id: selectedProfileId, ...selectableWhere(scope.userId) },
      },
    },
  };
}

/**
 * O catálogo do perfil selecionado, ordenado por nome.
 *
 * Sem corpo, de propósito: o cliente relê o catálogo a cada refresh de
 * descoberta, e mandar as instruções inteiras nessa chamada colocaria a
 * biblioteca completa na requisição mais frequente. O corpo sai só pelo `get`,
 * que é uma escolha explícita do modelo.
 *
 * Sem perfil selecionado devolve um catálogo vazio sem tocar o banco. Fechar em vazio
 * é o que torna o recorte obrigatório: se "sem perfil" lesse tudo, uma casca
 * bastaria não escolher perfil para receber a biblioteca inteira. O cliente já
 * trata catálogo vazio como estado de primeira classe, então isto degrada para
 * "nenhuma skill", não para erro.
 * @param scope - quem está lendo, vindo do token.
 * @returns os sumários, a revisão da fatia, e o perfil que a recortou — `null`
 * distingue "sem perfil selecionado" de "perfil com seleção vazia", que a soma das
 * revisões sozinha não separa.
 */
export async function listSkills(scope: ProfileScope): Promise<{
  revision: number;
  skills: SkillLibrarySummary[];
  profileId: string | null;
}> {
  const selectedProfileId = await readSelectedProfileId(scope);

  if (selectedProfileId === null) {
    return { revision: 0, skills: [], profileId: null };
  }

  const rows = await prisma.librarySkill.findMany({
    where: scopedWhere(scope, selectedProfileId),
    orderBy: { name: "asc" },
    select: {
      name: true,
      description: true,
      whenToUse: true,
      modelInvocable: true,
      userInvocable: true,
      revision: true,
    },
  });

  // Revisão da fatia como um todo: soma das revisões das linhas servidas.
  // Muda quando qualquer skill muda, e também quando uma entra ou sai — o que um
  // `max()` não pegaria, já que remover a skill de maior revisão baixaria o
  // número e pareceria um retrocesso. Com o recorte por perfil, "entrar e sair"
  // passa a incluir marcar e desmarcar no painel, que é justamente o que o
  // cliente precisa detectar. Não é comparável ENTRE perfis, e não precisa ser:
  // um cliente só compara leituras sucessivas dele mesmo. `0` é sentinela segura
  // de "sem perfil": uma linha publicada tem `revision >= 1`, então uma fatia
  // não-vazia nunca soma zero.
  const revision = rows.reduce((total, row) => total + row.revision, 0);

  return { revision, skills: rows.map(toSummary), profileId: selectedProfileId };
}

/** O resultado de {@link readSkill}. */
export type SkillRead =
  | { kind: "found"; skill: SkillLibraryEntry }
  /** Publicada, mas fora do perfil selecionado — ou nenhum perfil selecionado. */
  | { kind: "not-in-profile" }
  /** Inexistente ou despublicada. */
  | { kind: "not-found" };

/**
 * Uma skill do perfil selecionado, com o corpo.
 *
 * Publicada e fora do recorte responde `not-in-profile`, que a rota traduz em
 * 403: o agente precisa dizer ao usuário que o perfil não contempla a skill, e
 * não que ela não existe. Revelar o nome não vaza nada — a biblioteca publicada
 * é a mesma para todos, e o painel já a lista a qualquer usuário. Despublicada e
 * inexistente continuam iguais (`not-found`): distinguir as duas vazaria a
 * existência de trabalho ainda não liberado.
 * @param scope - quem está lendo, vindo do token.
 * @param name - nome já validado por {@link assertSkillName}.
 * @returns a skill, ou por que ela não é alcançável por este perfil.
 */
export async function readSkill(
  scope: ProfileScope,
  name: string,
): Promise<SkillRead> {
  const selectedProfileId = await readSelectedProfileId(scope);
  const row = selectedProfileId === null ? null : await prisma.librarySkill.findFirst({
    where: { name, ...scopedWhere(scope, selectedProfileId) },
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

  if (row !== null) {
    return { kind: "found", skill: { ...toSummary(row), content: row.content } };
  }

  const published = await prisma.librarySkill.count({
    where: { name, published: true },
  });

  return published > 0 ? { kind: "not-in-profile" } : { kind: "not-found" };
}
