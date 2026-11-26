import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DuasEtapas } from "@/components/admin/duas-etapas";
import { nivelDaSessao, papelNaPlataforma } from "@/lib/admin";

export const metadata: Metadata = { title: "Verificação", robots: { index: false, follow: false } };

export default async function VerificarPage() {
  if (!(await papelNaPlataforma())) notFound();
  if ((await nivelDaSessao()) === "aal2") redirect("/admin");

  return (
    <main className="auth">
      <div className="auth-brand">
        <h1>Painel da plataforma</h1>
        <p className="muted">Para entrar, confirme com o código do seu app autenticador.</p>
      </div>
      <div className="card">
        <DuasEtapas />
      </div>
    </main>
  );
}
