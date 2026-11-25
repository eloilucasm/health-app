import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { AgendarOnline } from "@/components/agendar-online";
import { linkWhatsApp } from "@/domain/pacientes";
import { carregarPaginaPublica } from "@/lib/agendamento-online";

// Página pública de agendamento (RF-13). Fora do layout do app: não exige login.

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  return {
    title: pagina ? `Agendar com ${pagina.perfil.nome}` : "Página não encontrada",
    // Sem indexação por buscadores no MVP (D-24): o link é divulgado pela própria profissional.
    robots: { index: false, follow: false },
  };
}

export default async function PaginaPublica({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  // Desligado ou inexistente: a mesma resposta, para não revelar quais endereços existem.
  if (!pagina) notFound();

  const { perfil, dias } = pagina;
  const whatsapp = linkWhatsApp(perfil.telefone);

  return (
    <div className="themed" style={{ "--brand": perfil.cor } as CSSProperties}>
      <main className="app public">
        <header className="pub-head">
          <span className="mark big" aria-hidden="true">
            {perfil.nome.charAt(0).toUpperCase()}
          </span>
          <h1 className="title">{perfil.nome}</h1>
          <p className="brand-line">
            {perfil.especialidade}
            {perfil.registro && ` · ${perfil.conselho} ${perfil.registro}`}
          </p>
          {perfil.endereco && <p className="muted small">{perfil.endereco}</p>}
          {perfil.mensagem && <p className="pub-msg">{perfil.mensagem}</p>}
        </header>

        <AgendarOnline slug={slug} nome={perfil.nome} dias={dias} />

        <footer className="pub-foot muted small">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          )}
          {perfil.instagram && (
            <a href={`https://instagram.com/${encodeURIComponent(perfil.instagram)}`} target="_blank" rel="noopener noreferrer">
              @{perfil.instagram}
            </a>
          )}
          <span>Agendamento por Consultório no Bolso</span>
        </footer>
      </main>
    </div>
  );
}
