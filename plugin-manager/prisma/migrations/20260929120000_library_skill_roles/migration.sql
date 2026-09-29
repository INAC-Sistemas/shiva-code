-- Skills ganham os papéis de agente (pm, backend, frontend, tester) que as
-- recebem. As existentes ficam sem papel: continuam servidas a leituras sem
-- papel, como antes, e não alcançam nenhum agente de papel.

-- AlterTable
ALTER TABLE "library_skills" ADD COLUMN "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];
