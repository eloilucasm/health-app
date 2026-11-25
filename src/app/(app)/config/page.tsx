import type { Metadata } from "next";
import { ConsultorioForm } from "@/components/consultorio-form";
import { Sheet } from "@/components/sheet";
import { requireUser } from "@/lib/auth";
import { carregarConsultorio, listarEspecialidades } from "@/lib/consultorio";

export const metadata: Metadata = { title: "Ajustes" };

export default async function ConfigPage({ searchParams }: PageProps<"/config">) {
  const [user, { dados }, especialidades, { aviso }] = await Promise.all([
    requireUser(),
    carregarConsultorio(),
    listarEspecialidades(),
    searchParams,
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
