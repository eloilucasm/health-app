import Link from "next/link";
import type { CSSProperties } from "react";
import { TabBar } from "@/components/tab-bar";
import { carregarConsultorio, listarEspecialidades } from "@/lib/consultorio";

/** Moldura do app: cabeçalho fixo, conteúdo e barra de abas, na cor escolhida. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [{ dados }, especialidades] = await Promise.all([carregarConsultorio(), listarEspecialidades()]);
  const especialidade = especialidades.find((e) => e.id === dados.especialidade)?.nome ?? "";

  return (
    <div className="themed" style={{ "--brand": dados.cor } as CSSProperties}>
      <div className="app with-tabs">
        <header className="top">
          <span className="mark" aria-hidden="true">
            {dados.nome.charAt(0).toUpperCase()}
          </span>
          <div className="brand">
            <b>{dados.nome}</b>
            <span>{especialidade}</span>
          </div>
          <Link href="/config" className="iconbtn" aria-label="Ajustes do consultório">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
          </Link>
        </header>
        <main>{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
