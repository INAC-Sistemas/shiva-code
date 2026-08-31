import { EyeOff, Sparkles, Wand2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deleteSkill, toggleSkillPublished } from "@/app/actions/skills";
import {
  EditSkillForm,
  NewSkillForm,
} from "@/app/dashboard/skills/skill-form";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function StatCard({
  label,
  value,
  icon: Icon,
  beam = false,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
  beam?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {label}
        </span>
        <Icon aria-hidden className="size-4 text-zinc-400" />
      </div>
      <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        <NumberTicker value={value} />
      </p>
      {beam ? <BorderBeam size={70} duration={7} /> : null}
    </div>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={
        on
          ? "rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
          : "rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-400 line-through dark:bg-zinc-900 dark:text-zinc-600"
      }
    >
      {label}
    </span>
  );
}

export default async function SkillsPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  // Sem filtro por usuário: a biblioteca é uma só, e todo mundo que entrou vê o
  // que existe nela. O que separa admin de guest é poder escrever.
  const skills = await prisma.librarySkill.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      whenToUse: true,
      content: true,
      modelInvocable: true,
      userInvocable: true,
      published: true,
      revision: true,
      updatedAt: true,
    },
  });

  const published = skills.filter((skill) => skill.published).length;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Skills
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin
            ? "A biblioteca compartilhada. Toda skill publicada aqui fica disponível para qualquer usuário autenticado com token válido."
            : "A biblioteca compartilhada. Estas skills ficam disponíveis para você quando o seu token estiver válido."}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={skills.length} icon={Sparkles} beam />
        <StatCard label="Publicadas" value={published} icon={Wand2} />
        <StatCard
          label="Rascunhos"
          value={skills.length - published}
          icon={EyeOff}
        />
      </div>

      {isAdmin ? <NewSkillForm /> : null}

      {skills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma skill cadastrada ainda.
            {isAdmin ? " Use “Nova skill” para criar a primeira." : ""}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {skills.map((skill) => (
            <li
              key={skill.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {skill.name}
                    </code>
                    <Flag on={skill.modelInvocable} label="modelo" />
                    <Flag on={skill.userInvocable} label="usuário" />
                    {skill.published ? null : (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        rascunho
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {skill.description}
                  </p>

                  {skill.whenToUse ? (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                      Quando usar: {skill.whenToUse}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    rev {skill.revision} · {skill.content.length} caracteres ·
                    atualizada em {dateFormat.format(skill.updatedAt)}
                  </p>
                </div>

                {isAdmin ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <EditSkillForm
                      skill={{
                        id: skill.id,
                        name: skill.name,
                        description: skill.description,
                        whenToUse: skill.whenToUse,
                        content: skill.content,
                        modelInvocable: skill.modelInvocable,
                        userInvocable: skill.userInvocable,
                        published: skill.published,
                      }}
                    />

                    <form action={toggleSkillPublished}>
                      <input type="hidden" name="id" value={skill.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={skill.published ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                      >
                        {skill.published ? "Despublicar" : "Publicar"}
                      </button>
                    </form>

                    <form action={deleteSkill}>
                      <input type="hidden" name="id" value={skill.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2.5 py-1.5 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                      >
                        Remover
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
