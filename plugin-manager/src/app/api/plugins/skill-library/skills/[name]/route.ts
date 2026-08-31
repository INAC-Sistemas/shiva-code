import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import {
  SkillLibraryRequestError,
  assertSkillName,
  readSkill,
} from "@plugins/skill-library";

/**
 * GET /api/plugins/skill-library/skills/<name>
 * Header: Authorization: Bearer <token>
 * 200:    { name, description, whenToUse?, invocation, revision, content }
 *
 * O corpo da skill. É a única rota que o serve, e ela exige um token válido a
 * cada chamada — é aqui que "só quem está logado usa" para de ser uma promessa
 * da interface e vira uma verificação.
 *
 * Uma skill despublicada responde 404, igual a uma que não existe.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const name = assertSkillName((await context.params).name);
    const skill = await readSkill(name);

    if (!skill) {
      return NextResponse.json(
        { error: "Skill não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(skill, {
      headers: {
        "cache-control": "no-store",
        "x-skill-library-revision": String(skill.revision),
      },
    });
  } catch (error) {
    if (error instanceof SkillLibraryRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Falha ao ler a skill da biblioteca:", error);

    return NextResponse.json(
      { error: "Não foi possível ler a skill." },
      { status: 500 },
    );
  }
}
