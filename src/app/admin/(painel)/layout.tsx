import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel da plataforma" },
  robots: { index: false, follow: false },
};

/** Moldura do painel administrativo. Fora do layout do consultório. */
export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const { papel, email } = await requireAdmin();

  return (
    <div className="admin">
      <header className="admin-top">
        <b>Painel da plataforma</b>
        <nav aria-label="Painel">
          <Link href="/admin/clientes">Clientes</Link>
          <Link href="/admin/planos">Planos</Link>
          <Link href="/admin/profissoes">Profissões</Link>
        </nav>
        <span className="muted small">
          {email} · {papel === "admin" ? "admin" : "suporte"}
        </span>
        <form action="/auth/sair" method="post">
          <button type="submit" className="linkbtn">
            Sair
          </button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
