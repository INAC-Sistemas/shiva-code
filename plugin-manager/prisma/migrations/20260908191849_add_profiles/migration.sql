-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeProfileId" TEXT;

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plugins" TEXT[],
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "profileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profileId","skillId")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_name_key" ON "profiles"("userId", "name");

-- CreateIndex
CREATE INDEX "profile_skills_skillId_idx" ON "profile_skills"("skillId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "library_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeProfileId_fkey" FOREIGN KEY ("activeProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: um perfil "Padrão" por usuário existente, com toda a biblioteca
-- publicada, já ativo.
--
-- Escrito à mão, e não deixado para o seed: a leitura da biblioteca passa a ser
-- a interseção com o perfil ativo, então sem este bloco todo usuário anterior a
-- esta migration ficaria com o catálogo vazio até alguém abrir o painel. É
-- também o único momento em que "todo usuário existente" é um conjunto bem
-- definido.
INSERT INTO "profiles" ("id", "userId", "name", "description", "plugins", "revision", "createdAt", "updatedAt")
SELECT gen_random_uuid(), u."id", 'Padrão', NULL,
       ARRAY['dsh-skill-library','dsh-vps-status','dsh-mds','dsh-prototype']::text[],
       1, now(), now()
FROM "users" u;

INSERT INTO "profile_skills" ("profileId", "skillId", "createdAt")
SELECT p."id", s."id", now()
FROM "profiles" p
CROSS JOIN "library_skills" s
WHERE s."published";

UPDATE "users" u
SET "activeProfileId" = p."id"
FROM "profiles" p
WHERE p."userId" = u."id";
