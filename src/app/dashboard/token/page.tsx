import { requireSession } from "@/lib/auth";
import { API_TOKEN_MAX_AGE_SECONDS } from "@/lib/session";
import { TokenGenerator } from "@/app/dashboard/token/token-generator";

const HOURS = API_TOKEN_MAX_AGE_SECONDS / 3600;

export default async function ApiTokenPage() {
  const session = await requireSession();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Token da API
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Gera um token Bearer para <strong>{session.email}</strong>, com o
          mesmo papel da sua conta e validade de {HOURS} horas.
        </p>
      </div>

      <TokenGenerator />
    </>
  );
}
