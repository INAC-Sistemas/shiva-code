import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import {
  ProfileRequestError,
  assertProfileDraft,
  createProfile,
  listProfiles,
} from "@plugins/profile";

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

/**
 * POST /api/profiles
 * Header: Authorization: Bearer <token>
 * Body:   { name, description?, plugins: string[], skillIds: string[] }
 * 201:    { profile: {id,name,description,pluginCount,skillCount,revision} }
 * 400:    corpo não-JSON, campo inválido, skill inexistente, ou nome repetido
 *
 * Criar pela casca, e não só pelo painel, é o que faz o seletor de perfil ser
 * suficiente: quem nunca abriu o painel não fica preso na tela vazia.
 *
 * O dono NÃO vem do corpo — vem do token, como em todo o resto deste módulo —,
 * então não há aqui a superfície de "criar um perfil no nome de outro". As
 * regras do rascunho são as mesmas do formulário do painel; o `field` do erro
 * diz qual campo falhou, mas a resposta continua sendo uma mensagem só.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo não é JSON válido." },
      { status: 400 },
    );
  }

  try {
    const profile = await createProfile(
      { userId: auth.session.userId },
      assertProfileDraft(body),
    );

    return NextResponse.json(
      { profile },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ProfileRequestError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: error.status },
      );
    }

    console.error("Falha ao criar o perfil:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o perfil." },
      { status: 500 },
    );
  }
}
