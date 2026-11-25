import Link from "next/link";
import type { Atendimento } from "@/domain/agenda";
import { dataLonga, diaDaSemana } from "@/domain/datas";
import type { Periodo } from "@/domain/horarios";

const CABECALHO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Calendário do mês: quantidade por dia; tocar abre a visão de dia. */
export function CalendarioMes({
  dias,
  mes,
  hoje,
  atendimentos,
  periodos,
}: {
  dias: string[];
  /** "AAAA-MM" do mês exibido. */
  mes: string;
  hoje: string;
  atendimentos: Atendimento[];
  periodos: Periodo[];
}) {
  const porDia = new Map<string, number>();
  for (const a of atendimentos) {
    if (a.status !== "cancelado") porDia.set(a.data, (porDia.get(a.data) ?? 0) + 1);
  }

  return (
    <div className="month">
      <div className="month-head" aria-hidden="true">
        {CABECALHO.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="month-grid">
        {dias.map((d) => {
          const total = porDia.get(d) ?? 0;
          const atende = periodos.some((p) => p.weekday === diaDaSemana(d));
          const classes = [
            "cell",
            d.startsWith(mes) ? "" : "out",
            d === hoje ? "today" : "",
            atende ? "" : "off",
          ];
          return (
            <Link
              key={d}
              href={`/agenda?data=${d}`}
              className={classes.filter(Boolean).join(" ")}
              aria-label={`${dataLonga(d)}: ${total} atendimento${total === 1 ? "" : "s"}`}
              aria-current={d === hoje ? "date" : undefined}
            >
              <span>{Number(d.slice(8))}</span>
              {total > 0 && <b>{total}</b>}
            </Link>
          );
        })}
      </div>
      <p className="muted small">Os dias em branco são os seus dias de atendimento e o número é a quantidade marcada. Toque num dia para abrir.</p>
    </div>
  );
}
