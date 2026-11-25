export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const LOCAIS = { consultorio: "Consultório", domicilio: "Domicílio", online: "Online" } as const;
export type Local = keyof typeof LOCAIS;

/** Um período de atendimento em um dia da semana (0 = domingo). Horas em "HH:MM". */
export type Periodo = { weekday: number; inicio: string; fim: string; local: Local };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Devolve a primeira mensagem de erro, ou null se os períodos forem válidos. */
export function validarPeriodos(periodos: Periodo[]): string | null {
  if (periodos.length > 40) return "Há períodos demais.";
  for (const p of periodos) {
    if (!Number.isInteger(p.weekday) || p.weekday < 0 || p.weekday > 6) return "Dia da semana inválido.";
    const dia = DIAS_SEMANA[p.weekday];
    if (!HORA.test(p.inicio) || !HORA.test(p.fim)) return `${dia}: preencha o início e o fim.`;
    if (p.fim <= p.inicio) return `${dia}: o fim precisa ser depois do início.`;
    if (!Object.hasOwn(LOCAIS, p.local)) return `${dia}: local inválido.`;
  }
  const ordenados = [...periodos].sort((a, b) => a.weekday - b.weekday || a.inicio.localeCompare(b.inicio));
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const atual = ordenados[i];
    if (atual.weekday === anterior.weekday && atual.inicio < anterior.fim) {
      return `${DIAS_SEMANA[atual.weekday]}: há períodos sobrepostos.`;
    }
  }
  return null;
}
