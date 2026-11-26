import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesCliente, ExcecaoRecurso } from "@/components/admin/acoes-cliente";
import { SITUACOES, situacaoValida } from "@/domain/assinatura";
import { uuidValido } from "@/domain/agenda";
import { dataCurta } from "@/domain/datas";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cliente" };

type Detalhe = {
  org: { id: string; nome: string; slug: string; especialidade: string; conselho: string | null; registro: string | null; telefone: string | null; timezone: string; criado_em: string };
  dona: { email: string; ultimo_acesso: string | null; criada_em: string } | null;
  assinatura: { plano_id: string; status: string; situacao: string; trial_ate: string | null; periodo_ate: string | null; inadimplente_desde: string | null; provedor: string | null } | null;
  uso: { pacientes_ativos: number; atendimentos_30d: number; evolucoes_30d: number; agendamento_online_ligado: boolean | null; cotas_do_mes: Record<string, number> };
  recursos: { id: string; nome: string; tipo: "booleano" | "cota_mensal"; habilitado: boolean; limite: number | null; excecao: { habilitado: boolean | null; limite: number | null; motivo: string } | null }[];
  historico: { acao: string; motivo: string | null; detalhes: unknown; em: string; admin: string | null }[];
};

const ACOES: Record<string, string> = {
  ver_cliente: "Consultou o cliente",
  estender_teste: "Estendeu o teste",
  trocar_plano: "Trocou o plano",
  definir_status: "Mudou a situação",
  definir_excecao: "Definiu exceção de recurso",
};

const data = (iso: string | null | undefined) => (iso ? dataCurta(iso.slice(0, 10)) : "—");

export default async function ClientePage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  if (!uuidValido(id)) notFound();
  const { papel } = await requireAdmin();
  const supabase = await createClient();
  const [detalhe, planos] = await Promise.all([
    supabase.rpc("admin_detalhe_cliente", { p_org: id }),
    supabase.from("plans").select("id, nome, ativo").order("ordem"),
  ]);
  if (detalhe.error?.code === "P0001") notFound();
  if (detalhe.error) throw new Error(`Falha ao carregar o cliente: ${detalhe.error.message}`);
  const d = detalhe.data as Detalhe;
  const sit = d.assinatura?.situacao ?? "sem_assinatura";
  const podeAgir = papel === "admin";
  // Consultas ao detalhe continuam na auditoria; a tela mostra só as ações.
  const acoes = d.historico.filter((h) => h.acao !== "ver_cliente");

  return (
    <>
      <Link href="/admin/clientes" className="linkbtn back">
        ‹ Clientes
      </Link>
      <h1 className="title">{d.org.nome}</h1>
      <p className="muted">
        {d.org.especialidade}
        {d.org.registro && ` · ${d.org.conselho ?? ""} ${d.org.registro}`} · /{d.org.slug}
      </p>

      <div className="admin-grid">
        <section className="card">
          <h2 className="card-title">Conta</h2>
          <dl className="info flat">
            <div><dt>Dona</dt><dd>{d.dona?.email ?? "—"}</dd></div>
            <div><dt>Último acesso</dt><dd>{data(d.dona?.ultimo_acesso)}</dd></div>
            <div><dt>Telefone</dt><dd>{d.org.telefone ?? "—"}</dd></div>
            <div><dt>Fuso</dt><dd>{d.org.timezone}</dd></div>
            <div><dt>Criado em</dt><dd>{data(d.org.criado_em)}</dd></div>
          </dl>
        </section>

        <section className="card">
          <h2 className="card-title">Assinatura</h2>
          <dl className="info flat">
            <div><dt>Situação</dt><dd><span className={`sit sit-${sit}`}>{situacaoValida(sit) ? SITUACOES[sit] : sit}</span></dd></div>
            <div><dt>Plano</dt><dd>{d.assinatura?.plano_id ?? "—"}</dd></div>
            <div><dt>Teste até</dt><dd>{data(d.assinatura?.trial_ate)}</dd></div>
            <div><dt>Período até</dt><dd>{data(d.assinatura?.periodo_ate)}</dd></div>
            <div><dt>Em atraso desde</dt><dd>{data(d.assinatura?.inadimplente_desde)}</dd></div>
            <div><dt>Cobrança</dt><dd>{d.assinatura?.provedor ?? "ainda não vinculada"}</dd></div>
          </dl>
        </section>

        <section className="card">
          <h2 className="card-title">Uso</h2>
          <p className="muted small">Só contagens: o painel nunca mostra dados de pacientes.</p>
          <dl className="info flat">
            <div><dt>Pacientes ativos</dt><dd>{d.uso.pacientes_ativos}</dd></div>
            <div><dt>Atendimentos (30 dias)</dt><dd>{d.uso.atendimentos_30d}</dd></div>
            <div><dt>Evoluções (30 dias)</dt><dd>{d.uso.evolucoes_30d}</dd></div>
            <div><dt>Agendamento online</dt><dd>{d.uso.agendamento_online_ligado ? "ligado" : "desligado"}</dd></div>
          </dl>
        </section>
      </div>

      {podeAgir && (
        <>
          <h2 className="section">Ações</h2>
          <AcoesCliente
            org={d.org.id}
            emTeste={d.assinatura?.status === "trial"}
            status={d.assinatura?.status ?? ""}
            planoAtual={d.assinatura?.plano_id ?? ""}
            planos={(planos.data ?? []).filter((p) => p.ativo).map((p) => ({ id: p.id, nome: p.nome }))}
          />
        </>
      )}

      <h2 className="section">Recursos</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Situação</th>
              <th>Uso no mês</th>
              <th>Exceção</th>
            </tr>
          </thead>
          <tbody>
            {d.recursos.map((r) => (
              <tr key={r.id}>
                <td>{r.nome}</td>
                <td>{r.habilitado ? (r.tipo === "cota_mensal" ? `até ${r.limite ?? "sem limite"}` : "incluído") : "não incluído"}</td>
                <td className="num">{r.tipo === "cota_mensal" ? (d.uso.cotas_do_mes[r.id] ?? 0) : "—"}</td>
                <td>
                  {podeAgir ? (
                    <ExcecaoRecurso org={d.org.id} recurso={r.id} tipo={r.tipo} excecao={r.excecao} />
                  ) : r.excecao ? (
                    r.excecao.motivo
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section">Histórico do painel</h2>
      {acoes.length ? (
        <ul className="history">
          {acoes.map((h, i) => (
            <li key={i}>
              <b>{ACOES[h.acao] ?? h.acao}</b>
              {h.motivo && <> · {h.motivo}</>}
              <span className="muted small">
                {" "}
                · {new Date(h.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {h.admin ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">Nenhuma ação registrada.</div>
      )}
    </>
  );
}
