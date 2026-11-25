import { carregarConsultorio } from "@/lib/consultorio";
import { DIAS_SEMANA } from "@/domain/horarios";

// Versão provisória: atendimentos, indicadores e alertas chegam no Dia 4 (RF-09).
export default async function Hoje() {
  const { dados } = await carregarConsultorio();
  const agora = new Date();
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: dados.fuso }).format(agora),
  );
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: dados.fuso,
  }).format(agora);
  // Dia da semana no fuso do consultório (0 = domingo).
  const hojeIso = new Intl.DateTimeFormat("en-CA", { timeZone: dados.fuso }).format(agora);
  const dia = new Date(`${hojeIso}T12:00:00Z`).getUTCDay();
  const periodos = dados.periodos.filter((p) => p.weekday === dia);

  return (
    <>
      <h1 className="title">{saudacao}</h1>
      <p className="muted capitalize-first">{data}</p>
      <h2 className="section">Seu horário hoje</h2>
      <div className="empty">
        {periodos.length ? (
          <>
            <b>{periodos.map((p) => `${p.inicio}–${p.fim}`).join(" e ")}</b>
            {DIAS_SEMANA[dia]}
          </>
        ) : (
          <>
            <b>Sem atendimento programado</b>
            {DIAS_SEMANA[dia]} está fora dos seus horários.
          </>
        )}
      </div>
    </>
  );
}
