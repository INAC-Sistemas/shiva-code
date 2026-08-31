import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
