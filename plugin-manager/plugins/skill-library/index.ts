// Leitura da biblioteca de skills pelo cliente `dsh`.
//
// A escrita não passa por aqui: quem cadastra é o painel, por server action com
// sessão de cookie (`src/app/actions/skills.ts`). Este módulo é só o lado que o
// provider remoto do `dsh` consome com token Bearer.
//
// Não ramifica em PAPEL: um admin e um guest com o mesmo perfil leem a mesma
// coisa. Ramifica em PERFIL — a leitura é a interseção entre as linhas
// publicadas e as selecionadas no perfil ativo de quem chama. Um perfil só
// estreita: nunca alcança uma linha despublicada, o que é o que torna seguro
// deixar cada usuário editar os próprios perfis.

import "server-only";
import { prisma } from "@/lib/db";
import { SKILL_NAME_PATTERN } from "@/lib/skills";
import { type ProfileScope, readActiveProfileId } from "@plugins/profile";

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
 * Cláusula que recorta a biblioteca ao perfil ativo.
 *
 * `userId` entra mesmo com `profileId` já único: custa nada (mesmo caminho de
 * índice) e fecha o caso de um id que tenha sido apagado e recriado sob outro
 * dono. É a mesma regra do `prototype` — o dono vem sempre do token.
 */
function scopedWhere(scope: ProfileScope, activeProfileId: string) {
  return {
    published: true,
    profiles: {
      some: { profile: { id: activeProfileId, userId: scope.userId } },
    },
  };
}

/**
 * O catálogo do perfil ativo, ordenado por nome.
 *
 * Sem corpo, de propósito: o cliente relê o catálogo a cada refresh de
 * descoberta, e mandar as instruções inteiras nessa chamada colocaria a
 * biblioteca completa na requisição mais frequente. O corpo sai só pelo `get`,
 * que é uma escolha explícita do modelo.
 *
 * Sem perfil ativo devolve um catálogo vazio sem tocar o banco. Fechar em vazio
 * é o que torna o recorte obrigatório: se "sem perfil" lesse tudo, uma casca
 * bastaria não escolher perfil para receber a biblioteca inteira. O cliente já
 * trata catálogo vazio como estado de primeira classe, então isto degrada para
 * "nenhuma skill", não para erro.
 * @param scope - quem está lendo, vindo do token.
 * @returns os sumários, a revisão da fatia, e o perfil que a recortou — `null`
 * distingue "sem perfil ativo" de "perfil com seleção vazia", que a soma das
 * revisões sozinha não separa.
 */
export async function listSkills(scope: ProfileScope): Promise<{
  revision: number;
  skills: SkillLibrarySummary[];
  profileId: string | null;
}> {
  const activeProfileId = await readActiveProfileId(scope);

  if (activeProfileId === null) {
    return { revision: 0, skills: [], profileId: null };
  }

  const rows = await prisma.librarySkill.findMany({
    where: scopedWhere(scope, activeProfileId),
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

  return { revision, skills: rows.map(toSummary), profileId: activeProfileId };
}

/**
 * Uma skill do perfil ativo, com o corpo.
 *
 * Despublicada, fora do perfil ativo ou inexistente respondem igual: quem
 * consome não precisa distinguir os três, e distinguir vazaria tanto a existência
 * de trabalho ainda não liberado quanto o conteúdo da biblioteca fora do recorte.
 * @param scope - quem está lendo, vindo do token.
 * @param name - nome já validado por {@link assertSkillName}.
 * @returns a skill, ou `null` quando não alcançável por este perfil.
 */
export async function readSkill(
  scope: ProfileScope,
  name: string,
): Promise<SkillLibraryEntry | null> {
  const activeProfileId = await readActiveProfileId(scope);

  if (activeProfileId === null) return null;

  const row = await prisma.librarySkill.findFirst({
    where: { name, ...scopedWhere(scope, activeProfileId) },
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
