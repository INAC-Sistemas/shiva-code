import type { Role } from "@/generated/prisma/enums";

const styles: Record<Role, string> = {
  ADMIN:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  GUEST: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role]}`}
    >
      {role.toLowerCase()}
    </span>
  );
}
