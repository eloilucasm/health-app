import { formatarBRL } from "@/domain/dinheiro";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Recebimentos por mês do ano, do protótipo. O último mês é o destacado. */
export function GraficoMeses({ dados }: { dados: { mes: string; total: number }[] }) {
  const L = 340;
  const A = 150;
  const topo = 18;
  const base = 22;
  const largura = L / dados.length;
  const maximo = Math.max(100_000, ...dados.map((d) => d.total));
  const teto = Math.ceil(maximo / 100_000) * 100_000;
  const ano = dados[0]?.mes.slice(0, 4);

  return (
    <figure className="chart">
      <figcaption>
        <span>Recebimentos em {ano}</span>
        <span>Linha superior: {formatarBRL(teto)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${L} ${A}`}
        role="img"
        aria-label={`Recebimentos em ${ano}: ${dados.map((d) => `${MESES[Number(d.mes.slice(5)) - 1]} ${formatarBRL(d.total)}`).join(", ")}`}
      >
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1="0" x2={L} y1={topo + (A - topo - base) * (1 - f)} y2={topo + (A - topo - base) * (1 - f)} stroke="var(--line)" />
        ))}
        {dados.map((d, i) => {
          const altura = ((A - topo - base) * d.total) / teto;
          const x = i * largura + largura * 0.18;
          const atual = i === dados.length - 1;
          return (
            <g key={d.mes}>
              <rect
                x={x}
                y={A - base - altura}
                width={largura * 0.64}
                height={Math.max(altura, 1)}
                rx="4"
                fill="var(--rose)"
                opacity={atual ? 1 : 0.45}
              />
              <text x={i * largura + largura / 2} y={A - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {MESES[Number(d.mes.slice(5)) - 1]}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
