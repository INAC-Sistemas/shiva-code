import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import {
  parseSkillFile,
  type ParsedSkillFile,
} from "../src/lib/skill-frontmatter";
import {
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_PLUGINS,
} from "../src/lib/profiles";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const users = [
  {
    name: "admin",
    email: "admin@inacsistemas.com",
    password: "inac1255",
    role: Role.ADMIN,
  },
  // Usuários de exemplo apenas para a listagem exibir os dois papéis.
  // Remova este bloco se não quiser dados de demonstração.
  {
    name: "Maria Souza",
    email: "maria@inacsistemas.com",
    password: "guest1234",
    role: Role.GUEST,
  },
  {
    name: "João Lima",
    email: "joao@inacsistemas.com",
    password: "guest1234",
    role: Role.GUEST,
  },
];

/**
 * Bundles `<categoria>/<nome>/SKILL.md` que recriam a biblioteca a cada deploy.
 * Uma pasta de primeiro nível que já contém `SKILL.md` é lida como skill sem
 * categoria.
 */
const skillsDir = join(dirname(fileURLToPath(import.meta.url)), "skills");

/** Um bundle encontrado em `prisma/skills/`, com o caminho relativo para logs. */
type SkillBundle = { name: string; path: string; label: string };

/**
 * Lista os bundles em `prisma/skills/`, descendo um nível nas pastas de categoria.
 * @returns os bundles na ordem do disco; vazio quando a pasta não existe.
 */
async function listSkillBundles(): Promise<SkillBundle[]> {
  let entries;

  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    console.log("seed: prisma/skills ausente, nenhuma skill semeada");
    return [];
  }

  const bundles: SkillBundle[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const dir = join(skillsDir, entry.name);
    const children = await readdir(dir, { withFileTypes: true });

    if (children.some((child) => child.isFile() && child.name === "SKILL.md")) {
      bundles.push({
        name: entry.name,
        path: join(dir, "SKILL.md"),
        label: `${entry.name}/SKILL.md`,
      });
      continue;
    }

    for (const child of children) {
      if (!child.isDirectory() || child.name.startsWith(".")) continue;
      bundles.push({
        name: child.name,
        path: join(dir, child.name, "SKILL.md"),
        label: `${entry.name}/${child.name}/SKILL.md`,
      });
    }
  }

  return bundles;
}

/** Campos que o seed grava a partir do arquivo versionado. */
type SeededSkillFields = ParsedSkillFile & { published: true };

/**
 * Contas de demonstração com senha no código só existem fora de produção.
 *
 * `SEED_USERS=false` recusa mesmo em development; `SEED_USERS=true` força
 * mesmo em production — os dois são escapes explícitos, não o caminho normal.
 */
function shouldSeedUsers(): boolean {
  if (process.env.SEED_USERS === "false") return false;
  if (process.env.SEED_USERS === "true") return true;

  return process.env.NODE_ENV !== "production";
}

function seededFields(parsed: ParsedSkillFile): SeededSkillFields {
  return { ...parsed, published: true };
}

function skillFieldsChanged(
  existing: {
    description: string;
    whenToUse: string | null;
    content: string;
    modelInvocable: boolean;
    userInvocable: boolean;
    published: boolean;
  },
  next: SeededSkillFields,
): boolean {
  return (
    existing.description !== next.description ||
    existing.whenToUse !== next.whenToUse ||
    existing.content !== next.content ||
    existing.modelInvocable !== next.modelInvocable ||
    existing.userInvocable !== next.userInvocable ||
    existing.published !== next.published
  );
}

/**
 * Recria a biblioteca a partir dos SKILL.md versionados.
 *
 * Os arquivos em `prisma/skills/` são a fonte da verdade em todo deploy: o
 * seed atualiza o corpo, republica e incrementa `revision` quando o arquivo
 * mudou. O id da linha permanece, então as seleções em `ProfileSkill` sobrevivem.
 * Skills criadas só no painel, cujo nome não tem pasta aqui, ficam intocadas.
 *
 * Uma skill nova entra no perfil "Padrão" de quem já o tem, para seguir o
 * recorte por perfil ativo: o corpo só é servido quando a skill está nesse
 * recorte. Perfis com outro nome não ganham a linha sozinhos.
 * @returns os ids das skills que este start criou (não as que só atualizou).
 */
