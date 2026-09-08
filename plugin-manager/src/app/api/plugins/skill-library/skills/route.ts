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
 * Continua sem ramificar por PAPEL: um admin e um guest com o mesmo perfil leem
 * a mesma coisa, e continua não havendo 403 aqui. Ramifica por PERFIL — a
 * resposta é a interseção entre o publicado e o selecionado no perfil ativo de
 * quem chama. Sem perfil ativo o catálogo vem vazio, não completo: se "sem
 * perfil" lesse tudo, bastaria uma casca nunca escolher perfil para o recorte
 * virar decorativo.
 *
 * `x-skill-library-profile` deixa o estado degradado legível: um cliente que
 * leia `none` sabe abrir o seletor em vez de mostrar uma lista vazia sem
 * explicação.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const { revision, skills, profileId } = await listSkills({
      userId: auth.session.userId,
    });

    return NextResponse.json(
      { revision, skills },
      {
        headers: {
          // O catálogo muda quando um admin publica, e o cliente decide sozinho
          // quando reler; um cache intermediário serviria uma biblioteca velha.
          "cache-control": "no-store",
          "x-skill-library-revision": String(revision),
          "x-skill-library-profile": profileId ?? "none",
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
