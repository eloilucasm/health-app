/** Indicadores da tela Hoje, portados do protótipo (legacy/index.html, linhas 393–400). */
import type { Status } from "./agenda";
import { inicioDaSemana, somarDias } from "./datas";

type Item = { data: string; status: Status; pacienteId: string };

export function indicadores(itens: Item[], hoje: string) {
  const validos = itens.filter((a) => a.status !== "cancelado");
  const segunda = inicioDaSemana(hoje);
  const domingo = somarDias(segunda, 6);
  const semana = validos.filter((a) => a.data >= segunda && a.data <= domingo);
  const mes = validos.filter((a) => a.data.slice(0, 7) === hoje.slice(0, 7));
  const realizadas = mes.filter((a) => a.status === "realizado").length;
  const faltas = mes.filter((a) => a.status === "faltou").length;
  const desde = somarDias(hoje, -45);

  return {
    atendimentosNaSemana: semana.length,
    realizadosNaSemana: semana.filter((a) => a.status === "realizado").length,
    sessoesNoMes: realizadas,
    faltasNoMes: faltas,
    taxaDeFaltas: realizadas + faltas ? Math.round((faltas / (realizadas + faltas)) * 100) : 0,
    pacientesAtivos: new Set(validos.filter((a) => a.data >= desde && a.pacienteId).map((a) => a.pacienteId)).size,
  };
}
