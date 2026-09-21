// O recorte de skills e plugins que a casca do `dsh` materializa.
//
// Quem chama vem sempre do token, nunca do corpo: a casca é código não
// confiável. Editar é só do dono; SELECIONAR segue {@link selectableWhere} —
// perfis próprios e públicos de outros donos, desde que ativos.
//
// O perfil em uso mora em `User.selectedProfileId`, não numa claim do token. É o
// que faz trocar de perfil não emitir nem revogar credencial: os tokens já
// distribuídos resolvem o perfil novo na requisição seguinte.

import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfileStatus, ProfileVisibility } from "@/generated/prisma/enums";
import {
  KNOWN_PLUGINS,
  KNOWN_PLUGIN_IDS,
  MAX_PROFILE_DESCRIPTION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "@/lib/profiles";

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
  visibility: ProfileVisibility;
  status: ProfileStatus;
  /** Verdadeiro quando quem chama é o dono; perfis públicos de outros vêm `false`. */
  isOwn: boolean;
  /** Nome do dono: dois donos podem ter perfis públicos com o mesmo nome. */
  ownerName: string;
};

/**
 * Os perfis que um usuário pode selecionar: ativos, e próprios ou públicos.
 *
 * É a regra única de seleção — a listagem, a escrita da seleção e a biblioteca
 * de skills filtram por ela, então um perfil desativado ou tornado privado
 * deixa de valer nos três lugares ao mesmo tempo.
 * @param userId - quem seleciona, vindo do token.
 * @returns o filtro Prisma de `Profile`.
 */
export function selectableWhere(userId: string): Prisma.ProfileWhereInput {
  return {
    status: "ACTIVE",
    OR: [{ userId }, { visibility: "PUBLIC" }],
  };
}

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

/** Campo de um rascunho que pode receber erro individual. */
export type ProfileDraftField = "name" | "description" | "plugins" | "skills";

/**
 * Erro de argumento vindo do cliente. A rota o traduz em status.
 *
 * `field` existe porque os dois chamadores mostram o mesmo erro de formas
 * diferentes: a rota devolve status e mensagem, o formulário do painel pinta a
 * mensagem sob o campo culpado. Sem ele, o painel teria de reconhecer a
 * mensagem por texto para saber onde pintá-la.
 */
export class ProfileRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: ProfileDraftField,
  ) {
    super(message);
    this.name = "ProfileRequestError";
  }
}

/** Um perfil como o formulário do painel ou a casca o propõem, já normalizado. */
export type ProfileDraft = {
  name: string;
  description: string | null;
  plugins: string[];
  skillIds: string[];
  visibility: ProfileVisibility;
  status: ProfileStatus;
};

/** Um plugin oferecido na criação: o id que compõe, mais como apresentá-lo. */
export type PluginOption = {
  id: string;
  label: string;
  hint: string;
  plane: "agent" | "host";
};

/** Uma skill publicada, oferecida na criação. */
export type SkillOption = { id: string; name: string; description: string };

/**
 * Tudo que se pode marcar ao criar um perfil.
 *
 * O painel monta o dele das próprias constantes e do banco; a casca não tem
 * como fazer isso, então lê daqui. Os plugins vêm com rótulo e dica para as
 * duas telas dizerem a mesma coisa sobre a mesma linha, mas quem decide o que a
 * casca CONSEGUE compor continua sendo a tabela do build dela — o servidor
 * descreve as linhas, não as autoriza.
 */
export type ProfileCatalog = { plugins: PluginOption[]; skills: SkillOption[] };

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

/** Colunas que {@link toSummary} projeta. */
const SUMMARY_SELECT = {
  id: true,
  userId: true,
  name: true,
  description: true,
  plugins: true,
  revision: true,
  visibility: true,
  status: true,
  user: { select: { name: true } },
  _count: { select: { skills: true } },
} as const;

type SummaryRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  plugins: string[];
  revision: number;
  visibility: ProfileVisibility;
  status: ProfileStatus;
  user: { name: string };
  _count: { skills: number };
};

function toSummary(row: SummaryRow, scope: ProfileScope): ProfileSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pluginCount: row.plugins.filter((id) => KNOWN_PLUGIN_IDS.has(id)).length,
    skillCount: row._count.skills,
    revision: row.revision,
    visibility: row.visibility,
    status: row.status,
    isOwn: row.userId === scope.userId,
    ownerName: row.user.name,
  };
}

