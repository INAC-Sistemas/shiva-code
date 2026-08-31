import { ShieldCheck, UserRound, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { RoleBadge } from "@/app/dashboard/role-badge";
import { NewUserForm } from "@/app/dashboard/new-user-form";
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
  icon: typeof Users;
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

export default async function UsersPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  // Admin enxerga todos os usuários; guest enxerga apenas o próprio registro.
  const users = await prisma.user.findMany({
    where: isAdmin ? undefined : { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const admins = users.filter((user) => user.role === "ADMIN").length;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Usuários
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin
            ? "Todas as contas com acesso ao painel e à API."
            : "Como guest, você visualiza apenas o seu próprio cadastro."}
        </p>
      </div>

      {isAdmin ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={users.length} icon={Users} beam />
          <StatCard label="Admins" value={admins} icon={ShieldCheck} />
          <StatCard
            label="Guests"
            value={users.length - admins}
            icon={UserRound}
          />
        </div>
      ) : null}

      {isAdmin ? <NewUserForm /> : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-xs tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                <th scope="col" className="px-5 py-3 font-medium">
                  Nome
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  E-mail
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Papel
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {user.name}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </td>
                  <td className="px-5 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {dateFormat.format(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
