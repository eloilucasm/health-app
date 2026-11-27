import { dataValida } from "./datas";
import { LOCAIS, type Local } from "./horarios";

export const STATUS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  faltou: "Faltou",
  cancelado: "Cancelado",
} as const;
export type Status = keyof typeof STATUS;

export const statusValido = (s: unknown): s is Status => typeof s === "string" && Object.hasOwn(STATUS, s);

/** Atendimento como a tela o enxerga: data e hora já no fuso do consultório. */
export type Atendimento = {
  id: string;
  pacienteId: string;
  /** Nome do paciente ou a descrição avulsa. */
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  local: Local;
  status: Status;
  obs: string;
  pacoteId: string;
  /** Tipo de atendimento da profissão (ex.: Avaliação, Retorno). */
  tipo: string;
  origem: string;
  /** Telefone deixado no agendamento online. */
  contato: string;
};

export type DadosAtendimento = Pick<
  Atendimento,
  "pacienteId" | "descricao" | "data" | "hora" | "local" | "status" | "obs" | "pacoteId" | "tipo"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidValido = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function lerAtendimento(bruto: unknown): { dados: DadosAtendimento; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const pacienteId = uuidValido(b.pacienteId) ? b.pacienteId : "";
  const dados: DadosAtendimento = {
    pacienteId,
    descricao: pacienteId ? "" : texto(b.descricao, 120),
    data: texto(b.data, 10),
    hora: texto(b.hora, 5),
    local: Object.hasOwn(LOCAIS, String(b.local)) ? (b.local as Local) : "consultorio",
    status: statusValido(b.status) ? b.status : "agendado",
    obs: texto(b.obs, 500),
    pacoteId: pacienteId && uuidValido(b.pacoteId) ? b.pacoteId : "",
    tipo: texto(b.tipo, 60),
  };
  let erro: string | null = null;
  if (!dados.pacienteId && !dados.descricao) erro = "Escolha um paciente ou descreva o atendimento.";
  else if (!dataValida(dados.data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.hora)) erro = "Informe data e horário.";
  return { dados, erro };
}
