import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profissões" };

type Linha = {
  id: string;
  nome: string;
  conselho: string;
  ativo: boolean;
  versao: number;
  termos: { atendimento?: string; registro?: string };
  recursos_padrao: { pacotes?: boolean };
  tipos_atendimento: { nome: string; duracao_min: number }[];
};

export default async function ProfissoesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialty_profiles")
    .select("id, nome, conselho, ativo, versao, termos, recursos_padrao, tipos_atendimento")
    .order("ordem");
  if (error) throw new Error(`Falha ao carregar as profissões: ${error.message}`);

  return (
    <>
      <h1 className="title">Profissões</h1>
      <p className="muted">
        Cada profissão define termos, recursos, tipos de atendimento, campos do paciente e formulários. Salvar gera uma
        versão nova; os registros antigos continuam exibidos com a versão em que foram feitos.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Profissão</th>
              <th>Atendimento / registro</th>
              <th>Tipos</th>
              <th>Pacotes</th>
              <th>Versão</th>
            </tr>
          </thead>
          <tbody>
            {(data as Linha[]).map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/profissoes/${p.id}`}>
                    <b>{p.nome}</b>
                  </Link>
                  <br />
                  <span className="muted small">
                    {p.conselho}
                    {!p.ativo && " · desligada no cadastro"}
                  </span>
                </td>
                <td>
                  {p.termos.atendimento ?? "—"} / {p.termos.registro ?? "—"}
                </td>
                <td>{p.tipos_atendimento.map((t) => `${t.nome} (${t.duracao_min} min)`).join(", ")}</td>
                <td>{p.recursos_padrao.pacotes === false ? "não" : "sim"}</td>
                <td className="num">{p.versao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
