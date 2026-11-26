/** Situação da assinatura, como calculada no banco (private.situacao). */
export const SITUACOES = {
  teste: "Em teste",
  teste_vencido: "Teste vencido",
  ativa: "Ativa",
  atrasada: "Pagamento atrasado",
  bloqueada: "Bloqueada por atraso",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
  sem_assinatura: "Sem assinatura",
} as const;
export type Situacao = keyof typeof SITUACOES;

export const situacaoValida = (s: unknown): s is Situacao => typeof s === "string" && Object.hasOwn(SITUACOES, s);

/** Dias inteiros de hoje até a data (negativo se já passou). Datas "AAAA-MM-DD". */
export function diasAte(data: string, hoje: string): number {
  return Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);
}

export type Aviso = { tipo: "info" | "alerta"; texto: string } | null;

/** Faixa no topo do app para a profissional. null quando não há nada a dizer. */
export function avisoDaAssinatura(situacao: Situacao, trialAte: string | null, hoje: string): Aviso {
  switch (situacao) {
    case "teste": {
      if (!trialAte) return null;
      const dias = diasAte(trialAte, hoje);
      if (dias > 3) return null;
      const quando = dias <= 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
      return { tipo: "info", texto: `Seu teste grátis termina ${quando}.` };
    }
    case "atrasada":
      return { tipo: "alerta", texto: "Há um pagamento em atraso. Regularize para não perder a edição dos dados." };
    case "teste_vencido":
      return { tipo: "alerta", texto: "Seu teste grátis terminou. Seus dados estão só para consulta e exportação." };
    case "bloqueada":
      return { tipo: "alerta", texto: "Pagamento em atraso: seus dados estão só para consulta e exportação." };
    case "suspensa":
      return { tipo: "alerta", texto: "Conta suspensa: seus dados estão só para consulta e exportação. Fale com o suporte." };
    case "cancelada":
      return { tipo: "alerta", texto: "Assinatura cancelada: seus dados estão só para consulta e exportação." };
    default:
      return null;
  }
}

/** "R$ 59,00/mês" */
export function precoDoPlano(centavos: number, intervalo: "mensal" | "anual"): string {
  const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
  return `${valor}/${intervalo === "anual" ? "ano" : "mês"}`;
}
