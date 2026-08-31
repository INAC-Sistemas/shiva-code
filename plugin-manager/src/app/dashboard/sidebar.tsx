"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Blocks, KeyRound, LogOut, Menu, Sparkles, Users, X } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { RoleBadge } from "@/app/dashboard/role-badge";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { BorderBeam } from "@/components/magicui/border-beam";

const items = [
  {
    href: "/dashboard",
    label: "Usuários",
    hint: "Contas cadastradas",
    icon: Users,
  },
  {
    href: "/dashboard/skills",
    label: "Skills",
    hint: "Biblioteca compartilhada",
    icon: Sparkles,
  },
  {
    href: "/dashboard/token",
    label: "Token da API",
    hint: "Bearer para integrações",
    icon: KeyRound,
  },
] as const;

type SidebarUser = {
  name: string;
  email: string;
  role: Role;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            {active ? (
              // layoutId faz o fundo deslizar entre os itens ao trocar de rota.
              <motion.span
                layoutId="sidebar-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            ) : null}

            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-colors",
                active
                  ? "text-indigo-500 dark:text-indigo-400"
                  : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300",
              )}
            />

            <span className="flex flex-col">
              <span className={cn("leading-tight", active && "font-medium")}>
                {item.label}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {item.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: SidebarUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
            <Blocks aria-hidden className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Plugin Manager
            </span>
            <AnimatedShinyText className="text-xs">
              painel de controle
            </AnimatedShinyText>
          </span>
        </div>

        <BorderBeam size={60} duration={8} />
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="mt-auto rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {initials(user.name)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {user.name}
            </span>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <RoleBadge role={user.role} />
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              <LogOut aria-hidden className="size-3.5" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  // A gaveta do mobile fecha no clique do link (onNavigate) ou no backdrop.
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior só no mobile, com o botão que abre a gaveta. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Menu aria-hidden className="size-4" />
        </button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Plugin Manager
        </span>
      </header>

      {/* Coluna fixa a partir de lg. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-200 bg-zinc-50/80 backdrop-blur lg:block dark:border-zinc-800 dark:bg-zinc-950/60">
        <SidebarContent user={user} />
      </aside>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-zinc-200 bg-white lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="absolute top-6 right-4 z-10 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X aria-hidden className="size-4" />
              </button>
              <SidebarContent user={user} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
