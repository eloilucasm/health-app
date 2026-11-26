import type { Metadata } from "next";
import Link from "next/link";
import { SITUACOES, situacaoValida } from "@/domain/assinatura";
import { dataCurta } from "@/domain/datas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 50;

type Cliente = {
  org_id: string;
  nome: string;
  slug: string;
  especialidade: string;
  dona_email: string | null;
  plano: string | null;
  situacao: string;
  trial_ate: string | null;
  criado_em: string;
  ultimo_acesso: string | null;
  atendimentos_30d: number;
  total: number;
};

export default async function ClientesPage({ searchParams }: PageProps<"/admin/clientes">) {
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 80) : "";
  const situacao = situacaoValida(params.situacao) ? params.situacao : "";
  const plano = typeof params.plano === "string" ? params.plano.slice(0, 40) : "";
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const supabase = await createClient();
  const [lista, planos] = await Promise.all([
    supabase.rpc("admin_listar_clientes", {
      p_busca: busca || null,
      p_situacao: situacao || null,
      p_plano: plano || null,
      p_limite: POR_PAGINA,
      p_deslocamento: (pagina - 1) * POR_PAGINA,
    }),
    supabase.from("plans").select("id, nome").order("ordem"),
  ]);
  if (lista.error) throw new Error(`Falha ao listar clientes: ${lista.error.message}`);
  const clientes = (lista.data ?? []) as Cliente[];
  const total = clientes[0]?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (p: number) =>
    `/admin/clientes?${new URLSearchParams({ ...(busca && { busca }), ...(situacao && { situacao }), ...(plano && { plano }), pagina: String(p) })}`;

  return (
    <>
      <h1 className="title">Clientes</h1>
      <form className="filters" action="/admin/clientes">
        <input className="input" name="busca" defaultValue={busca} placeholder="Nome, endereço ou e-mail" aria-label="Buscar" />
        <select className="input" name="situacao" defaultValue={situacao} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(SITUACOES).map(([valor, nome]) => (
            <option key={valor} value={valor}>
              {nome}
            </option>
          ))}
        </select>
        <select className="input" name="plano" defaultValue={plano} aria-label="Plano">
          <option value="">Todos os planos</option>
          {(planos.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          Filtrar
        </button>
      </form>

      <p className="muted small">
        {total} cliente{total === 1 ? "" : "s"}
      </p>
      {clientes.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Consultório</th>
                <th>Dona</th>
                <th>Plano</th>
                <th>Situação</th>
                <th>Atend. 30 dias</th>
                <th>Último acesso</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.org_id}>
                  <td>
                    <Link href={`/admin/clientes/${c.org_id}`}>
                      <b>{c.nome}</b>
                    </Link>
                    <br />
                    <span className="muted small">{c.especialidade}</span>
                  </td>
                  <td>{c.dona_email ?? "—"}</td>
                  <td>{c.plano ?? "—"}</td>
                  <td>
                    <span className={`sit sit-${c.situacao}`}>
                      {situacaoValida(c.situacao) ? SITUACOES[c.situacao] : c.situacao}
                    </span>
                    {c.situacao === "teste" && c.trial_ate && (
                      <span className="muted small"> até {dataCurta(c.trial_ate)}</span>
                    )}
                  </td>
                  <td className="num">{c.atendimentos_30d}</td>
                  <td>{c.ultimo_acesso ? dataCurta(c.ultimo_acesso.slice(0, 10)) : "—"}</td>
                  <td>{dataCurta(c.criado_em.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhum cliente encontrado.</div>
      )}

      {paginas > 1 && (
        <nav className="pager" aria-label="Páginas">
          {pagina > 1 && <Link href={url(pagina - 1)}>‹ Anterior</Link>}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && <Link href={url(pagina + 1)}>Próxima ›</Link>}
        </nav>
      )}
    </>
  );
}
