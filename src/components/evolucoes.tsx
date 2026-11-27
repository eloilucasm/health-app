import Link from "next/link";
import { dataCurta } from "@/domain/datas";
import {
  campoComValor,
  campoNumerico,
  corDaEscala,
  formatarValor,
  rotuloGenerico,
  type Campo,
  type Esquema,
} from "@/domain/evolucao";
import type { Evolucao } from "@/lib/evolucao";

/** Curva de um campo numérico marcado com "chart" (dor na fisioterapia, peso na nutrição…). */
function Curva({ campo, evolucoes }: { campo: Campo; evolucoes: Evolucao[] }) {
  const pontos = evolucoes
    .filter((e) => typeof e.conteudo[campo.key] === "number")
    .map((e) => e.conteudo[campo.key] as number)
    .reverse();
  if (pontos.length < 2) return null;

  const escala = campo.type === "scale";
  const min = escala ? (campo.min ?? 0) : Math.min(...pontos);
  const max = escala ? (campo.max ?? 10) : Math.max(...pontos);
  const faixa = max - min || 1;
  const L = 320;
  const A = 70;
  const xy = pontos.map((v, i) => [(i / (pontos.length - 1)) * (L - 20) + 10, A - 10 - ((v - min) / faixa) * (A - 24)]);
  const primeiro = formatarValor(campo, pontos[0]);
  const ultimo = formatarValor(campo, pontos[pontos.length - 1]);

  return (
    <figure className="chart">
      <figcaption>
        <span>{campo.label}</span>
        <span>
          {primeiro} → {ultimo}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${campo.label}: de ${primeiro} para ${ultimo}`}>
        <line x1="0" x2={L} y1={A - 10} y2={A - 10} stroke="var(--line)" />
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--rose)" strokeWidth="2.2" />
        {xy.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === xy.length - 1 ? 4.5 : 3}
            fill={escala ? corDaEscala(pontos[i], campo.min, campo.max) : "var(--rose)"}
          />
        ))}
      </svg>
    </figure>
  );
}

/**
 * Registros do paciente. Cada um é exibido com o formulário da versão em que foi
 * feito (D-42); campos que não existem mais aparecem com um rótulo genérico.
 */
export function Evolucoes({
  esquema,
  versoes,
  evolucoes,
  vazio,
}: {
  esquema: Esquema;
  versoes: Record<number, Esquema>;
  evolucoes: Evolucao[];
  vazio: string;
}) {
  if (!evolucoes.length) return <div className="empty">{vazio}</div>;
  const graficos = esquema.fields.filter((c) => campoNumerico(c) && c.chart);

  return (
    <div className="list">
      {graficos.map((c) => (
        <Curva key={c.key} campo={c} evolucoes={evolucoes} />
      ))}
      {evolucoes.map((e) => {
        const campos = (versoes[e.versaoModelo] ?? esquema).fields.filter(campoComValor);
        const escala = campos.find((c) => c.type === "scale");
        const nota = escala ? e.conteudo[escala.key] : undefined;
        const conhecidos = new Set(campos.map((c) => c.key));
        const linhas = [
          ...campos.filter((c) => c !== escala && e.conteudo[c.key] !== undefined).map((c) => ({ chave: c.key, campo: c, rotulo: c.label })),
          ...Object.keys(e.conteudo)
            .filter((k) => !conhecidos.has(k))
            .map((k) => ({ chave: k, campo: undefined, rotulo: rotuloGenerico(k) })),
        ];
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
            {linhas.map((l) => (
              <span key={l.chave} className="ev-field">
                <em>{l.rotulo}</em>
                {formatarValor(l.campo, e.conteudo[l.chave])}
              </span>
            ))}
          </Link>
        );
      })}
    </div>
  );
}
