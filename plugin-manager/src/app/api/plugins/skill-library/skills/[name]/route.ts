import { NextResponse } from "next/server";
import { authenticatePluginRequest } from "@/lib/plugin-auth";
import {
  SkillLibraryRequestError,
  assertSkillName,
  readSkill,
} from "@plugins/skill-library";

/**
 * GET /api/plugins/skill-library/skills/<name>
 * Header: Authorization: Bearer <token>
 * 403:    { error, code: "plugin-not-in-profile", plugin } — o perfil
 *         selecionado não inclui `dsh-skill-library`
 * 200:    { name, description, whenToUse?, invocation, revision, content }
 * 403:    { error, code: "skill-not-in-profile" } — publicada, mas fora do
 *         perfil selecionado (ou nenhum perfil selecionado)
 * 404:    inexistente ou despublicada
 *
 * O corpo da skill. É a única rota que o serve, e ela exige um token válido a
 * cada chamada — é aqui que "só quem está logado usa" para de ser uma promessa
 * da interface e vira uma verificação.
 *
 * Fora do perfil é acesso negado, não ausência: a casca repassa o `code` ao
 * modelo, que diz ao usuário que o perfil não contempla a skill. Despublicada e
 * inexistente respondem 404 igual.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const auth = await authenticatePluginRequest(request, "dsh-skill-library");

  if (!auth.ok) return auth.response;

  try {
    const name = assertSkillName((await context.params).name);
    const read = await readSkill({ userId: auth.session.userId }, name);

    switch (read.kind) {
      case "found":
        return NextResponse.json(read.skill, {
          headers: {
            "cache-control": "no-store",
            "x-skill-library-revision": String(read.skill.revision),
          },
        });
      case "not-in-profile":
        return NextResponse.json(
          {
            error: `O perfil selecionado não contempla a skill "${name}".`,
            code: "skill-not-in-profile",
          },
          { status: 403 },
        );
      case "not-found":
        return NextResponse.json(
          { error: "Skill não encontrada." },
          { status: 404 },
        );
    }
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
