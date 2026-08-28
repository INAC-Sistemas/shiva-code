import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// A raiz não tem tela própria: manda para o dashboard se houver sessão,
// senão para o login. Na prática o proxy já resolve isso antes de chegar
// aqui — este redirect é o fallback caso o proxy não rode.
export default async function RootPage() {
  const session = await getSession();

  redirect(session ? "/dashboard" : "/login");
}
