import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { RoleBadge } from "@/app/dashboard/role-badge";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function UsersPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  // Admin enxerga todos os usuários; guest enxerga apenas o próprio registro.
  const users = await prisma.user.findMany({
    where: isAdmin ? undefined : { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Usuários
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin
            ? `${users.length} ${users.length === 1 ? "usuário cadastrado" : "usuários cadastrados"}.`
            : "Como guest, você visualiza apenas o seu próprio cadastro."}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-xl border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
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
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
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
    </>
  );
}
