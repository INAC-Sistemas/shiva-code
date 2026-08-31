-- CreateTable
CREATE TABLE "library_skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whenToUse" TEXT,
    "content" TEXT NOT NULL,
    "modelInvocable" BOOLEAN NOT NULL DEFAULT true,
    "userInvocable" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_skills_name_key" ON "library_skills"("name");

-- CreateIndex
CREATE INDEX "library_skills_published_name_idx" ON "library_skills"("published", "name");
