-- Perfis ganham visibilidade (privado/público) e estado (ativo/inativo); a
-- escolha do usuário passa de "perfil ativo" a "perfil selecionado".

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable: os perfis existentes ficam privados e ativos, como já se comportavam.
ALTER TABLE "profiles" ADD COLUMN "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "profiles_visibility_status_idx" ON "profiles"("visibility", "status");

-- Rename, não drop/add: as seleções atuais sobrevivem.
ALTER TABLE "users" RENAME COLUMN "activeProfileId" TO "selectedProfileId";
ALTER TABLE "users" RENAME CONSTRAINT "users_activeProfileId_fkey" TO "users_selectedProfileId_fkey";
