import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsultorioForm } from "@/components/consultorio-form";
import { COR_PADRAO } from "@/domain/tema";
import { getMembership } from "@/lib/auth";
import { listarEspecialidades } from "@/lib/consultorio";

export const metadata: Metadata = { title: "Configurar consultório" };

export default async function OnboardingPage() {
  if (await getMembership()) redirect("/");
  const especialidades = await listarEspecialidades();

  return (
    <main className="app">
      <h1 className="title">Vamos montar seu consultório</h1>
      <p className="muted">Leva poucos minutos. Você pode mudar tudo depois, nos ajustes.</p>
      <ConsultorioForm
        modo="criar"
        especialidades={especialidades}
        inicial={{
          nome: "",
          especialidade: "",
          registro: "",
          telefone: "",
          endereco: "",
          instagram: "",
          fuso: "America/Sao_Paulo",
          cor: COR_PADRAO,
          duracaoMin: 50,
          periodos: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, inicio: "08:00", fim: "12:00", local: "consultorio" })),
        }}
      />
      <form action="/auth/sair" method="post">
        <button type="submit" className="linkbtn">
          Sair desta conta
        </button>
      </form>
    </main>
  );
}
