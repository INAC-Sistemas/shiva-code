import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { listProfiles } from "@plugins/profile";

/**
 * GET /api/profiles
 * Header: Authorization: Bearer <token>
 * 200:    { profiles: [{id,name,description,pluginCount,skillCount,revision}], activeId }
 *
 * O que o seletor de perfil da casca lista. Fica fora de `/api/plugins/` porque
 * responde "para quais perfis este token pode trocar" — dado de conta, usável
 * antes de existir qualquer escopo de plugin, como `/api/users`.
 *
 * Divergência deliberada de `/api/users`: NÃO há ramo de admin. Um perfil é
 * escopo de execução, não listagem; deixar um admin listar os perfis alheios
 * aqui seria deixá-lo entrar neles pela casca. A supervisão é o painel.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const { profiles, activeId } = await listProfiles({
      userId: auth.session.userId,
    });

    return NextResponse.json(
      { profiles, activeId },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao listar os perfis:", error);

    return NextResponse.json(
      { error: "Não foi possível listar os perfis." },
      { status: 500 },
    );
  }
}
