import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getHostStatus } from "@plugins/host-info";

/**
 * GET /api/plugins/host-info
 * Header: Authorization: Bearer <token>
 * 200:    { disk: {totalBytes, usedBytes}, memory: {totalBytes, usedBytes} }
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await getHostStatus());
  } catch (error) {
    console.error("Falha ao ler o status do host:", error);

    return NextResponse.json(
      { error: "Não foi possível ler o status do host." },
      { status: 500 },
    );
  }
}
