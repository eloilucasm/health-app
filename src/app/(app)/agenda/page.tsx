import type { Metadata } from "next";
import Link from "next/link";
import { AtendimentoForm } from "@/components/atendimento-form";
import { AtendimentoItem } from "@/components/atendimento-item";
import { CalendarioMes } from "@/components/calendario-mes";
import { Sheet } from "@/components/sheet";
import type { Atendimento } from "@/domain/agenda";
import {
  dataLonga,
  dataValida,
  diaDaSemana,
  diaMes,
  diasDoCalendario,
  inicioDaSemana,
  mesAno,
  noFuso,
  somarDias,
  somarMeses,
} from "@/domain/datas";
import { DIAS_SEMANA } from "@/domain/horarios";
import { listarAtendimentos } from "@/lib/agenda";
import { carregarConsultorio } from "@/lib/consultorio";
import { listarPacientes } from "@/lib/pacientes";
import { listarPacotes } from "@/lib/pacotes";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const [params, { dados: consultorio }] = await Promise.all([searchParams, carregarConsultorio()]);
  const hoje = noFuso(new Date(), consultorio.fuso).data;
  const data = dataValida(params.data) ? params.data : hoje;
  const ver = params.ver === "semana" || params.ver === "mes" ? params.ver : "dia";
  const semana = ver === "semana";
  const mes = ver === "mes";

  const calendario = mes ? diasDoCalendario(data) : [];
  const de = mes ? calendario[0] : semana ? inicioDaSemana(data) : data;
  const ate = mes ? calendario[calendario.length - 1] : semana ? somarDias(de, 6) : data;
  const [atendimentos, pacientes, pacotes] = await Promise.all([
    listarAtendimentos({ de, ate }),
    listarPacientes(),
    listarPacotes(),
  ]);
  const opcoes = pacientes.map(({ id, nome }) => ({ id, nome }));

  const url = (d: string, visao: string = ver) => `/agenda?data=${d}${visao === "dia" ? "" : `&ver=${visao}`}`;
  const mover = (sentido: 1 | -1) => (mes ? somarMeses(data, sentido) : somarDias(data, sentido * (semana ? 7 : 1)));
  const rotulos = mes ? ["Mês anterior", "Próximo mês"] : semana ? ["Semana anterior", "Próxima semana"] : ["Dia anterior", "Próximo dia"];
  const periodosDo = (d: string) => consultorio.periodos.filter((p) => p.weekday === diaDaSemana(d));

  const grupo = (d: string, itens: Atendimento[], titulo: string) => {
    const periodos = periodosDo(d);
    return (
      <section key={d} className={`daygroup${d === hoje ? " today" : ""}`}>
        <div className="dh">
          <h2>{titulo}</h2>
          <span>
            {itens.length ? `${itens.length} atendimento${itens.length > 1 ? "s" : ""}` : "livre"}
            {periodos.length > 0 && ` · ${periodos.map((p) => `${p.inicio}–${p.fim}`).join(", ")}`}
          </span>
        </div>
        {itens.length > 0 ? (
          <div className="list">
            {itens.map((a) => (
              <AtendimentoItem key={a.id} atendimento={a} pacientes={opcoes} pacotes={pacotes} />
            ))}
          </div>
        ) : (
          !semana && (
            <div className="empty">
              <b>{periodos.length ? "Dia livre" : "Fora dos horários de atendimento"}</b>
              Toque em + para agendar.
            </div>
          )
        )}
      </section>
    );
  };

  // Na semana, mostra os dias com atendimento ou com horário configurado.
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(de, i)).filter(
    (d) => periodosDo(d).length > 0 || atendimentos.some((a) => a.data === d),
  );

  return (
    <>
      <h1 className="title">Agenda</h1>
      <div className="toolbar">
        <nav className="seg" aria-label="Visualização">
          {[
            ["dia", "Dia"],
            ["semana", "Semana"],
            ["mes", "Mês"],
          ].map(([valor, nome]) => (
            <Link key={valor} href={url(data, valor)} aria-current={ver === valor ? "true" : undefined}>
              {nome}
            </Link>
          ))}
        </nav>
        <nav className="datenav" aria-label="Data">
          <Link className="round" href={url(mover(-1))} aria-label={rotulos[0]}>
            ‹
          </Link>
          <Link className="small-btn" href={url(hoje)}>
            Hoje
          </Link>
          <Link className="round" href={url(mover(1))} aria-label={rotulos[1]}>
            ›
          </Link>
        </nav>
      </div>

      {mes ? (
        <>
          <h2 className="month-title">{mesAno(data)}</h2>
          <CalendarioMes
            dias={calendario}
            mes={data.slice(0, 7)}
            hoje={hoje}
            atendimentos={atendimentos}
            periodos={consultorio.periodos}
          />
        </>
      ) : semana ? (
        <>
          <p className="muted">
            Semana de {diaMes(de)} a {diaMes(ate)}
          </p>
          {dias.length ? (
            dias.map((d) =>
              grupo(
                d,
                atendimentos.filter((a) => a.data === d),
                `${DIAS_SEMANA[diaDaSemana(d)].slice(0, 3)} ${diaMes(d)}`,
              ),
            )
          ) : (
            <div className="empty">Nenhum atendimento nem horário configurado nesta semana.</div>
          )}
        </>
      ) : (
        grupo(data, atendimentos, dataLonga(data))
      )}

      <Sheet titulo="Novo agendamento" classeGatilho="fab" rotuloGatilho="Novo agendamento" gatilho="+">
        <AtendimentoForm
          pacientes={opcoes}
          pacotes={pacotes}
          inicial={{
            pacienteId: "",
            descricao: "",
            data,
            hora: "",
            local: periodosDo(data)[0]?.local ?? "consultorio",
            status: "agendado",
            obs: "",
            pacoteId: "",
          }}
        />
      </Sheet>
    </>
  );
}
