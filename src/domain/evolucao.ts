/** Formulários da profissão (D-03, D-41): leitura e validação a partir do esquema JSON. */
import { dataValida } from "./datas";

export const TIPOS_CAMPO = ["text", "textarea", "scale", "chips", "number", "date", "select", "computed", "section"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export type Campo = {
  key: string;
  label: string;
  type: TipoCampo;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  legend?: string[];
  /** Mostrar a curva deste campo na ficha (números e escalas). */
  chart?: boolean;
  options?: string[];
  optionsFrom?: "procedimentos";
  /** Campos calculados: hoje só "imc" (peso em kg e altura em cm). */
  formula?: "imc";
  inputs?: string[];
};

export type Esquema = { version: number; fields: Campo[] };

export type Valor = string | number | string[];
export type Conteudo = Record<string, Valor>;

/** Campos que guardam valor (seção é só um título). */
export const campoComValor = (c: Campo) => c.type !== "section";
export const campoNumerico = (c: Campo) => c.type === "number" || c.type === "scale" || c.type === "computed";

/** Valor de um campo calculado, ou undefined se faltar algum dado. */
export function calcular(campo: Campo, conteudo: Record<string, unknown>): number | undefined {
  if (campo.type !== "computed" || campo.formula !== "imc") return undefined;
  const [chavePeso = "peso", chaveAltura = "altura"] = campo.inputs ?? [];
  const numero = (v: unknown) => Number(typeof v === "string" ? v.replace(",", ".") : v);
  const peso = numero(conteudo[chavePeso]);
  const alturaM = numero(conteudo[chaveAltura]) / 100;
  if (!(peso > 0) || !(alturaM > 0)) return undefined;
  return Math.round((peso / (alturaM * alturaM)) * 10) / 10;
}

/** Devolve só o que o esquema conhece, no tipo certo. Campos vazios não entram; calculados são refeitos. */
export function lerConteudo(esquema: Esquema, bruto: unknown): { conteudo: Conteudo; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const conteudo: Conteudo = {};

  for (const campo of esquema.fields) {
    if (campo.type === "section" || campo.type === "computed") continue;
    const v = Object.hasOwn(b, campo.key) ? b[campo.key] : undefined;
    if (v === undefined || v === null || v === "") continue;

    if (campo.type === "scale" || campo.type === "number") {
      const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
      const fora = n < (campo.min ?? -Infinity) || n > (campo.max ?? Infinity);
      if (!Number.isFinite(n) || fora || (campo.type === "scale" && !Number.isInteger(n))) {
        return { conteudo: {}, erro: `${campo.label}: valor inválido.` };
      }
      conteudo[campo.key] = campo.type === "number" ? Math.round(n * 100) / 100 : n;
    } else if (campo.type === "chips") {
      const itens = Array.isArray(v)
        ? v.filter((i): i is string => typeof i === "string").map((i) => i.trim().slice(0, 80))
        : [];
      if (itens.length) conteudo[campo.key] = [...new Set(itens.filter(Boolean))].slice(0, 50);
    } else if (campo.type === "select") {
      if (typeof v !== "string" || !(campo.options ?? []).includes(v)) {
        return { conteudo: {}, erro: `${campo.label}: escolha uma das opções.` };
      }
      conteudo[campo.key] = v;
    } else if (campo.type === "date") {
      if (!dataValida(v)) return { conteudo: {}, erro: `${campo.label}: data inválida.` };
      conteudo[campo.key] = v;
    } else if (typeof v === "string") {
      const texto = v.trim().slice(0, campo.type === "text" ? 200 : 5000);
      if (texto) conteudo[campo.key] = texto;
    }
  }

  for (const campo of esquema.fields) {
    const valor = calcular(campo, conteudo);
    if (valor !== undefined) conteudo[campo.key] = valor;
  }

  const erro = Object.keys(conteudo).length ? null : "Preencha pelo menos um campo.";
  return { conteudo, erro };
}

/** Texto de um valor para exibição: listas com vírgula, números com unidade. */
export function formatarValor(campo: Campo | undefined, valor: Valor): string {
  if (Array.isArray(valor)) return valor.join(", ");
  if (typeof valor === "number") {
    const n = valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return campo?.unit ? `${n} ${campo.unit}` : n;
  }
  return valor;
}

/** "algumaChave" → "Alguma chave": rótulo para campos que saíram do modelo atual. */
export function rotuloGenerico(chave: string): string {
  const t = chave.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
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
