"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createUser } from "@/app/actions/users";
import { MIN_PASSWORD_LENGTH, initialCreateUserState } from "@/lib/users";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="text-xs text-red-600 dark:text-red-400">{message}</p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? "Criando..." : "Criar usuário"}
    </button>
  );
}

export function NewUserForm() {
  const [state, formAction] = useActionState(createUser, initialCreateUserState);
  const [open, setOpen] = useState(false);
  // Quantas criações o usuário já "viu". Abrir/fechar o painel reconhece o
  // total atual, então a confirmação só aparece depois de uma criação nova.
  const [seenCount, setSeenCount] = useState(0);
  const created = state.createdCount > seenCount;

  function toggle() {
    setSeenCount(state.createdCount);
    setOpen((value) => !value);
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {open ? "Cancelar" : "Novo usuário"}
        </button>

        {created ? (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-400"
          >
            Usuário criado.
          </p>
        ) : null}
      </div>

      {open ? (
        <form
          // Remontar após cada criação bem-sucedida limpa os campos.
          key={state.createdCount}
          action={formAction}
          className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={labelClass}>
                Nome
              </label>
              <input id="name" name="name" type="text" className={inputClass} />
              <FieldError message={state.fieldErrors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-email" className={labelClass}>
                E-mail
              </label>
              <input
                id="new-email"
                name="email"
                type="email"
                autoComplete="off"
                className={inputClass}
              />
              <FieldError message={state.fieldErrors.email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className={labelClass}>
                Senha
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                className={inputClass}
              />
              <FieldError message={state.fieldErrors.password} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className={labelClass}>
                Papel
              </label>
              <select
                id="role"
                name="role"
                defaultValue="GUEST"
                className={inputClass}
              >
                <option value="GUEST">guest</option>
                <option value="ADMIN">admin</option>
              </select>
              <FieldError message={state.fieldErrors.role} />
            </div>
          </div>

          {state.error ? (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
            >
              {state.error}
            </p>
          ) : null}

          <div className="mt-5">
            <SubmitButton />
          </div>
        </form>
      ) : null}
    </div>
  );
}