/**
 * Os perfis que o usuário pode selecionar, e qual está selecionado.
 *
 * Sem ramo de admin, ao contrário de `/api/users`: um perfil é escopo de
 * execução, não listagem. Um admin supervisiona pelo painel; deixá-lo listar os
 * perfis privados alheios aqui seria deixá-lo ENTRAR neles pela casca.
 * @param scope - quem chama, vindo do token.
 * @returns os perfis (próprios primeiro, depois por nome) e o id do
 *   selecionado, ou `null` quando nenhum selecionável está escolhido.
 */
export async function listProfiles(scope: ProfileScope): Promise<{
  profiles: ProfileSummary[];
  selectedId: string | null;
}> {
  const [rows, selectedId] = await Promise.all([
    prisma.profile.findMany({
      where: selectableWhere(scope.userId),
      orderBy: { name: "asc" },
      select: SUMMARY_SELECT,
    }),
    readSelectedProfileId(scope),
  ]);

  const profiles = rows.map((row) => toSummary(row, scope));

  return {
    // Estável: dentro de cada grupo a ordem por nome do banco se mantém.
    profiles: profiles.sort((a, b) => Number(b.isOwn) - Number(a.isOwn)),
    selectedId,
  };
}

/**
 * O id do perfil selecionado pelo usuário, ou `null`.
 *
 * Só devolve o id enquanto o perfil continua selecionável: desativado, tornado
 * privado por outro dono, ou apagado resolvem `null`, e a casca reabre o
 * seletor. É a resolução que a biblioteca de skills também faz, exportada aqui
 * para os dois lugares lerem a mesma regra.
 * @param scope - quem chama, vindo do token.
 * @returns o id do perfil selecionado, ou `null`.
 */
export async function readSelectedProfileId(
  scope: ProfileScope,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { selectedProfileId: true },
  });
  const selectedId = user?.selectedProfileId ?? null;

  if (selectedId === null) return null;

  const selectable = await prisma.profile.count({
    where: { id: selectedId, ...selectableWhere(scope.userId) },
  });

  return selectable > 0 ? selectedId : null;
}

/** Monta o spec de um perfil já resolvido como selecionável pelo usuário. */
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
 * O spec do perfil selecionado pelo usuário.
 *
 * `null` cobre de uma vez nunca ter escolhido e o escolhido ter deixado de ser
 * selecionável, porque a casca resolve os dois com a mesma ação: reabrir o
 * seletor.
 * @param scope - quem chama, vindo do token.
 * @returns o spec, ou `null` quando não há perfil selecionado.
 */
export async function readSelectedSpec(
  scope: ProfileScope,
): Promise<ProfileSpec | null> {
  const selectedId = await readSelectedProfileId(scope);

  return selectedId === null ? null : specFor(selectedId);
}

/**
 * Seleciona um perfil para o usuário.
 *
 * O perfil precisa ser selecionável por ele ({@link selectableWhere}); um
 * privado de outro dono, ou um inativo, responde como inexistente — não
 * confirmar a existência é a mesma regra dos screenshots do `prototype`.
 * @param scope - quem chama, vindo do token.
 * @param profileId - id já validado por {@link assertProfileId}.
 * @returns o spec do perfil que passou a valer.
 * @throws ProfileRequestError 404 quando o perfil não existe ou não é selecionável.
 */
export async function setSelectedProfile(
  scope: ProfileScope,
  profileId: string,
): Promise<ProfileSpec> {
  const selectable = await prisma.profile.findFirst({
    where: { id: profileId, ...selectableWhere(scope.userId) },
    select: { id: true },
  });

  if (selectable === null) {
    throw new ProfileRequestError("Perfil não encontrado.", 404);
  }

  await prisma.user.update({
    where: { id: scope.userId },
    data: { selectedProfileId: selectable.id },
  });

  const spec = await specFor(selectable.id);

  if (spec === null) {
    // Só alcançável se o perfil for apagado entre a checagem e a leitura.
    throw new ProfileRequestError("Perfil não encontrado.", 404);
  }

  return spec;
}

/** Verdadeiro para a violação de índice único do Prisma. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/**
 * As regras de um rascunho de perfil, em um lugar só.
 *
 * Puro e devolvendo erros por campo em vez de lançar: é a forma que o
 * formulário do painel precisa, e {@link assertProfileDraft} a converte na
 * forma que a API precisa. Duas telas, uma regra.
 * @param draft - o rascunho já normalizado.
 * @returns os erros por campo; vazio quando o rascunho passa.
 */
