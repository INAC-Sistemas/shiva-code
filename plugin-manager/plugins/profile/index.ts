// O recorte de skills e plugins que a casca do `dsh` materializa.
//
// Todo acesso é filtrado por `userId`, como nos modelos `Prototype*`: a casca é
// código não confiável, então nenhuma consulta aqui aceita o dono vindo do corpo
// da requisição — ele vem sempre do token.
//
// O perfil ativo mora em `User.activeProfileId`, não numa claim do token. É o
// que faz trocar de perfil não emitir nem revogar credencial: os tokens já
// distribuídos resolvem o perfil novo na requisição seguinte.

import "server-only";
import { prisma } from "@/lib/db";
import { KNOWN_PLUGIN_IDS } from "@/lib/profiles";

/** Quem está chamando. Vem sempre do token, nunca do corpo. */
export type ProfileScope = { userId: string };

/** Uma linha do seletor de perfil, sem as seleções em si. */
export type ProfileSummary = {
  id: string;
  name: string;
  description: string | null;
  pluginCount: number;
  skillCount: number;
  revision: number;
};

/**
 * O que a casca precisa para materializar um perfil: identificadores, e só.
 *
 * Nunca texto de composição. `cordis.yml` interpreta `!!js` sob `config` e sob
 * `disabled`, então YAML vindo daqui seria execução remota de código na máquina
 * do usuário. A casca resolve estes nomes contra a tabela de linhas do próprio
 * build dela.
 */
export type ProfileSpec = {
  profile: { id: string; name: string; revision: number };
  plugins: string[];
  skills: string[];
};

/** Erro de argumento vindo do cliente. A rota o traduz em status. */
export class ProfileRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProfileRequestError";
  }
}

/** Formato de um id gerado por `@default(uuid())`. */
const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida o id antes de ele virar chave de busca.
 *
 * Um valor fora do formato é recusado com 400 em vez de virar uma consulta que
 * responderia 404 e esconderia o erro de quem chamou — a mesma razão do
 * `assertSkillName` da biblioteca.
 * @param value - valor recebido no corpo da requisição.
 * @returns o id validado.
 * @throws ProfileRequestError 400 quando não tem o formato de um uuid.
 */
export function assertProfileId(value: unknown): string {
  if (typeof value !== "string" || !PROFILE_ID_PATTERN.test(value)) {
    throw new ProfileRequestError("profileId inválido.", 400);
  }

  return value;
}

/**
 * Os perfis do usuário e qual está ativo.
 *
 * Sem ramo de admin, ao contrário de `/api/users`: um perfil é escopo de
 * execução, não listagem. Um admin supervisiona pelo painel; deixá-lo listar os
 * perfis alheios aqui seria deixá-lo ENTRAR neles pela casca.
 * @param scope - o dono, vindo do token.
 * @returns os perfis ordenados por nome e o id do ativo, ou `null`.
 */
export async function listProfiles(scope: ProfileScope): Promise<{
  profiles: ProfileSummary[];
  activeId: string | null;
}> {
  const [rows, user] = await Promise.all([
    prisma.profile.findMany({
      where: { userId: scope.userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        plugins: true,
        revision: true,
        _count: { select: { skills: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: scope.userId },
      select: { activeProfileId: true },
    }),
  ]);

  return {
    profiles: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      pluginCount: row.plugins.filter((id) => KNOWN_PLUGIN_IDS.has(id)).length,
      skillCount: row._count.skills,
      revision: row.revision,
    })),
    activeId: user?.activeProfileId ?? null,
  };
}

/**
 * O id do perfil ativo do usuário, ou `null`.
 *
 * É a resolução que a biblioteca de skills também faz, exportada aqui para os
 * dois lugares lerem a mesma regra.
 * @param scope - o dono, vindo do token.
 * @returns o id do perfil ativo, ou `null` quando nenhum está escolhido.
 */
export async function readActiveProfileId(
  scope: ProfileScope,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { activeProfileId: true },
  });

  return user?.activeProfileId ?? null;
}

/** Monta o spec de um perfil já resolvido como pertencente ao usuário. */
async function specFor(profileId: string): Promise<ProfileSpec | null> {
  const row = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      name: true,
      revision: true,
      plugins: true,
      skills: {
        where: { skill: { published: true } },
        select: { skill: { select: { name: true } } },
      },
    },
  });

  if (row === null) return null;

  return {
    profile: { id: row.id, name: row.name, revision: row.revision },
    // Interseção com o que a release do cliente conhece: um plugin aposentado
    // deixa de ser servido sem migração de dados, e um nome gravado por um build
    // anterior não pode contrabandear uma linha que a casca não reconheceria.
    plugins: row.plugins.filter((id) => KNOWN_PLUGIN_IDS.has(id)).sort(),
    // `published` é o MESMO predicado que a biblioteca aplica, então o spec
    // nunca anuncia uma skill que `/skills/<name>` responderia 404.
    skills: row.skills.map((entry) => entry.skill.name).sort(),
  };
}

/**
 * O spec do perfil ativo do usuário.
 *
 * `null` cobre dois estados de uma vez — nunca escolheu, e o ativo foi apagado —
 * porque a casca resolve os dois com a mesma ação: reabrir o seletor.
 * @param scope - o dono, vindo do token.
 * @returns o spec, ou `null` quando não há perfil ativo.
 */
export async function readActiveSpec(
  scope: ProfileScope,
): Promise<ProfileSpec | null> {
  const activeId = await readActiveProfileId(scope);

  return activeId === null ? null : specFor(activeId);
}

/**
 * Torna um perfil o ativo do usuário.
 *
 * O perfil precisa ser dele: a checagem de posse acontece antes da escrita, e um
 * perfil de outro dono responde como inexistente — não confirmar a existência é
 * a mesma regra dos screenshots do `prototype`.
 * @param scope - o dono, vindo do token.
 * @param profileId - id já validado por {@link assertProfileId}.
 * @returns o spec do perfil que passou a valer.
 * @throws ProfileRequestError 404 quando o perfil não existe ou é de outro dono.
 */
export async function setActiveProfile(
  scope: ProfileScope,
  profileId: string,
): Promise<ProfileSpec> {
  const owned = await prisma.profile.findFirst({
    where: { id: profileId, userId: scope.userId },
    select: { id: true },
  });

  if (owned === null) {
    throw new ProfileRequestError("Perfil não encontrado.", 404);
  }

  await prisma.user.update({
    where: { id: scope.userId },
    data: { activeProfileId: owned.id },
  });

  const spec = await specFor(owned.id);

  if (spec === null) {
    // Só alcançável se o perfil for apagado entre a checagem e a leitura.
    throw new ProfileRequestError("Perfil não encontrado.", 404);
  }

  return spec;
}
