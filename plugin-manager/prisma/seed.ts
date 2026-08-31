import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { parseSkillFile } from "../src/lib/skill-frontmatter";

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

/** Bundles `<nome>/SKILL.md` que semeiam a biblioteca na primeira execução. */
const skillsDir = join(dirname(fileURLToPath(import.meta.url)), "skills");

/**
 * Semeia a biblioteca de skills a partir dos SKILL.md versionados.
 *
 * Cria e nunca atualiza, ao contrário do seed de usuários. O seed roda a cada
 * start do container, então um update reverteria em silêncio toda edição feita
 * no painel: depois da primeira execução o Postgres é a fonte da verdade e
 * estes arquivos são só o conteúdo inicial. `--force-skills` sobrescreve, e é
 * um gesto explícito justamente porque descarta o que está gravado.
 */
async function seedSkills(force: boolean) {
  let entries;

  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    console.log("seed: prisma/skills ausente, nenhuma skill semeada");
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const path = join(skillsDir, entry.name, "SKILL.md");
    let parsed;

    try {
      parsed = parseSkillFile(await readFile(path, "utf8"));
    } catch (error) {
      // Um arquivo quebrado é erro de quem o versionou, não motivo para o seed
      // inteiro falhar e deixar o container sem usuários.
      console.error(
        `seed: ${entry.name}/SKILL.md ignorado — ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    if (parsed.name !== entry.name) {
      console.error(
        `seed: ${entry.name}/SKILL.md declara name "${parsed.name}"; renomeie a pasta ou o campo`,
      );
      continue;
    }

    const saved = await prisma.librarySkill.upsert({
      where: { name: parsed.name },
      update: force ? { ...parsed, revision: { increment: 1 } } : {},
      create: parsed,
    });

    console.log(`seed: skill ${saved.name} (rev ${saved.revision})`);
  }
}

async function main() {
  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);

    // upsert deixa o seed idempotente: pode rodar a cada start do container
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, password, role: user.role },
      create: { name: user.name, email: user.email, password, role: user.role },
    });

    console.log(`seed: ${saved.email} (${saved.role})`);
  }

  await seedSkills(process.argv.includes("--force-skills"));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
