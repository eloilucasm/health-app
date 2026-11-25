/** Regras de pacotes, portadas do protótipo (legacy/index.html, linhas 342–347). */

export type Pacote = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  total: number;
  usadasAntes: number;
  /** Atendimentos do pacote marcados como realizado. */
  realizadas: number;
  valorCentavos: number | null;
  inicio: string;
  ativo: boolean;
  obs: string;
};

export function usoDoPacote(p: Pick<Pacote, "total" | "usadasAntes" | "realizadas">) {
  const usadas = p.usadasAntes + p.realizadas;
  return { usadas, total: p.total, restantes: Math.max(0, p.total - usadas) };
}

/** Em uso: não foi encerrado e ainda tem sessões. */
export function emAndamento(p: Pacote): boolean {
  return p.ativo && usoDoPacote(p).restantes > 0;
}

/** Pacote sugerido para um novo atendimento: o mais antigo em andamento. */
export function pacoteAtivo(pacotes: Pacote[], pacienteId: string): Pacote | undefined {
  return pacotes
    .filter((p) => p.pacienteId === pacienteId && emAndamento(p))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
}

/** Alerta da tela Hoje: restam 2 sessões ou menos (inclusive concluídos não encerrados). */
export function acabando(pacotes: Pacote[]): Pacote[] {
  return pacotes.filter((p) => p.ativo && usoDoPacote(p).restantes <= 2);
}
