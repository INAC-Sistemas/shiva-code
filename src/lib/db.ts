import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 exige um driver adapter explícito.
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Em dev o hot reload recria os módulos a cada alteração; guardar a instância
// no globalThis evita esgotar o pool de conexões do Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
