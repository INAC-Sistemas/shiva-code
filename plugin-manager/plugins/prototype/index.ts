// Inteligência do plugin `prototype`: a fila de automação, o anel de console e
// o armazenamento dos screenshots.
//
// A casca (`dsh-prototype`) continua dona do que é local e intransferível — o
// servidor de arquivos da pasta `prototype/`, o iframe same-origin, o
// `getDisplayMedia` e o `open` no editor. O que subiu para cá é o estado que
// coordena o agente e a aba: antes vivia em memória do processo do cliente,
// morria a cada restart, cabia num anel de 50 resultados e só funcionava com
// agente e navegador na mesma máquina.
//
// Todo acesso é filtrado por `userId`: a casca é código não confiável, então
// nenhuma consulta aqui aceita o dono vindo do corpo da requisição.

import "server-only";
import { prisma } from "@/lib/db";
import type { PrototypeCommandStatus } from "@/generated/prisma/enums";

/** Prazo entre criar e resolver um comando. Passou disso, vira `EXPIRED`. */
export const COMMAND_TTL_MS = 12_000;

/** Teto do long-poll de `wait`, e portanto do tempo que a casca fica pendurada. */
export const WAIT_MAX_MS = 10_000;

/** Intervalo entre releituras do resultado durante o long-poll. */
const WAIT_POLL_MS = 250;

/** Linhas de console mantidas por (usuário, workspace). */
export const CONSOLE_LIMIT = 200;

/** Resultados devolvidos por `results`, do mais recente para o mais antigo. */
export const RESULTS_LIMIT = 50;

/** Teto de um screenshot. Uma captura de tela cheia em PNG cabe folgada. */
export const MAX_SHOT_BYTES = 8 * 1024 * 1024;

/** Token de workspace que a casca calcula: `sha256(caminho).slice(0, 16)`. */
const WORKSPACE_RE = /^[0-9a-f]{16}$/;

/** Ops que a aba sabe executar. Um `op` fora desta lista nunca chega ao browser. */
const KNOWN_OPS = new Set([
  "navigate",
  "screenshot",
  "click",
  "fill",
  "read",
  "eval",
  "wait_for",
  "console_dump",
]);

/** Quem está chamando e sobre qual protótipo. O `userId` vem sempre do token. */
export type Scope = {
  userId: string;
  workspace: string;
};

/** Comando submetido pelo agente: `op` mais os argumentos daquela op. */
export type CommandInput = {
  op: string;
  [key: string]: unknown;
};

/** Resultado de um comando, como a casca e o agente o leem. */
export type CommandResult = {
  ok: boolean;
  data: unknown;
  error: string | null;
  at: string;
};

/** Erro de argumento vindo da casca. A rota o traduz em 400 ou 409. */
export class PrototypeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PrototypeRequestError";
  }
}

/**
 * Valida o token de workspace. Ele indexa e isola todas as consultas, então um
 * valor fora do formato é recusado antes de virar chave de busca.
 */
export function assertWorkspace(value: unknown): string {
  if (typeof value !== "string" || !WORKSPACE_RE.test(value)) {
    throw new PrototypeRequestError(
      "workspace deve ser o token de 16 hex que a casca calcula",
      400,
    );
  }

  return value;
}

/** Status de um comando que ainda pode receber resultado. */
const LIVE: PrototypeCommandStatus[] = ["PENDING", "DELIVERED"];

/**
 * Marca como `EXPIRED` os comandos vivos que estouraram o TTL.
 *
 * Não há cron: a expiração é preguiçosa e roda antes de toda leitura que
 * depende dela, que é o que garante que um comando abandonado pela aba (janela
 * fechada no meio) não bloqueie a fila para sempre.
 */
async function expireStale(scope: Scope): Promise<void> {
  await prisma.prototypeCommand.updateMany({
    where: {
      userId: scope.userId,
      workspace: scope.workspace,
      status: { in: LIVE },
      createdAt: { lt: new Date(Date.now() - COMMAND_TTL_MS) },
    },
    data: {
      status: "EXPIRED",
      ok: false,
      error: "command expired before execution",
      settledAt: new Date(),
    },
  });
}

/**
 * Enfileira um comando. Um por vez, por (usuário, workspace) — a sequência do
 * agente é submit → wait → próximo, e duas ops em voo na mesma página fariam a
 * segunda agir sobre o estado que a primeira ainda está mudando.
 * @throws PrototypeRequestError 400 op inválida, 409 já há um comando em voo.
 */
