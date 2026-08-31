import { requireSession } from "@/lib/auth";
import { DashboardSidebar } from "@/app/dashboard/sidebar";
import { DotPattern } from "@/components/magicui/dot-pattern";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await requireSession();

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-black">
      <DotPattern
        className="[mask-image:radial-gradient(60vw_circle_at_20%_0%,white,transparent)] opacity-70"
        cr={0.8}
        width={22}
        height={22}
      />

      <DashboardSidebar
        user={{
          name: session.name,
          email: session.email,
          role: session.role,
        }}
      />

      {/* Conteúdo à direita da aside — o padding só existe a partir de lg,
          onde a coluna fixa de 18rem ocupa a lateral. */}
      <div className="relative lg:pl-72">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
