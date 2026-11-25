/** Cores oferecidas à profissional. Todas legíveis com texto branco por cima (RNF-06). */
export const CORES = [
  { valor: "#b8465c", nome: "Rosé" },
  { valor: "#8a4fa8", nome: "Lavanda" },
  { valor: "#2f6db5", nome: "Azul" },
  { valor: "#14746f", nome: "Verde-água" },
  { valor: "#3f7a4a", nome: "Verde" },
  { valor: "#a8552b", nome: "Terracota" },
] as const;

export const COR_PADRAO: string = CORES[0].valor;

/** Só aceita cores da lista: o valor vai para o CSS da página. */
export function corValida(cor: unknown): string {
  return CORES.find((c) => c.valor === cor)?.valor ?? COR_PADRAO;
}
