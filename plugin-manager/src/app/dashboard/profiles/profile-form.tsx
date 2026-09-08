"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createProfile, updateProfile } from "@/app/actions/profiles";
import { KNOWN_PLUGINS, initialProfileFormState } from "@/lib/profiles";

const inputClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-500";

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";

/** Uma skill publicada, como o formulário a oferece para seleção. */
export type SelectableSkill = {
  id: string;
  name: string;
  description: string;
};

/** Um perfil já gravado, quando o formulário está em modo de edição. */
export type EditableProfile = {
  id: string;
  name: string;
  description: string | null;
  plugins: string[];
  skillIds: string[];
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

/** Os campos do perfil, compartilhados pela criação e por toda edição. */
function ProfileFields({
  profile,
  skills,
  fieldErrors,
}: {
  profile?: EditableProfile;
  skills: SelectableSkill[];
  fieldErrors: Partial<Record<string, string>>;
}) {
  const selectedPlugins = new Set(profile?.plugins ?? []);
  const selectedSkills = new Set(profile?.skillIds ?? []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-name" className={labelClass}>
            Nome
          </label>
          <input
            id="profile-name"
            name="name"
            defaultValue={profile?.name}
            placeholder="Desenvolvimento"
            className={inputClass}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-description" className={labelClass}>
            Descrição
          </label>
          <input
            id="profile-description"
            name="description"
            defaultValue={profile?.description ?? ""}
            placeholder="Opcional — aparece no seletor de perfil"
            className={inputClass}
          />
          <FieldError message={fieldErrors.description} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className={labelClass}>Plugins</legend>
        <p className={hintClass}>
          Marcados com <em>reinício</em> vivem na composição do processo: trocar
          para um perfil que os liga ou desliga pede reiniciar o aplicativo.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {KNOWN_PLUGINS.map((plugin) => (
            <label key={plugin.id} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                name="plugins"
                value={plugin.id}
                defaultChecked={selectedPlugins.has(plugin.id)}
                className="mt-0.5 size-4 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="flex flex-col">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {plugin.label}
                  {plugin.plane === "host" ? (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      reinício
                    </span>
                  ) : null}
                </span>
                <span className={hintClass}>{plugin.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.plugins} />
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className={labelClass}>Skills da biblioteca</legend>
        <p className={hintClass}>
          Só as marcadas chegam ao modelo neste perfil. Nenhuma marcada significa
          nenhuma skill da biblioteca — as skills locais da máquina continuam
          valendo.
        </p>

        {skills.length === 0 ? (
          <p className={hintClass}>Nenhuma skill publicada na biblioteca.</p>
        ) : (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            {skills.map((skill) => (
              <label key={skill.id} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="skills"
                  value={skill.id}
                  defaultChecked={selectedSkills.has(skill.id)}
                  className="mt-0.5 size-4 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span className="flex min-w-0 flex-col">
                  <code className="text-sm text-zinc-700 dark:text-zinc-300">
                    {skill.name}
                  </code>
                  <span className={`${hintClass} truncate`}>
                    {skill.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <FieldError message={fieldErrors.skills} />
      </fieldset>
    </div>
  );
}

/** Painel recolhível de criação de perfil. */
export function NewProfileForm({ skills }: { skills: SelectableSkill[] }) {
  const [state, formAction] = useActionState(
    createProfile,
    initialProfileFormState,
  );
  const [open, setOpen] = useState(false);
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
          className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {open ? "Cancelar" : "Novo perfil"}
        </button>

        {created ? (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-400"
          >
            Perfil criado.
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
          <ProfileFields skills={skills} fieldErrors={state.fieldErrors} />

          {state.error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
            >
              {state.error}
            </p>
          ) : null}

          <div className="mt-5">
            <SubmitButton label="Criar perfil" />
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Painel de edição de um perfil já gravado. */
export function EditProfileForm({
  profile,
  skills,
}: {
  profile: EditableProfile;
  skills: SelectableSkill[];
}) {
  const [state, formAction] = useActionState(
    updateProfile,
    initialProfileFormState,
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
          className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 text-left dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <input type="hidden" name="id" value={profile.id} />

          <ProfileFields
            profile={profile}
            skills={skills}
            fieldErrors={state.fieldErrors}
          />

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
                Salvo.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </>
  );
}
