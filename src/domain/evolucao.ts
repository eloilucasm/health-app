/** Formulários da especialidade (D-03): leitura e validação a partir do esquema JSON. */
import { dataValida } from "./datas";

export type Campo = {
  key: string;
  label: string;
  type: "text" | "textarea" | "scale" | "chips" | "number" | "date";
  placeholder?: string;
  min?: number;
  max?: number;
  legend?: string[];
  chart?: boolean;
  options?: string[];
  optionsFrom?: "procedimentos";
};

export type Esquema = { version: number; fields: Campo[] };

export type Conteudo = Record<string, string | number | string[]>;

/** Devolve só o que o esquema conhece, no tipo certo. Campos vazios não entram. */
export function lerConteudo(esquema: Esquema, bruto: unknown): { conteudo: Conteudo; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const conteudo: Conteudo = {};

  for (const campo of esquema.fields) {
    const v = Object.hasOwn(b, campo.key) ? b[campo.key] : undefined;
    if (v === undefined || v === null || v === "") continue;

    if (campo.type === "scale" || campo.type === "number") {
      const n = Number(v);
      const fora = n < (campo.min ?? -Infinity) || n > (campo.max ?? Infinity);
      if (!Number.isFinite(n) || fora || (campo.type === "scale" && !Number.isInteger(n))) {
        return { conteudo: {}, erro: `${campo.label}: valor inválido.` };
      }
      conteudo[campo.key] = n;
    } else if (campo.type === "chips") {
      const itens = Array.isArray(v)
        ? v.filter((i): i is string => typeof i === "string").map((i) => i.trim().slice(0, 80))
        : [];
      if (itens.length) conteudo[campo.key] = [...new Set(itens.filter(Boolean))].slice(0, 50);
    } else if (campo.type === "date") {
      if (!dataValida(v)) return { conteudo: {}, erro: `${campo.label}: data inválida.` };
      conteudo[campo.key] = v;
    } else if (typeof v === "string") {
      const texto = v.trim().slice(0, campo.type === "text" ? 200 : 5000);
      if (texto) conteudo[campo.key] = texto;
    }
  }

  const erro = Object.keys(conteudo).length ? null : "Preencha pelo menos um campo.";
  return { conteudo, erro };
}

// Cores da escala de dor, de 0 a 10 (protótipo, linha 281).
const CORES_EVA = [
  "#3E9B6A", "#5AA460", "#7DAA55", "#A0AE4C", "#C0AA45", "#D59A41",
  "#DE863F", "#DD7140", "#D85E48", "#CE4C55", "#C03B5E",
];

export function corDaEscala(valor: number, min = 0, max = 10): string {
  const posicao = max > min ? (valor - min) / (max - min) : 0;
  return CORES_EVA[Math.max(0, Math.min(10, Math.round(posicao * 10)))];
}