export function profileDraftErrors(
  draft: ProfileDraft,
): Partial<Record<ProfileDraftField, string>> {
  const errors: Partial<Record<ProfileDraftField, string>> = {};

  if (draft.name === "") {
    errors.name = "Informe o nome do perfil.";
  } else if (draft.name.length > MAX_PROFILE_NAME_LENGTH) {
    errors.name = `O nome passa de ${MAX_PROFILE_NAME_LENGTH} caracteres.`;
  }

  if ((draft.description ?? "").length > MAX_PROFILE_DESCRIPTION_LENGTH) {
    errors.description = `A descrição passa de ${MAX_PROFILE_DESCRIPTION_LENGTH} caracteres.`;
  }

  // Um id fora da lista é erro RUIDOSO, não silencioso: as duas telas só
  // oferecem estes ids, então um valor diferente significa corpo adulterado —
  // vale dizer isso em vez de gravar um nome que a casca ignoraria depois.
  const unknown = draft.plugins.filter((id) => !KNOWN_PLUGIN_IDS.has(id));

  if (unknown.length > 0) {
    errors.plugins = `Plugin desconhecido: ${unknown.join(", ")}.`;
  }

  return errors;
}

/** Lê uma lista de strings de um corpo JSON, sem duplicatas. */
function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}

/**
 * Valida um corpo de requisição como rascunho de perfil.
 *
 * A casca é código não confiável, então nada aqui confia no formato: campo com
 * o tipo errado é tratado como ausente e cai nas mesmas regras de
 * {@link profileDraftErrors}.
 * @param value - o corpo JSON recebido.
 * @returns o rascunho normalizado.
 * @throws ProfileRequestError 400 no primeiro campo inválido.
 */
export function assertProfileDraft(value: unknown): ProfileDraft {
  const body = (typeof value === "object" && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const draft: ProfileDraft = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    description: description === "" ? null : description,
    plugins: stringList(body.plugins).sort(),
    skillIds: stringList(body.skillIds),
    // Valor fora do enum cai no padrão, como os demais campos com tipo errado.
    visibility: body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    status: body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };

  const [failed] = Object.entries(profileDraftErrors(draft));

  if (failed !== undefined) {
    const [field, message] = failed;

    throw new ProfileRequestError(
      message ?? "Rascunho inválido.",
      400,
      field as ProfileDraftField,
    );
  }

  return draft;
}

/**
 * Cria um perfil para o dono do token.
 *
 * Sem guard de papel, como a action do painel: um perfil só ESTREITA o que a
 * biblioteca publicada já concede, então criar os próprios não concede nada — e
 * sob a regra de fechar-em-vazio, quem não pudesse criar um ficaria sem
 * biblioteca.
 *
 * A existência das skills é conferida, mas não `published`: um admin pode
 * despublicar algo temporariamente e a seleção deve sobreviver. Publicação é
 * exigida na LEITURA, num lugar só, que é o que mantém "um perfil só estreita".
 * @param scope - o dono, vindo do token.
 * @param draft - rascunho já validado por {@link assertProfileDraft}.
 * @returns o resumo do perfil criado, na forma que o seletor lista.
 * @throws ProfileRequestError 400 quando uma skill não existe ou o nome repete.
 */
export async function createProfile(
  scope: ProfileScope,
  draft: ProfileDraft,
): Promise<ProfileSummary> {
  if (draft.skillIds.length > 0) {
    const found = await prisma.librarySkill.count({
      where: { id: { in: draft.skillIds } },
    });

    if (found !== draft.skillIds.length) {
      throw new ProfileRequestError(
        "Uma das skills selecionadas não existe mais.",
        400,
        "skills",
      );
    }
  }

  let created: SummaryRow;

  try {
    created = await prisma.profile.create({
      data: {
        userId: scope.userId,
        name: draft.name,
        description: draft.description,
        plugins: draft.plugins,
        visibility: draft.visibility,
        status: draft.status,
        skills: { create: draft.skillIds.map((skillId) => ({ skillId })) },
      },
      select: SUMMARY_SELECT,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ProfileRequestError(
        `Você já tem um perfil chamado "${draft.name}".`,
        400,
        "name",
      );
    }

    throw error;
  }

  // Criar não seleciona: a casca pergunta qual perfil usar a cada login.
  return toSummary(created, scope);
}

/**
 * O que se pode marcar ao criar um perfil.
 *
 * Não depende do usuário: os plugins são a constante do build e as skills são a
 * biblioteca publicada, a mesma que o formulário do painel oferece. `published`
 * é o mesmo predicado da leitura, então a criação nunca oferece uma skill que o
 * catálogo depois recusaria a servir.
 * @returns o catálogo de plugins e skills.
 */
export async function readProfileCatalog(): Promise<ProfileCatalog> {
  const skills = await prisma.librarySkill.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return {
    plugins: KNOWN_PLUGINS.map((plugin) => ({
      id: plugin.id,
      label: plugin.label,
      hint: plugin.hint,
      plane: plugin.plane,
    })),
    skills,
  };
}
