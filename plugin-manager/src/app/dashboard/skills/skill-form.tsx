"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createSkill, updateSkill } from "@/app/actions/skills";
import { SKILL_NAME_HINT, initialSkillFormState } from "@/lib/skills";

const inputClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-500";

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";

/** Uma skill já gravada, quando o formulário está em modo de edição. */
export type EditableSkill = {
  id: string;
  name: string;
  description: string;
  whenToUse: string | null;
  content: string;
  modelInvocable: boolean;
  userInvocable: boolean;
  published: boolean;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs text-red-600 dark:text-red-400">{message}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="flex flex-col">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className={hintClass}>{hint}</span>
      </span>
    </label>
  );
}

/** Os campos separados, usados pela criação manual e por toda edição. */
function SkillFields({
  skill,
  fieldErrors,
}: {
  skill?: EditableSkill;
  fieldErrors: Partial<Record<string, string>>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-name" className={labelClass}>
            Nome
          </label>
          <input
            id="skill-name"
            name="name"
            type="text"
            defaultValue={skill?.name}
            placeholder="03-prototype"
            className={inputClass}
          />
          <p className={hintClass}>{SKILL_NAME_HINT}</p>
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-when" className={labelClass}>
            Quando usar{" "}
            <span className="font-normal text-zinc-400">(opcional)</span>
          </label>
          <input
            id="skill-when"
            name="whenToUse"
            type="text"
            defaultValue={skill?.whenToUse ?? ""}
            className={inputClass}
          />
          <FieldError message={fieldErrors.whenToUse} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="skill-description" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="skill-description"
          name="description"
          rows={3}
          defaultValue={skill?.description}
          className={inputClass}
        />
        <p className={hintClass}>
          É a única coisa que o modelo vê antes de carregar a skill — é por ela
          que ele decide usá-la.
        </p>
        <FieldError message={fieldErrors.description} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="skill-content" className={labelClass}>
          Corpo (Markdown)
        </label>
        <textarea
          id="skill-content"
          name="content"
          rows={16}
          defaultValue={skill?.content}
          className={`${inputClass} font-mono text-xs leading-relaxed`}
        />
        <FieldError message={fieldErrors.content} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Checkbox
          name="modelInvocable"
          label="O modelo pode carregar"
          hint="Aparece no catálogo do agente."
          defaultChecked={skill?.modelInvocable ?? true}
        />
        <Checkbox
          name="userInvocable"
          label="O usuário pode invocar"
          hint="Disponível por /nome no chat."
          defaultChecked={skill?.userInvocable ?? true}
        />
        <Checkbox
          name="published"
          label="Publicada"
          hint="Despublicada, some da API."
          defaultChecked={skill?.published ?? true}
        />
      </div>
    </>
  );
}

/** Painel de cadastro, com o modo de colar um SKILL.md inteiro. */
export function NewSkillForm() {
  const [state, formAction] = useActionState(
    createSkill,
    initialSkillFormState,
  );
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  // Quantas gravações o usuário já "viu". Abrir/fechar reconhece o total atual,
  // então a confirmação só aparece depois de uma criação nova.
  const [seenCount, setSeenCount] = useState(0);
  const created = state.savedCount > seenCount;

  function toggle() {
    setSeenCount(state.savedCount);
    setOpen((value) => !value);
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {open ? "Cancelar" : "Nova skill"}
        </button>

        {open ? (
          <button
            type="button"
            onClick={() => setImporting((value) => !value)}
            aria-pressed={importing}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            {importing ? "Preencher campos" : "Colar SKILL.md"}
          </button>
        ) : null}

        {created ? (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-400"
          >
            Skill criada.
          </p>
        ) : null}
      </div>

      {open ? (
        <form
          // Remontar após cada criação bem-sucedida limpa os campos.
          key={state.savedCount}
          action={formAction}
          className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          {importing ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="skill-source" className={labelClass}>
                SKILL.md completo
              </label>
              <textarea
                id="skill-source"
                name="source"
                rows={18}
                placeholder={"---\nname: 03-prototype\ndescription: ...\n---\n\n# Prototype\n..."}
                className={`${inputClass} font-mono text-xs leading-relaxed`}
              />
              <p className={hintClass}>
                O frontmatter vira os campos e o resto vira o corpo. Aceita as
                mesmas chaves do arquivo em disco: name, description, whenToUse,
                disable-model-invocation e user-invocable.
              </p>
              <FieldError message={state.fieldErrors.source} />

              <div className="mt-4">
                <Checkbox
                  name="published"
                  label="Publicada"
                  hint="Despublicada, some da API."
                  defaultChecked
                />
              </div>
            </div>
          ) : (
            <SkillFields fieldErrors={state.fieldErrors} />
          )}

          {state.error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
            >
              {state.error}
            </p>
          ) : null}

          <div className="mt-5">
            <SubmitButton label="Criar skill" />
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Painel de edição de uma skill já gravada. */
export function EditSkillForm({ skill }: { skill: EditableSkill }) {
  const [state, formAction] = useActionState(
    updateSkill,
    initialSkillFormState,
  );
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const saved = state.savedCount > seenCount;

  function toggle() {
    setSeenCount(state.savedCount);
    setOpen((value) => !value);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      >
        {open ? "Fechar" : "Editar"}
      </button>

      {open ? (
        <form
          key={state.savedCount}
          action={formAction}
          className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 text-left dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <input type="hidden" name="id" value={skill.id} />

          <SkillFields skill={skill} fieldErrors={state.fieldErrors} />

          {state.error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
            >
              {state.error}
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <SubmitButton label="Salvar" />
            {saved ? (
              <p
                role="status"
                className="text-sm text-emerald-700 dark:text-emerald-400"
              >
                Salva.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </>
  );
}
