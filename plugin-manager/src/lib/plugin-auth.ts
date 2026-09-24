import "server-only";
import { NextResponse } from "next/server";
import { type ApiAuthResult, authenticateRequest } from "@/lib/api-auth";
import { KNOWN_PLUGINS } from "@/lib/profiles";
import { readSelectedPlugins } from "@plugins/profile";

/** Código do 403 de um plugin fora do perfil selecionado; a casca o repassa ao modelo. */
export const PLUGIN_NOT_IN_PROFILE = "plugin-not-in-profile";

const pluginLabels = new Map<string, string>(
  KNOWN_PLUGINS.map((plugin) => [plugin.id, plugin.label]),
);

/**
 * Autentica uma chamada de plugin e exige o plugin no perfil selecionado.
 *
 * É a mesma regra da biblioteca de skills aplicada aos plugins: a casca decide
 * o que CARREGA, mas uma casca antiga — trocou de perfil sem reiniciar — ou
 * adulterada ainda chamaria a rota, e a inteligência mora aqui. Fora do perfil
 * responde 403 com `code: "plugin-not-in-profile"`, não 404: o agente precisa
 * dizer ao usuário que o perfil não contempla a ferramenta. Sem perfil
 * selecionado é o mesmo 403.
 *
 * Uso numa route handler:
 *   const auth = await authenticatePluginRequest(request, "dsh-vps-status");
 *   if (!auth.ok) return auth.response;
 * @param request - a requisição com `Authorization: Bearer <token>`.
 * @param pluginId - o id do plugin da casca que consome a rota (`KNOWN_PLUGINS`).
 * @returns a sessão autenticada, ou a resposta 401/403 a devolver.
 */
export async function authenticatePluginRequest(
  request: Request,
  pluginId: string,
): Promise<ApiAuthResult> {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth;

  const plugins = await readSelectedPlugins({ userId: auth.session.userId });

  if (plugins !== null && plugins.includes(pluginId)) return auth;

  const label = pluginLabels.get(pluginId) ?? pluginId;

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: `O perfil selecionado não contempla o plugin "${label}".`,
        code: PLUGIN_NOT_IN_PROFILE,
        plugin: pluginId,
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    ),
  };
}
