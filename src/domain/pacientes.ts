import { dataValida } from "./datas";

export type DadosPaciente = {
  nome: string;
  telefone: string;
  nascimento: string;
  convenio: string;
  diagnostico: string;
  medico: string;
  obs: string;
};

export const PACIENTE_VAZIO: DadosPaciente = {
  nome: "",
  telefone: "",
  nascimento: "",
  convenio: "",
  diagnostico: "",
  medico: "",
  obs: "",
};

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function lerPaciente(bruto: unknown): { dados: DadosPaciente; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const dados: DadosPaciente = {
    nome: texto(b.nome, 160),
    telefone: texto(b.telefone, 40),
    nascimento: texto(b.nascimento, 10),
    convenio: texto(b.convenio, 80),
    diagnostico: texto(b.diagnostico, 1000),
    medico: texto(b.medico, 160),
    obs: texto(b.obs, 2000),
  };
  let erro: string | null = null;
  if (!dados.nome) erro = "Informe o nome.";
  else if (dados.nascimento && !dataValida(dados.nascimento)) erro = "Data de nascimento inválida.";
  return { dados, erro };
}

/** Sem acentos e em minúsculas, para a busca ("jose" encontra "José"). */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("").toUpperCase() || "?";
}

/** Link do WhatsApp; acrescenta o DDI 55 quando o número não o tem. null se não houver número. */
export function linkWhatsApp(telefone: string): string | null {
  const numero = telefone.replace(/\D/g, "");
  if (numero.length < 10) return null;
  return `https://wa.me/${numero.length <= 11 ? "55" : ""}${numero}`;
}
