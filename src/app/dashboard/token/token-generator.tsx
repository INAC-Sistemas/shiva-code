"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { generateApiToken } from "@/app/actions/api-token";
import { type ApiTokenState, initialApiTokenState } from "@/lib/api-token";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard (ou origem insegura): o token continua
      // visível na tela para seleção manual.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-emerald-500" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function TokenGenerator() {
  const [state, setState] = useState<ApiTokenState>(initialApiTokenState);
  const [pending, startTransition] = useTransition();

  function generate() {
    // A action é chamada dentro de uma transition: é assim que uma Server
    // Action é disparada fora de um <form>.
    startTransition(async () => {
      setState(await generateApiToken());
    });
  }

  const expiresAt =
    state.issuedAt === null
      ? null
      : new Date(state.issuedAt + state.expiresIn * 1000);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <ShimmerButton
        onClick={generate}
        disabled={pending}
        borderRadius="12px"
        className="dark:[--bg:rgb(250_250_250)] dark:text-zinc-900"
      >
        <KeyRound aria-hidden className="size-4" />
        {pending
          ? "Gerando..."
          : state.token
            ? "Gerar novo token"
            : "Gerar token"}
      </ShimmerButton>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      {state.token ? (
        <div className="mt-5" role="status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Seu token
            </span>
            <CopyButton value={state.token} />
          </div>

          <code className="mt-2 block max-h-32 overflow-auto rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs break-all text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {state.token}
          </code>

          {expiresAt ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Expira em {dateFormat.format(expiresAt)}. O token não fica
              guardado em lugar nenhum — depois de sair desta tela, gere outro.
            </p>
          ) : null}

          <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Como usar
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {'curl http://localhost:3000/api/users \\\n  -H "Authorization: Bearer $TOKEN"'}
          </pre>
        </div>
      ) : null}

      <BorderBeam size={80} duration={9} />
    </div>
  );
}
