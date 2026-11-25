import type { Metadata } from "next";
import Link from "next/link";
import { GraficoMeses } from "@/components/grafico-meses";
import { LancamentoForm, SaldoInicialForm } from "@/components/lancamento-form";
import { Sheet } from "@/components/sheet";
import { dataValida, diaMes, mesAno, noFuso, somarMeses } from "@/domain/datas";
import { formatarBRL } from "@/domain/dinheiro";
import { FORMAS, recebidoPorMes, resumoDoMes, saldoAte, type Lancamento } from "@/domain/financeiro";
import { carregarConsultorio } from "@/lib/consultorio";
import { carregarTotais, listarLancamentos } from "@/lib/financeiro";
import { listarPacientes } from "@/lib/pacientes";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const [params, { dados: consultorio }] = await Promise.all([searchParams, carregarConsultorio()]);
  const hoje = noFuso(new Date(), consultorio.fuso).data;
  const pedido = typeof params.mes === "string" ? `${params.mes}-01` : "";
  const mes = (dataValida(pedido) ? pedido : hoje).slice(0, 7);

  const [lancamentos, { totais, saldoInicial }, pacientes] = await Promise.all([
    listarLancamentos(mes),
    carregarTotais(),
    listarPacientes(),
  ]);
  const opcoes = pacientes.map(({ id, nome }) => ({ id, nome }));
  const nomes = new Map(opcoes.map((p) => [p.id, p.nome]));
  const resumo = resumoDoMes(totais, mes);

  const pendentes = lancamentos.filter((x) => x.tipo === "entrada" && x.status === "pendente");
  const demais = lancamentos.filter((x) => !pendentes.includes(x));
  const mover = (n: number) => `/financeiro?mes=${somarMeses(`${mes}-01`, n).slice(0, 7)}`;
  const titulo = (x: Lancamento) => x.descricao || nomes.get(x.pacienteId) || "Lançamento";

  const linha = (x: Lancamento) => (
    <Sheet
      key={x.id}
      titulo="Lançamento"
      classeGatilho={`lrow${x.status === "pendente" ? " pend" : ""}`}
      gatilho={
        <>
          <b>{titulo(x)}</b>
          <span className={`amt ${x.tipo}`}>
            {x.tipo === "saida" ? "− " : "+ "}
            {formatarBRL(x.valorCentavos)}
          </span>
          <span className="lmeta">
            {[diaMes(x.data), x.forma && FORMAS[x.forma], x.status === "pendente" && "pendente", x.obs]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      }
    >
      <LancamentoForm lancamento={x} pacientes={opcoes} hoje={hoje} />
    </Sheet>
  );

  return (
    <>
      <h1 className="title">Financeiro</h1>
      <nav className="datenav month-nav" aria-label="Mês">
        <Link className="round" href={mover(-1)} aria-label="Mês anterior">
          ‹
        </Link>
        <b>{mesAno(`${mes}-01`)}</b>
        <Link className="round" href={mover(1)} aria-label="Próximo mês">
          ›
        </Link>
      </nav>

      <div className="kpis">
        <div className="kpi hero">
          <span className="k-label">Saldo do mês</span>
          <b className="k-val">{formatarBRL(resumo.saldo)}</b>
          <span className="k-note">Saldo acumulado {formatarBRL(saldoAte(totais, mes, saldoInicial))}</span>
        </div>
        <div className="kpi">
          <span className="k-label">Recebido</span>
          <b className="k-val money">{formatarBRL(resumo.recebido)}</b>
        </div>
        <div className="kpi">
          <span className="k-label">Saídas</span>
          <b className="k-val money">{formatarBRL(resumo.saidas)}</b>
        </div>
        <div className="kpi wide">
          <span className="k-label">A receber no mês</span>
          <b className="k-val money">{formatarBRL(resumo.pendente)}</b>
        </div>
      </div>

      {pendentes.length > 0 && (
        <>
          <h2 className="section">Pendências</h2>
          <div className="ledger">{pendentes.map(linha)}</div>
        </>
      )}

      <h2 className="section">Lançamentos ({demais.length})</h2>
      {demais.length ? (
        <div className="ledger">{demais.map(linha)}</div>
      ) : (
        <div className="empty">
          <b>Nenhum lançamento neste mês</b>
          Toque em + para registrar um recebimento ou uma saída.
        </div>
      )}

      <h2 className="section">No ano</h2>
      <div className="list">
        <GraficoMeses dados={recebidoPorMes(totais, mes)} />
        <Sheet titulo="Saldo inicial" gatilho={`Saldo inicial: ${formatarBRL(saldoInicial)}`}>
          <SaldoInicialForm saldoInicial={saldoInicial} />
        </Sheet>
      </div>

      <Sheet titulo="Novo lançamento" classeGatilho="fab" rotuloGatilho="Novo lançamento" gatilho="+">
        <LancamentoForm pacientes={opcoes} hoje={hoje} />
      </Sheet>
    </>
  );
}
