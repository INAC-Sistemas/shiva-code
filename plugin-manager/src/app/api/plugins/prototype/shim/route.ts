import { authenticateRequest } from "@/lib/api-auth";
import { SHIM_JS, SHIM_VERSION } from "@plugins/prototype/shim";

/**
 * GET /api/plugins/prototype/shim
 * Header: Authorization: Bearer <token>
 * 200:    o JavaScript do shim, com `x-shim-version`
 *
 * Quem busca é a casca, não a página: um `<script src>` não manda header de
 * autorização, e o iframe do protótipo precisa continuar same-origin. A casca
 * guarda o resultado em cache e o serve em `/prototype/shim.js`.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  return new Response(SHIM_JS, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "x-shim-version": SHIM_VERSION,
      "cache-control": "no-store",
    },
  });
}
