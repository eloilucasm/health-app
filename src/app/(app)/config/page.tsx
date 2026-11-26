import type { Metadata } from "next";
import { ConsultorioForm } from "@/components/consultorio-form";
import { AjustesOnlineForm } from "@/components/ajustes-online";
import { ImportarBackup } from "@/components/importar-backup";
import { Sheet } from "@/components/sheet";
import { requireUser } from "@/lib/auth";
import { carregarAjustesOnline } from "@/lib/agendamento-online";
import { temRecurso } from "@/lib/assinatura";
import { carregarConsultorio, listarEspecialidades } from "@/lib/consultorio";
import { siteUrl } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Ajustes" };

export default async function ConfigPage({ searchParams }: PageProps<"/config">) {
  const [user, { dados }, especialidades, { aviso }, online, comAgendamentoOnline] = await Promise.all([
    requireUser(),
    carregarConsultorio(),
    listarEspecialidades(),
    searchParams,
    carregarAjustesOnline(),
    temRecurso("agendamento_online"),
  ]);

  return (
    <>
      <h1 className="title">Ajustes</h1>
      {aviso === "incompleto" && (
        <p className="banner" role="alert">
          O consultório foi criado, mas parte dos dados não foi salva. Confira e salve de novo.
        </p>
      )}
      <ConsultorioForm modo="editar" inicial={dados} especialidades={especialidades} />

      <h2 className="section">Agendamento online</h2>
      {comAgendamentoOnline ? (
        <AjustesOnlineForm inicial={online} link={`${siteUrl().replace(/\/$/, "")}/${online.slug}`} />
      ) : (
        <div className="empty">
          <b>Não incluído no seu plano</b>
          O agendamento pelo link não faz parte do plano atual.
        </div>
      )}

      <h2 className="section">Seus dados</h2>
      <div className="stack">
        <Sheet titulo="Importar backup" gatilho="Importar backup do app antigo">
          <ImportarBackup />
        </Sheet>
        <a className="btn ghost" href="/config/exportar" download>
          Exportar todos os dados
        </a>
        <p className="muted small">
          O arquivo exportado contém dados de saúde dos seus pacientes. Guarde-o em local seguro.
        </p>
      </div>

      <h2 className="section">Aplicativo e conta</h2>
      <div className="stack">
        <Sheet titulo="Instalar no celular" gatilho="Como instalar no celular">
          <p>
            <b>iPhone:</b> abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
          </p>
          <p>
            <b>Android:</b> abra no Chrome, toque no menu (⋮) e depois em “Instalar app”.
          </p>
        </Sheet>
        <p className="muted small center">Conectada como {user.email}</p>
        <form action="/auth/sair" method="post">
          <button type="submit" className="btn ghost">
            Sair
          </button>
        </form>
      </div>
    </>
  );
}
