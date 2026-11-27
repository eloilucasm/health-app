import Link from "next/link";
import { AtendimentoForm } from "@/components/atendimento-form";
import { AtendimentoItem } from "@/components/atendimento-item";
import { GraficoMeses } from "@/components/grafico-meses";
import { Sheet } from "@/components/sheet";
import { dataLonga, inicioDaSemana, mesAno, noFuso, somarDias, somarMeses } from "@/domain/datas";
import { formatarBRL } from "@/domain/dinheiro";
import { recebidoPorMes, resumoDoMes } from "@/domain/financeiro";
import { indicadores } from "@/domain/indicadores";
import { acabando, usoDoPacote } from "@/domain/pacotes";
import { listarAtendimentos } from "@/lib/agenda";
import { carregarConsultorio } from "@/lib/consultorio";
import { carregarTotais } from "@/lib/financeiro";
import { listarPacientes } from "@/lib/pacientes";
import { listarPacotes } from "@/lib/pacotes";
import { capitalizar } from "@/domain/profissao";
import { carregarProfissao } from "@/lib/profissao";

export default async function Hoje() {
  const [{ dados: consultorio }, profissao] = await Promise.all([carregarConsultorio(), carregarProfissao()]);
  const agora = noFuso(new Date(), consultorio.fuso);
  const hoje = agora.data;
  const hora = Number(agora.hora.slice(0, 2));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // Janela dos indicadores: 45 dias para trás até os próximos 30.
  const menor = (a: string, b: string) => (a < b ? a : b);
  const maior = (a: string, b: string) => (a > b ? a : b);
  const de = [somarDias(hoje, -45), somarMeses(hoje, 0), inicioDaSemana(hoje)].reduce(menor);
  const ate = [somarDias(hoje, 30), somarDias(somarMeses(hoje, 1), -1)].reduce(maior);

  const [atendimentos, semBaixa, pacientes, pacotes, { totais, pendencias }] = await Promise.all([
    listarAtendimentos({ de, ate }),
    listarAtendimentos({ semBaixaAntes: hoje }),
    listarPacientes(),
    listarPacotes(),
    carregarTotais(),
  ]);
  const mes = hoje.slice(0, 7);
  const financeiro = resumoDoMes(totais, mes);
  const opcoes = pacientes.map(({ id, nome }) => ({ id, nome }));

  const deHoje = atendimentos.filter((a) => a.data === hoje);
  const proximoDia = atendimentos.find((a) => a.data > hoje && a.status !== "cancelado")?.data;
  const numeros = indicadores(atendimentos, hoje);
  const pacotesAcabando = acabando(pacotes);

  const linha = (a: (typeof atendimentos)[number], mostrarData = false) => (
    <AtendimentoItem key={a.id} atendimento={a} pacientes={opcoes} pacotes={pacotes} mostrarData={mostrarData} />
  );

  return (
    <>
      <h1 className="title">{saudacao}</h1>
      <p className="muted">{dataLonga(hoje)}</p>

      <h2 className="section">Atendimentos de hoje</h2>
      {deHoje.length ? (
        <div className="list">{deHoje.map((a) => linha(a))}</div>
      ) : (
        <div className="empty">
          <b>Nenhum atendimento hoje</b>
          {proximoDia ? `Próximo dia com agenda: ${dataLonga(proximoDia).toLowerCase()}` : "Toque em + para agendar."}
        </div>
      )}
      {!deHoje.length && proximoDia && (
        <div className="list">{atendimentos.filter((a) => a.data === proximoDia).map((a) => linha(a, true))}</div>
      )}

      {profissao.recursos.pacotes && pacotesAcabando.length > 0 && (
        <>
          <h2 className="section">Pacotes acabando</h2>
          <div className="list">
            {pacotesAcabando.map((p) => {
              const { restantes, total } = usoDoPacote(p);
              return (
                <Link key={p.id} href={`/pacientes/${p.pacienteId}`} className="prow">
                  <span className="dot" aria-hidden="true" />
                  <span className="p-body">
                    <b>
                      {p.pacienteNome}:{" "}
                      {restantes === 0 ? "pacote concluído" : restantes === 1 ? "resta 1 sessão" : `restam ${restantes} sessões`}
                    </b>
                    <span>Pacote de {total} sessões</span>
                  </span>
                  <span aria-hidden="true" className="muted">
                    ›
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {pendencias.quantidade > 0 && (
        <>
          <h2 className="section">A receber</h2>
          <div className="list">
            <Link href="/financeiro" className="prow">
              <span className="dot" aria-hidden="true" />
              <span className="p-body">
                <b>
                  {pendencias.quantidade} recebimento{pendencias.quantidade > 1 ? "s" : ""} pendente
                  {pendencias.quantidade > 1 ? "s" : ""}
                </b>
                <span>{formatarBRL(pendencias.total)} no total</span>
              </span>
              <span aria-hidden="true" className="muted">
                ›
              </span>
            </Link>
          </div>
        </>
      )}

      {semBaixa.length > 0 && (
        <>
          <h2 className="section">Sem baixa ({semBaixa.length})</h2>
          <p className="muted small">Já passaram e seguem como agendado ou confirmado. Marque realizado ou faltou.</p>
          <div className="list">{semBaixa.slice(0, 10).map((a) => linha(a, true))}</div>
        </>
      )}

      <h2 className="section">Indicadores de {mesAno(hoje).split(" ")[0].toLowerCase()}</h2>
      <div className="kpis">
        <div className="kpi hero">
          <span className="k-label">Recebido no mês</span>
          <b className="k-val">{formatarBRL(financeiro.recebido)}</b>
          <span className="k-note">
            {financeiro.pendente ? `${formatarBRL(financeiro.pendente)} a receber` : "Sem pendências no mês"} · saldo do
            mês {formatarBRL(financeiro.saldo)}
          </span>
        </div>
        {[
          ["Atendimentos na semana", numeros.atendimentosNaSemana, `${numeros.realizadosNaSemana} realizado${numeros.realizadosNaSemana === 1 ? "" : "s"}`],
          [`${capitalizar(profissao.termos.atendimentos)} no mês`, numeros.sessoesNoMes, "realizadas"],
          ["Faltas no mês", numeros.faltasNoMes, `${numeros.taxaDeFaltas}% das ${profissao.termos.atendimentos}`],
          ["Pacientes ativos", numeros.pacientesAtivos, "atendidos ou agendados em 45 dias"],
        ].map(([rotulo, valor, nota]) => (
          <div key={rotulo} className="kpi">
            <span className="k-label">{rotulo}</span>
            <b className="k-val">{valor}</b>
            <span className="k-note">{nota}</span>
          </div>
        ))}
      </div>

      <h2 className="section">Entradas por mês</h2>
      <div className="list">
        <GraficoMeses dados={recebidoPorMes(totais, mes)} />
      </div>

      <Sheet titulo="Novo agendamento" classeGatilho="fab" rotuloGatilho="Novo agendamento" gatilho="+">
        <AtendimentoForm
          pacientes={opcoes}
          pacotes={pacotes}
          inicial={{
            pacienteId: "",
            descricao: "",
            data: hoje,
            hora: "",
            local: "consultorio",
            status: "agendado",
            obs: "",
            pacoteId: "",
            tipo: "",
          }}
        />
      </Sheet>
    </>
  );
}
