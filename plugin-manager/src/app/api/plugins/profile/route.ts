import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { readActiveSpec } from "@plugins/profile";

/**
 * GET /api/plugins/profile
 * Header: Authorization: Bearer <token>
 * 200:    { profile: {id,name,revision}, plugins: [...], skills: [...] }
 * 200:    { profile: null, plugins: [], skills: [] }  — sem perfil ativo
 *
 * O recorte que a casca materializa.
 *
 * A resposta carrega IDENTIFICADORES, nunca texto de composição: `cordis.yml`
 * interpreta `!!js` sob `config` e sob `disabled`, então YAML servido daqui seria
 * execução remota de código na máquina do usuário. A casca resolve estes nomes
 * contra a tabela de linhas do próprio build dela. Não acrescente um campo de
 * config repassado — é exatamente a falha que esta regra existe para impedir.
 *
 * Sem perfil ativo responde 200 com `profile: null`, e não 401/403: "nunca
 * escolheu" e "o ativo foi apagado" são um estado só, que a casca resolve com
 * uma ação só — reabrir o seletor. Um 401 deslogaria o usuário; um 403 diria que
 * ele está barrado.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    const spec = await readActiveSpec({ userId: auth.session.userId });
    const body = spec ?? { profile: null, plugins: [], skills: [] };

    return NextResponse.json(body, {
      headers: {
        "cache-control": "no-store",
        "x-profile-revision": String(spec?.profile.revision ?? 0),
      },
    });
  } catch (error) {
    console.error("Falha ao ler o perfil ativo:", error);

    return NextResponse.json(
      { error: "Não foi possível ler o perfil." },
      { status: 500 },
    );
  }
}
