/** Dinheiro sempre em centavos inteiros (RNF-04). */

const FORMATO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatarBRL = (centavos: number) => FORMATO.format(centavos / 100);

/** "R$ 1.234,56", "1234,5" ou "150" → centavos. null se vazio ou inválido. */
export function lerCentavos(texto: string): number | null {
  let s = texto.replace(/[R$\s ]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const centavos = Math.round(Number(s) * 100);
  return centavos <= 100_000_000_00 ? centavos : null;
}
