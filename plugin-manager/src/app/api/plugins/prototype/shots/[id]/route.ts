import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { readShot } from "@plugins/prototype";

/**
 * GET /api/plugins/prototype/shots/<id>
 * Header: Authorization: Bearer <token>
 * 200:    a imagem, com o `content-type` que ela foi gravada
 *
 * Só devolve captura do próprio usuário — um id de outra conta responde 404, e
 * não 403, para não confirmar que o id existe.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const shot = await readShot(auth.session.userId, id);

    if (!shot) {
      return NextResponse.json(
        { error: "Screenshot não encontrado." },
        { status: 404 },
      );
    }

    return new Response(shot.bytes, {
      headers: {
        "content-type": shot.mime,
        "content-length": String(shot.bytes.byteLength),
        // A imagem é imutável: o id nasce com os bytes e nunca é reescrito
        // sem que o comando que a originou seja reexecutado.
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Falha ao ler o screenshot do protótipo:", error);

    return NextResponse.json(
      { error: "Não foi possível ler o screenshot." },
      { status: 500 },
    );
  }
}
