import { Blocks, Sparkles, UserCog } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deleteProfile, selectProfile } from "@/app/actions/profiles";
import {
  EditProfileForm,
  NewProfileForm,
} from "@/app/dashboard/profiles/profile-form";
import { KNOWN_PLUGINS, KNOWN_PLUGIN_IDS } from "@/lib/profiles";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";

const pluginLabels = new Map(
  KNOWN_PLUGINS.map((plugin) => [plugin.id as string, plugin.label as string]),
);

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

export default async function ProfilesPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  // Cada um administra os PRÓPRIOS perfis, guest inclusive: um perfil só
  // estreita o que a biblioteca publicada já concede, então self-service não
  // concede nada — e sob a regra de fechar-em-vazio, quem não pudesse criar um
  // ficaria sem biblioteca. O admin ganha só uma visão de supervisão, no fim.
  const [profiles, skills, user, everyone] = await Promise.all([
    prisma.profile.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        plugins: true,
        revision: true,
        skills: { select: { skillId: true, skill: { select: { name: true } } } },
      },
    }),
    prisma.librarySkill.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeProfileId: true },
    }),
    isAdmin
      ? prisma.profile.findMany({
          orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            user: { select: { name: true, email: true } },
            _count: { select: { skills: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const activeId = user?.activeProfileId ?? null;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Perfis
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Um perfil é o recorte de skills e plugins que um agente enxerga
          enquanto roda sob ele. O perfil ativo vale para todas as suas sessões,
          em qualquer máquina.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Perfis" value={profiles.length} icon={UserCog} beam />
        <StatCard
          label="Skills publicadas"
          value={skills.length}
          icon={Sparkles}
        />
        <StatCard
          label="Plugins disponíveis"
          value={KNOWN_PLUGINS.length}
          icon={Blocks}
        />
      </div>

      <NewProfileForm skills={skills} />

      {activeId === null ? (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          Nenhum perfil ativo. Enquanto for assim, o agente não recebe nenhuma
          skill da biblioteca — escolha um abaixo.
        </p>
      ) : null}

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Você ainda não tem perfis. Use “Novo perfil” para criar o primeiro.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {profile.name}
                    </span>
                    {profile.id === activeId ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        ativo
                      </span>
                    ) : null}
                  </div>

                  {profile.description ? (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {profile.description}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    Plugins:{" "}
                    {profile.plugins.filter((id) => KNOWN_PLUGIN_IDS.has(id))
                      .length === 0
                      ? "nenhum"
                      : profile.plugins
                          .filter((id) => KNOWN_PLUGIN_IDS.has(id))
                          .map((id) => pluginLabels.get(id) ?? id)
                          .join(", ")}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Skills:{" "}
                    {profile.skills.length === 0
                      ? "nenhuma"
                      : profile.skills
                          .map((entry) => entry.skill.name)
                          .join(", ")}
                  </p>

                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    rev {profile.revision}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {profile.id === activeId ? null : (
                    <form action={selectProfile}>
                      <input type="hidden" name="id" value={profile.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                      >
                        Tornar ativo
                      </button>
                    </form>
                  )}

                  <EditProfileForm
                    profile={{
                      id: profile.id,
                      name: profile.name,
                      description: profile.description,
                      plugins: [...profile.plugins],
                      skillIds: profile.skills.map((entry) => entry.skillId),
                    }}
                    skills={skills}
                  />

                  <form action={deleteProfile}>
                    <input type="hidden" name="id" value={profile.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2.5 py-1.5 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && everyone.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Todos os perfis
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Somente leitura. Um perfil é escopo de execução: entrar no perfil de
            outra pessoa não é uma operação que exista.
          </p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {everyone.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-baseline gap-x-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-900 dark:text-zinc-50">
                  {profile.name}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {profile.user.name} · {profile.user.email} ·{" "}
                  {profile._count.skills} skills
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
