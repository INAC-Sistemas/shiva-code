import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import {
  PrototypeRequestError,
  assertWorkspace,
  listConsole,
  listResults,
  pushConsole,
  settleCommand,
  submitCommand,
  takePendingCommand,
  waitForResult,
} from "@plugins/prototype";

/**
 * POST /api/plugins/prototype/automation/<op>
 * Header: Authorization: Bearer <token>
 * Body:   { workspace: "<16 hex>", ... }
 *
 * Uma rota por operação da fila, com os mesmos nomes que a casca já expõe ao
 * agente em `/prototype/api/automation/*` — a casca faz proxy, então o contrato
 * que o agente lê não muda de lugar:
 *
 *   submit       {cmd}                → 200 {ok,id} | 409 já há um em voo
 *   pending      {}                   → 200 {ok,cmd|null}
 *   result       {id,ok,data,error}   → 200 {ok}
 *   wait         {id,timeoutMs}       → 200 {ok,result} | 200 {ok:false} no prazo
 *   results      {}                   → 200 {ok,results}
 *   console      {}                   → 200 {ok,entries}
 *   console_push {entries}            → 200 {ok}
 *
 * O dono vem do token, nunca do corpo: a casca roda na máquina do cliente e é
 * código não confiável.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ op: string }> },
) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) return auth.response;

  const { op } = await context.params;

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corpo não é JSON válido." },
      { status: 400 },
    );
  }

  try {
    const userId = auth.session.userId;

    switch (op) {
      case "submit": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };
        const { id } = await submitCommand(scope, body.cmd);

        return NextResponse.json({ ok: true, id });
      }

      case "pending": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        return NextResponse.json({
          ok: true,
          cmd: await takePendingCommand(scope),
        });
      }

      case "result": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        if (typeof body.id !== "string" || body.id === "") {
          return NextResponse.json(
            { ok: false, error: "id é obrigatório." },
            { status: 400 },
          );
        }

        await settleCommand(scope, {
          id: body.id,
          ok: Boolean(body.ok),
          data: body.data,
          error: typeof body.error === "string" ? body.error : null,
        });

        return NextResponse.json({ ok: true });
      }

      case "wait": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        if (typeof body.id !== "string" || body.id === "") {
          return NextResponse.json(
            { ok: false, error: "id é obrigatório." },
            { status: 400 },
          );
        }

        const result = await waitForResult(
          scope,
          body.id,
          typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
        );

        return result
          ? NextResponse.json({ ok: true, result })
          : NextResponse.json({
              ok: false,
              error: "timeout waiting for command result",
            });
      }

      case "results": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        return NextResponse.json({ ok: true, results: await listResults(scope) });
      }

      case "console": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        return NextResponse.json({ ok: true, entries: await listConsole(scope) });
      }

      case "console_push": {
        const scope = { userId, workspace: assertWorkspace(body.workspace) };

        await pushConsole(scope, body.entries);

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Operação desconhecida: "${op}".` },
          { status: 404 },
        );
    }
  } catch (error) {
    if (error instanceof PrototypeRequestError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    console.error(`Falha na automação do protótipo (${op}):`, error);

    return NextResponse.json(
      { ok: false, error: "Falha ao processar o comando de automação." },
      { status: 500 },
    );
  }
}
