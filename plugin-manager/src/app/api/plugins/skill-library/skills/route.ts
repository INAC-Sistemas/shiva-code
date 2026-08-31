import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { listSkills } from "@plugins/skill-library";

/**
 * GET /api/plugins/skill-library/skills
 * Header: Authorization: Bearer <token>
 * 200:    { revision, skills: [{ name, description, whenToUse?, invocation, revision }] }
 *
 * O catálogo, sem corpo — o corpo sai por `/skills/<name>`.
 *
 * Não há ramificação por papel: toda sessão autenticada lê a mesma biblioteca,
 * e é isso que faz uma skill publicada no painel valer para todo mundo. Um
 * `403` aqui seria uma regra nova, não um refinamento.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const { revision, skills } = await listSkills();

    return NextResponse.json(
      { revision, skills },
      {
        headers: {
          // O catálogo muda quando um admin publica, e o cliente decide sozinho
          // quando reler; um cache intermediário serviria uma biblioteca velha.
          "cache-control": "no-store",
          "x-skill-library-revision": String(revision),
        },
      },
    );
  } catch (error) {
    console.error("Falha ao listar a biblioteca de skills:", error);

    return NextResponse.json(
      { error: "Não foi possível listar as skills." },
      { status: 500 },
    );
  }
}