export async function submitCommand(
  scope: Scope,
  cmd: unknown,
): Promise<{ id: string }> {
  if (!cmd || typeof cmd !== "object") {
    throw new PrototypeRequestError("cmd é obrigatório", 400);
  }

  const { op, ...args } = cmd as CommandInput;

  if (typeof op !== "string" || !KNOWN_OPS.has(op)) {
    throw new PrototypeRequestError(
      `op desconhecida: ${JSON.stringify(op)}. Conhecidas: ${[...KNOWN_OPS].join(", ")}`,
      400,
    );
  }

  await expireStale(scope);

  const inFlight = await prisma.prototypeCommand.findFirst({
    where: {
      userId: scope.userId,
      workspace: scope.workspace,
      status: { in: LIVE },
    },
    select: { id: true },
  });

  if (inFlight) {
    throw new PrototypeRequestError("a command is already in flight", 409);
  }

  const created = await prisma.prototypeCommand.create({
    data: {
      userId: scope.userId,
      workspace: scope.workspace,
      op,
      args: args as object,
    },
    select: { id: true },
  });

  return { id: created.id };
}

/**
 * Entrega o próximo comando à aba, no formato que o shim espera
 * (`{id, op, ...args}`), e o marca como entregue para não sair duas vezes.
 * @returns o comando, ou `null` quando não há nada pendente.
 */
export async function takePendingCommand(
  scope: Scope,
): Promise<({ id: string; op: string } & Record<string, unknown>) | null> {
  await expireStale(scope);

  const next = await prisma.prototypeCommand.findFirst({
    where: {
      userId: scope.userId,
      workspace: scope.workspace,
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!next) return null;

  // `count` em vez de update direto: duas abas do mesmo workspace fazem polling
  // em paralelo, e só a que conseguir virar PENDING→DELIVERED leva o comando.
  const claimed = await prisma.prototypeCommand.updateMany({
    where: { id: next.id, status: "PENDING" },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  if (claimed.count === 0) return null;

  return {
    id: next.id,
    op: next.op,
    ...(next.args as Record<string, unknown>),
  };
}

/** Uma imagem gravada: os bytes e o tipo com que ela volta na resposta. */
export type ShotBytes = {
  mime: string;
  /**
   * `Uint8Array<ArrayBuffer>`, e não `Buffer`: é o que a coluna `Bytes` do
   * Prisma aceita e o que `Response` reconhece como corpo. Um `Buffer` fica
   * sobre `ArrayBufferLike`, que inclui `SharedArrayBuffer` e não serve nos dois.
   */
  bytes: Uint8Array<ArrayBuffer>;
};

/** Um `data:` URL de imagem, decodificado. */
function decodeImageDataUrl(dataUrl: string): ShotBytes | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUrl);

  if (!match) return null;

  const decoded = Buffer.from(dataUrl.slice(match[0].length), "base64");
  const bytes = new Uint8Array(decoded.byteLength);

  bytes.set(decoded);

  if (bytes.byteLength === 0) return null;

  if (bytes.byteLength > MAX_SHOT_BYTES) {
    throw new PrototypeRequestError(
      `screenshot acima de ${MAX_SHOT_BYTES} bytes`,
      413,
    );
  }

  return { mime: match[1].toLowerCase(), bytes };
}

/**
 * Grava o resultado que a aba produziu.
 *
 * Um screenshot chega como `data:` URL; ele sai do resultado e vira linha em
 * `prototype_shots`, com `data.shot` apontando para a rota que serve a imagem.
 * Guardar o base64 no JSON do comando inflaria toda leitura da fila com
 * megabytes que ninguém lê ali.
 * @throws PrototypeRequestError 404 quando o comando não é do usuário ou não existe.
 */
export async function settleCommand(
  scope: Scope,
  input: { id: string; ok: boolean; data?: unknown; error?: string | null },
): Promise<void> {
  const command = await prisma.prototypeCommand.findFirst({
    where: { id: input.id, userId: scope.userId },
    select: { id: true, status: true },
  });

  if (!command) {
    throw new PrototypeRequestError("comando não encontrado", 404);
  }

  let data = input.data ?? null;
  let shotBytes: ShotBytes | null = null;

  const dataUrl =
    data && typeof data === "object" && "dataUrl" in data
      ? (data as { dataUrl: unknown }).dataUrl
      : null;

  if (input.ok && typeof dataUrl === "string") {
    shotBytes = decodeImageDataUrl(dataUrl);

    if (shotBytes) {
      // O base64 sai do resultado: ele já virou linha em `prototype_shots`, e
      // deixá-lo aqui colocaria a imagem inteira em toda leitura da fila.
      const rest = { ...(data as Record<string, unknown>) };

      delete rest.dataUrl;

      const shot = await prisma.prototypeShot.upsert({
        where: { commandId: command.id },
        update: { mime: shotBytes.mime, bytes: shotBytes.bytes },
        create: {
          commandId: command.id,
          userId: scope.userId,
          mime: shotBytes.mime,
          bytes: shotBytes.bytes,
        },
        select: { id: true },
      });

      data = {
        ...rest,
        shot: { id: shot.id, url: shotUrl(shot.id), mime: shotBytes.mime },
      };
    }
  }

  await prisma.prototypeCommand.update({
    where: { id: command.id },
    data: {
      status: "DONE",
      ok: input.ok,
      result: data as object,
      error: input.error ?? null,
      settledAt: new Date(),
    },
  });
}

/** Caminho público de um screenshot. Relativo: o host depende do deploy. */
export function shotUrl(shotId: string): string {
  return `/api/plugins/prototype/shots/${shotId}`;
}

/** O resultado já gravado de um comando, ou `null` se ele ainda está em voo. */
async function readResult(
  scope: Scope,
  id: string,
): Promise<CommandResult | null> {
  const command = await prisma.prototypeCommand.findFirst({
    where: { id, userId: scope.userId },
    select: {
      status: true,
      ok: true,
      result: true,
      error: true,
      settledAt: true,
      createdAt: true,
    },
  });

  if (!command) {
    throw new PrototypeRequestError("comando não encontrado", 404);
  }

  if (command.status !== "DONE" && command.status !== "EXPIRED") return null;

  return {
    ok: command.ok ?? false,
    data: command.result ?? null,
    error: command.error,
    at: (command.settledAt ?? command.createdAt).toISOString(),
  };
}

/**
 * Espera o resultado de um comando, até `timeoutMs` (teto `WAIT_MAX_MS`).
 *
 * É long-poll com releitura a cada `WAIT_POLL_MS`, e não LISTEN/NOTIFY: um
 * comando resolve em segundos e acontece um de cada vez por workspace, então o
 * custo é dezenas de leituras indexadas por comando.
 * @returns o resultado, ou `null` no estouro do prazo.
 */
export async function waitForResult(
  scope: Scope,
  id: string,
  timeoutMs?: number,
): Promise<CommandResult | null> {
  const deadline =
    Date.now() + Math.min(Number(timeoutMs) || WAIT_MAX_MS, WAIT_MAX_MS);

  for (;;) {
    await expireStale(scope);

    const result = await readResult(scope, id);

    if (result) return result;

    if (Date.now() >= deadline) return null;

    await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_MS));
  }
}

