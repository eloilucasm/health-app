import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfissaoEditor } from "@/components/admin/profissao-editor";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profissão" };

export default async function ProfissaoPage({ params }: PageProps<"/admin/profissoes/[id]">) {
  const { id } = await params;
  if (!/^[a-z_]{2,40}$/.test(id)) notFound();
  const { papel } = await requireAdmin();
  const supabase = await createClient();
  const [perfil, versoes] = await Promise.all([
    supabase
      .from("specialty_profiles")
      .select("id, nome, conselho, ativo, versao, termos, recursos_padrao, tipos_atendimento, patient_schema, evolution_schema, anamnesis_schema, procedimentos")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("specialty_profile_versions").select("versao, motivo, criado_em").eq("profile_id", id).order("versao", { ascending: false }),
  ]);
  if (perfil.error) throw new Error(`Falha ao carregar a profissão: ${perfil.error.message}`);
  if (!perfil.data) notFound();
  const p = perfil.data;

  // O que é editável, na ordem em que aparece no editor.
  const modelo = {
    termos: p.termos,
    recursos_padrao: p.recursos_padrao,
    tipos_atendimento: p.tipos_atendimento,
    procedimentos: p.procedimentos,
    patient_schema: p.patient_schema,
    evolution_schema: p.evolution_schema,
    anamnesis_schema: p.anamnesis_schema,
  };

  return (
    <>
      <Link href="/admin/profissoes" className="linkbtn back">
        ‹ Profissões
      </Link>
      <h1 className="title">{p.nome}</h1>
      <p className="muted">
        {p.conselho} · versão {p.versao} · {p.ativo ? "aparece no cadastro" : "desligada no cadastro"}
      </p>

      {papel === "admin" ? (
        <ProfissaoEditor id={p.id} nome={p.nome} ativo={p.ativo} modelo={JSON.stringify(modelo, null, 2)} />
      ) : (
        <pre className="card json">{JSON.stringify(modelo, null, 2)}</pre>
      )}

      <h2 className="section">Versões</h2>
      <ul className="history">
        {(versoes.data ?? []).map((v) => (
          <li key={v.versao}>
            <b>Versão {v.versao}</b>
            {v.motivo && <> · {v.motivo}</>}
            <span className="muted small"> · {new Date(v.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
