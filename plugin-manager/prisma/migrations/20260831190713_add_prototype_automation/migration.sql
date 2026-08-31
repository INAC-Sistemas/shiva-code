-- CreateEnum
CREATE TYPE "PrototypeCommandStatus" AS ENUM ('PENDING', 'DELIVERED', 'DONE', 'EXPIRED');

-- CreateTable
CREATE TABLE "prototype_commands" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspace" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "status" "PrototypeCommandStatus" NOT NULL DEFAULT 'PENDING',
    "ok" BOOLEAN,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "prototype_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype_shots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prototype_shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype_console_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspace" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prototype_console_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prototype_commands_userId_workspace_status_idx" ON "prototype_commands"("userId", "workspace", "status");

-- CreateIndex
CREATE INDEX "prototype_commands_userId_workspace_createdAt_idx" ON "prototype_commands"("userId", "workspace", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prototype_shots_commandId_key" ON "prototype_shots"("commandId");

-- CreateIndex
CREATE INDEX "prototype_shots_userId_createdAt_idx" ON "prototype_shots"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "prototype_console_entries_userId_workspace_createdAt_idx" ON "prototype_console_entries"("userId", "workspace", "createdAt");

-- AddForeignKey
ALTER TABLE "prototype_shots" ADD CONSTRAINT "prototype_shots_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "prototype_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