/** Histórico recente de comandos resolvidos, do mais novo para o mais antigo. */
export async function listResults(
  scope: Scope,
): Promise<Array<CommandResult & { id: string; op: string }>> {
  await expireStale(scope);

  const rows = await prisma.prototypeCommand.findMany({
    where: {
      userId: scope.userId,
      workspace: scope.workspace,
      status: { in: ["DONE", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    take: RESULTS_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    op: row.op,
    ok: row.ok ?? false,
    data: row.result ?? null,
    error: row.error,
    at: (row.settledAt ?? row.createdAt).toISOString(),
  }));
}

/** Uma linha de console capturada dentro do protótipo. */
export type ConsoleEntry = {
  level: string;
  text: string;
  time: string;
};

/** Teto por linha: um stack trace inteiro cabe, um dump de JSON gigante não. */
const MAX_CONSOLE_TEXT = 4_000;

/**
 * Grava linhas de console e poda o excedente do anel.
 *
 * A poda é por (usuário, workspace) e roda na escrita porque é o único momento
 * em que a tabela cresce; sem ela um protótipo em laço de erro encheria o banco.
 */
export async function pushConsole(
  scope: Scope,
  entries: unknown,
): Promise<void> {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const rows = entries.slice(-CONSOLE_LIMIT).map((entry) => {
    const value = (entry ?? {}) as Record<string, unknown>;
    const time = new Date(String(value.time ?? ""));

    return {
      userId: scope.userId,
      workspace: scope.workspace,
      level: String(value.level ?? "log").slice(0, 16),
      text: String(value.text ?? "").slice(0, MAX_CONSOLE_TEXT),
      time: Number.isNaN(time.getTime()) ? new Date() : time,
    };
  });

  await prisma.prototypeConsoleEntry.createMany({ data: rows });

  const keep = await prisma.prototypeConsoleEntry.findMany({
    where: { userId: scope.userId, workspace: scope.workspace },
    orderBy: { createdAt: "desc" },
    take: CONSOLE_LIMIT,
    select: { id: true },
  });

  await prisma.prototypeConsoleEntry.deleteMany({
    where: {
      userId: scope.userId,
      workspace: scope.workspace,
      id: { notIn: keep.map((row) => row.id) },
    },
  });
}

/** O anel de console, do mais antigo para o mais recente — ordem de leitura. */
export async function listConsole(scope: Scope): Promise<ConsoleEntry[]> {
  const rows = await prisma.prototypeConsoleEntry.findMany({
    where: { userId: scope.userId, workspace: scope.workspace },
    orderBy: { createdAt: "desc" },
    take: CONSOLE_LIMIT,
  });

  return rows.reverse().map((row) => ({
    level: row.level,
    text: row.text,
    time: row.time.toISOString(),
  }));
}

/** Os bytes de um screenshot do próprio usuário, ou `null`. */
export async function readShot(
  userId: string,
  shotId: string,
): Promise<ShotBytes | null> {
  const shot = await prisma.prototypeShot.findFirst({
    where: { id: shotId, userId },
    select: { mime: true, bytes: true },
  });

  return shot ? { mime: shot.mime, bytes: shot.bytes } : null;
}
