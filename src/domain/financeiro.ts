/** Regras do financeiro, portadas do protótipo (legacy/index.html, linhas 348–359). */

export const FORMAS = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  outro: "Outro",
} as const;
export type Forma = keyof typeof FORMAS;

export type Tipo = "entrada" | "saida";
export type Situacao = "recebido" | "pendente";

export type Lancamento = {
  id: string;
  tipo: Tipo;
  valorCentavos: number;
  data: string;
  forma: Forma | "";
  status: Situacao;
  descricao: string;
  pacienteId: string;
  atendimentoId: string;
  obs: string;
};

/** Total de um mês ("AAAA-MM") por tipo e situação. */
export type TotalMensal = { mes: string; tipo: Tipo; status: Situacao; total: number };

const somar = (itens: TotalMensal[], filtro: (t: TotalMensal) => boolean) =>
  itens.filter(filtro).reduce((s, t) => s + t.total, 0);

export function resumoDoMes(totais: TotalMensal[], mes: string) {
  const doMes = totais.filter((t) => t.mes === mes);
  const recebido = somar(doMes, (t) => t.tipo === "entrada" && t.status !== "pendente");
  const pendente = somar(doMes, (t) => t.tipo === "entrada" && t.status === "pendente");
  const saidas = somar(doMes, (t) => t.tipo === "saida");
  return { recebido, pendente, saidas, saldo: recebido - saidas };
}

/** Saldo acumulado até o fim do mês, partindo do saldo inicial. Pendentes não contam. */
export function saldoAte(totais: TotalMensal[], mes: string, saldoInicial: number): number {
  return totais
    .filter((t) => t.mes <= mes && t.status !== "pendente")
    .reduce((s, t) => s + (t.tipo === "saida" ? -t.total : t.total), saldoInicial);
}

/** Recebimentos de janeiro até o mês informado, para o gráfico. */
export function recebidoPorMes(totais: TotalMensal[], mes: string): { mes: string; total: number }[] {
  const ano = mes.slice(0, 4);
  return Array.from({ length: Number(mes.slice(5, 7)) }, (_, i) => {
    const chave = `${ano}-${String(i + 1).padStart(2, "0")}`;
    return { mes: chave, total: resumoDoMes(totais, chave).recebido };
  });
}
