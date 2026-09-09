import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import {
  ProfileRequestError,
  assertProfileId,
  setActiveProfile,
} from "@plugins/profile";

/**
 * POST /api/profiles/active
 * Header: Authorization: Bearer <token>
 * Body:   { profileId: "<uuid>" }
 * 200:    o spec do perfil que passou a valer (ver GET /api/plugins/profile)
 * 400:    corpo não-JSON, ou profileId fora do formato
 * 404:    perfil inexistente OU de outro dono — a mesma resposta, de propósito
 *
 * Trocar de perfil é uma escrita em `User.activeProfileId`, não a emissão de uma
 * credencial: o token não muda, e a requisição seguinte de qualquer dispositivo
 * já resolve o perfil novo. O `profileId` é o ÚNICO valor de perfil que chega do
 * cliente em toda a API, e é conferido contra o `userId` do token antes de
 * qualquer escrita — essa checagem é o portão em que a funcionalidade inteira se
 * apoia.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Corpo não é JSON válido." },
      { status: 400 },
    );
  }

  try {
    const spec = await setActiveProfile(
      { userId: auth.session.userId },
      assertProfileId(body.profileId),
    );

    return NextResponse.json(spec, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ProfileRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Falha ao trocar o perfil ativo:", error);

    return NextResponse.json(
      { error: "Não foi possível trocar o perfil." },
      { status: 500 },
    );
  }
}
