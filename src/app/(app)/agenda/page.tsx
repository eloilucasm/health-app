import type { Metadata } from "next";
import Link from "next/link";
import { AtendimentoForm } from "@/components/atendimento-form";
import { AtendimentoItem } from "@/components/atendimento-item";
import { Sheet } from "@/components/sheet";
import type { Atendimento } from "@/domain/agenda";
import { dataLonga, dataValida, diaDaSemana, diaMes, inicioDaSemana, noFuso, somarDias } from "@/domain/datas";
import { DIAS_SEMANA } from "@/domain/horarios";
import { listarAtendimentos } from "@/lib/agenda";
import { carregarConsultorio } from "@/lib/consultorio";
import { listarPacientes } from "@/lib/pacientes";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const [params, { dados: consultorio }] = await Promise.all([searchParams, carregarConsultorio()]);
  const hoje = noFuso(new Date(), consultorio.fuso).data;
  const data = dataValida(params.data) ? params.data : hoje;
  const semana = params.ver === "semana";

  const de = semana ? inicioDaSemana(data) : data;
  const ate = semana ? somarDias(de, 6) : data;
  const [atendimentos, pacientes] = await Promise.all([listarAtendimentos({ de, ate }), listarPacientes()]);
  const opcoes = pacientes.map(({ id, nome }) => ({ id, nome }));

  const url = (d: string, ver = semana) => `/agenda?data=${d}${ver ? "&ver=semana" : ""}`;
  const passo = semana ? 7 : 1;
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
              <AtendimentoItem key={a.id} atendimento={a} pacientes={opcoes} />
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
          <Link href={url(data, false)} aria-current={!semana ? "true" : undefined}>
            Dia
          </Link>
          <Link href={url(data, true)} aria-current={semana ? "true" : undefined}>
            Semana
          </Link>
        </nav>
        <nav className="datenav" aria-label="Data">
          <Link className="round" href={url(somarDias(data, -passo))} aria-label={semana ? "Semana anterior" : "Dia anterior"}>
            ‹
          </Link>
          <Link className="small-btn" href={url(hoje)}>
            Hoje
          </Link>
          <Link className="round" href={url(somarDias(data, passo))} aria-label={semana ? "Próxima semana" : "Próximo dia"}>
            ›
          </Link>
        </nav>
      </div>

      {semana ? (
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
          inicial={{
            pacienteId: "",
            descricao: "",
            data,
            hora: "",
            local: periodosDo(data)[0]?.local ?? "consultorio",
            status: "agendado",
            obs: "",
          }}
        />
      </Sheet>
    </>
  );
}