async function seedSkills(): Promise<string[]> {
  const createdIds: string[] = [];
  // `name` é único na biblioteca; duas categorias com a mesma pasta fariam uma
  // sobrescrever a outra a cada deploy.
  const seen = new Map<string, string>();

  for (const bundle of await listSkillBundles()) {
    let parsed;

    try {
      parsed = parseSkillFile(await readFile(bundle.path, "utf8"));
    } catch (error) {
      // Um arquivo quebrado é erro de quem o versionou, não motivo para o seed
      // inteiro falhar e deixar o container sem usuários.
      console.error(
        `seed: ${bundle.label} ignorado — ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    if (parsed.name !== bundle.name) {
      console.error(
        `seed: ${bundle.label} declara name "${parsed.name}"; renomeie a pasta ou o campo`,
      );
      continue;
    }

    const previous = seen.get(parsed.name);

    if (previous !== undefined) {
      console.error(
        `seed: ${bundle.label} repete a skill "${parsed.name}" de ${previous}; ignorado`,
      );
      continue;
    }

    seen.set(parsed.name, bundle.label);

    const fields = seededFields(parsed);
    const existing = await prisma.librarySkill.findUnique({
      where: { name: parsed.name },
      select: {
        id: true,
        description: true,
        whenToUse: true,
        content: true,
        modelInvocable: true,
        userInvocable: true,
        published: true,
        revision: true,
      },
    });

    if (existing === null) {
      const saved = await prisma.librarySkill.create({ data: fields });
      createdIds.push(saved.id);
      console.log(`seed: skill ${saved.name} criada (rev ${saved.revision})`);
      continue;
    }

    if (!skillFieldsChanged(existing, fields)) {
      console.log(
        `seed: skill ${parsed.name} inalterada (rev ${existing.revision})`,
      );
      continue;
    }

    const saved = await prisma.librarySkill.update({
      where: { id: existing.id },
      data: { ...fields, revision: { increment: 1 } },
    });

    console.log(`seed: skill ${saved.name} recriada (rev ${saved.revision})`);
  }

  return createdIds;
}

/**
 * Coloca skills recém-criadas no perfil "Padrão" de cada usuário que já o tem.
 *
 * Sem isto, um deploy que adiciona uma pasta em `prisma/skills/` deixa a linha
 * na biblioteca e fora de todo perfil existente — e a API não serve o corpo
 * até alguém marcar a skill à mão. Perfis com outro nome são recortes
 * deliberados e não recebem a linha.
 * @param skillIds - ids devolvidos por {@link seedSkills} neste start.
 */
async function attachNewSkillsToDefaultProfiles(
  skillIds: readonly string[],
): Promise<void> {
  if (skillIds.length === 0) return;

  const profiles = await prisma.profile.findMany({
    where: { name: DEFAULT_PROFILE_NAME },
    select: { id: true },
  });

  for (const profile of profiles) {
    const added = await prisma.profileSkill.createMany({
      data: skillIds.map((skillId) => ({ profileId: profile.id, skillId })),
      skipDuplicates: true,
    });

    if (added.count === 0) continue;

    await prisma.profile.update({
      where: { id: profile.id },
      data: { revision: { increment: 1 } },
    });

    console.log(
      `seed: ${added.count} skill(s) novas no perfil ${DEFAULT_PROFILE_NAME} ${profile.id}`,
    );
  }
}

/**
 * Dá ao usuário um perfil "Padrão" privado e ativo, com toda a biblioteca
 * publicada, e o deixa selecionado.
 *
 * Cria e nunca atualiza: o seed roda a cada start do container, e sobrescrever
 * apagaria toda edição de perfil feita no painel. Só age quando o usuário não
 * tem perfil nenhum — ficar sem perfil é ficar sem biblioteca, então esse é o
 * estado que vale corrigir sozinho.
 *
 * Surpresa conhecida: quem apagar deliberadamente TODOS os próprios perfis
 * ganha um de volta no próximo restart do container. Ficar preso sem nenhum é
 * pior.
 * @param userId - dono do perfil.
 */
async function seedDefaultProfile(userId: string) {
  if ((await prisma.profile.count({ where: { userId } })) > 0) return;

  const published = await prisma.librarySkill.findMany({
    where: { published: true },
    select: { id: true },
  });

  const profile = await prisma.profile.create({
    data: {
      userId,
      name: DEFAULT_PROFILE_NAME,
      plugins: [...DEFAULT_PROFILE_PLUGINS],
      skills: { create: published.map(({ id }) => ({ skillId: id })) },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { selectedProfileId: profile.id },
  });

  console.log(
    `seed: perfil ${profile.name} (${published.length} skills) ativo para ${userId}`,
  );
}

async function seedDemoUsers(): Promise<void> {
  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);

    // upsert deixa o seed de usuários idempotente: pode rodar a cada start
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, password, role: user.role },
      create: { name: user.name, email: user.email, password, role: user.role },
    });

    console.log(`seed: ${saved.email} (${saved.role})`);

    await seedDefaultProfile(saved.id);
  }
}

async function main() {
  // Antes do laço de usuários: o perfil padrão seleciona as skills publicadas,
  // então elas precisam existir quando ele é criado.
  const createdSkillIds = await seedSkills();
  await attachNewSkillsToDefaultProfiles(createdSkillIds);

  if (!shouldSeedUsers()) {
    console.log("seed: usuários de demonstração omitidos (produção)");
    return;
  }

  await seedDemoUsers();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
