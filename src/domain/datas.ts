/**
 * Datas e horas no fuso do consultório (RNF-07). "Data" é sempre "AAAA-MM-DD"
 * e "hora" é "HH:MM", como o consultório as enxerga; o banco guarda o instante (UTC).
 */

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function dataValida(data: unknown): data is string {
  if (typeof data !== "string" || !DATA.test(data)) return false;
  const d = new Date(`${data}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(data);
}

/** Instante → data e hora no fuso informado. */
export function noFuso(instante: Date | string, fuso: string): { data: string; hora: string } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(instante))
      .map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

/** Data e hora no fuso informado → instante (UTC). */
export function paraInstante(data: string, hora: string, fuso: string): Date {
  const desejado = Date.parse(`${data}T${hora}:00Z`);
  let t = desejado;
  // Duas passagens resolvem a diferença do fuso, inclusive perto de mudanças de horário.
  for (let i = 0; i < 2; i++) {
    const visto = noFuso(new Date(t), fuso);
    t += desejado - Date.parse(`${visto.data}T${visto.hora}:00Z`);
  }
  return new Date(t);
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo. */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana da data (como no protótipo). */
export function inicioDaSemana(data: string): string {
  return somarDias(data, -((diaDaSemana(data) + 6) % 7));
}

/** "2026-11-25" → "25/11" */
export function diaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** "2026-11-25" → "25/11/2026" */
export function dataCurta(data: string): string {
  return `${diaMes(data)}/${data.slice(0, 4)}`;
}

/** "2026-11-25" → "Quarta-feira, 25 de novembro" */
export function dataLonga(data: string): string {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${data}T12:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Primeiro dia do mês, deslocado em n meses (sem estourar meses curtos). */
export function somarMeses(data: string, n: number): string {
  const d = new Date(`${data.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Dias do calendário do mês, em semanas completas de segunda a domingo. */
export function diasDoCalendario(data: string): string[] {
  const primeiro = somarMeses(data, 0);
  const ultimo = somarDias(somarMeses(data, 1), -1);
  const fim = somarDias(inicioDaSemana(ultimo), 6);
  const dias: string[] = [];
  for (let d = inicioDaSemana(primeiro); d <= fim; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

/** "2026-11-25" → "Novembro de 2026" */
export function mesAno(data: string): string {
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${data}T12:00:00Z`),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
