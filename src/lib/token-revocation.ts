import "server-only";
import { prisma } from "@/lib/db";

/**
 * Revogação de tokens de API.
 *
 * Como o token é um JWT (nada é guardado na emissão), o logout precisa
 * registrar o `jti` numa lista de bloqueio consultada a cada requisição.
 * A lista só precisa guardar o token até ele expirar sozinho.
 */

export async function revokeApiToken(params: {
  jti: string;
  userId: string;
  expiresAt: Date;
}) {
  // upsert em vez de create: chamar logout duas vezes com o mesmo token não é erro.
  await prisma.revokedApiToken.upsert({
    where: { jti: params.jti },
    update: {},
    create: params,
  });

  // Faxina oportunista: tokens já expirados não precisam continuar na lista,
  // porque a própria validação do JWT já os rejeita.
  await prisma.revokedApiToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function isApiTokenRevoked(jti: string) {
  const revoked = await prisma.revokedApiToken.findUnique({
    where: { jti },
    select: { jti: true },
  });

  return revoked !== null;
}
