import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { readProfileCatalog } from "@plugins/profile";

/**
 * GET /api/profiles/catalog
 * Header: Authorization: Bearer <token>
 * 200:    { plugins: [{id,label,hint,plane}], skills: [{id,name,description}] }
 *
 * O que o formulário de criação da casca oferece para marcar. Fica ao lado de
 * `/api/profiles`, e não em `/api/plugins/`, porque é dado de conta: serve para
 * AUTORAR um perfil, antes de existir qualquer escopo de plugin.
 *
 * Não ramifica por perfil, ao contrário de
 * `/api/plugins/skill-library/skills`: aquele responde "o que o perfil ativo
 * concede ao modelo", este responde "o que existe para escolher". Filtrar aqui
 * pelo perfil ativo tornaria impossível montar o primeiro perfil.
 *
 * Ramifica por `published`, que é o mesmo predicado da leitura — assim a
 * criação nunca oferece uma skill que `/skills/<name>` responderia 404.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const catalog = await readProfileCatalog();

    return NextResponse.json(catalog, {
      // Muda quando um admin publica; um cache intermediário ofereceria uma
      // biblioteca velha para marcar.
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Falha ao listar o catálogo de perfis:", error);

    return NextResponse.json(
      { error: "Não foi possível listar o catálogo." },
      { status: 500 },
    );
  }
}
