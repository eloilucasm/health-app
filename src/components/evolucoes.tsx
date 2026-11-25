import Link from "next/link";
import { dataCurta } from "@/domain/datas";
import { corDaEscala, type Campo, type Esquema } from "@/domain/evolucao";
import type { Evolucao } from "@/lib/evolucao";

/** Curva do primeiro campo de escala marcado com "chart" (dor, na fisioterapia). */
function Curva({ campo, evolucoes }: { campo: Campo; evolucoes: Evolucao[] }) {
  const pontos = evolucoes
    .filter((e) => typeof e.conteudo[campo.key] === "number")
    .map((e) => e.conteudo[campo.key] as number)
    .reverse();
  if (pontos.length < 2) return null;

  const min = campo.min ?? 0;
  const max = campo.max ?? 10;
  const L = 320;
  const A = 70;
  const xy = pontos.map((v, i) => [
    (i / (pontos.length - 1)) * (L - 20) + 10,
    A - 10 - ((v - min) / (max - min)) * (A - 24),
  ]);

  return (
    <figure className="chart">
      <figcaption>
        <span>{campo.label}</span>
        <span>
          {pontos[0]} → {pontos[pontos.length - 1]}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${campo.label}: de ${pontos[0]} para ${pontos.at(-1)}`}>
        <line x1="0" x2={L} y1={A - 10} y2={A - 10} stroke="var(--line)" />
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--rose)" strokeWidth="2.2" />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 4.5 : 3} fill={corDaEscala(pontos[i], min, max)} />
        ))}
      </svg>
    </figure>
  );
}

export function Evolucoes({ esquema, evolucoes }: { esquema: Esquema; evolucoes: Evolucao[] }) {
  if (!evolucoes.length) return <div className="empty">Nenhuma evolução registrada.</div>;
  const grafico = esquema.fields.find((c) => c.type === "scale" && c.chart);
  const escala = esquema.fields.find((c) => c.type === "scale");

  return (
    <div className="list">
      {grafico && <Curva campo={grafico} evolucoes={evolucoes} />}
      {evolucoes.map((e) => {
        const nota = escala ? e.conteudo[escala.key] : undefined;
        return (
          <Link key={e.grupoId} href={`/pacientes/${e.pacienteId}/evolucao?registro=${e.grupoId}`} className="evo">
            <span className="eh">
              <b>
                {dataCurta(e.data)}
                {e.versao > 1 && <small className="muted"> · editada</small>}
              </b>
              {escala && typeof nota === "number" && (
                <span className="eva">
                  {escala.key === "dor" ? "EVA" : escala.label}{" "}
                  <i style={{ background: corDaEscala(nota, escala.min, escala.max) }}>{nota}</i>
                </span>
              )}
            </span>
            {esquema.fields
              .filter((c) => c.type !== "scale" && e.conteudo[c.key] !== undefined)
              .map((c) => {
                const v = e.conteudo[c.key];
                return (
                  <span key={c.key} className="ev-field">
                    <em>{c.label}</em>
                    {Array.isArray(v) ? v.join(", ") : v}
                  </span>
                );
              })}
          </Link>
        );
      })}
    </div>
  );
}
