import { validarPeriodos, type Periodo } from "./horarios";
import { corValida } from "./tema";

export const FUSOS = [
  { valor: "America/Sao_Paulo", nome: "Brasília (SP, RJ, MG, Sul, GO, DF)" },
  { valor: "America/Bahia", nome: "Bahia" },
  { valor: "America/Fortaleza", nome: "Nordeste (CE, MA, PI, RN, PB)" },
  { valor: "America/Recife", nome: "Pernambuco" },
  { valor: "America/Belem", nome: "Pará e Amapá" },
  { valor: "America/Manaus", nome: "Amazonas" },
  { valor: "America/Cuiaba", nome: "Mato Grosso e Mato Grosso do Sul" },
  { valor: "America/Rio_Branco", nome: "Acre" },
] as const;

export type DadosConsultorio = {
  nome: string;
  especialidade: string;
  registro: string;
  telefone: string;
  endereco: string;
  instagram: string;
  fuso: string;
  cor: string;
  duracaoMin: number;
  periodos: Periodo[];
};

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Normaliza o que veio do navegador. Nunca confie no formato recebido. */
export function lerDados(bruto: unknown): { dados: DadosConsultorio; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const periodos: Periodo[] = (Array.isArray(b.periodos) ? b.periodos : []).map((p) => ({
    weekday: Number(p?.weekday),
    inicio: texto(p?.inicio, 5),
    fim: texto(p?.fim, 5),
    local: texto(p?.local, 20) as Periodo["local"],
  }));
  const dados: DadosConsultorio = {
    nome: texto(b.nome, 120),
    especialidade: texto(b.especialidade, 40),
    registro: texto(b.registro, 40),
    telefone: texto(b.telefone, 40),
    endereco: texto(b.endereco, 200),
    instagram: texto(b.instagram, 40).replace(/^@+/, ""),
    fuso: FUSOS.find((f) => f.valor === b.fuso)?.valor ?? "America/Sao_Paulo",
    cor: corValida(b.cor),
    duracaoMin: Math.round(Number(b.duracaoMin)),
    periodos,
  };

  let erro: string | null = null;
  if (dados.nome.length < 2) erro = "Informe o nome do consultório ou o seu nome profissional.";
  else if (!dados.especialidade) erro = "Escolha a especialidade.";
  else if (!(dados.duracaoMin >= 10 && dados.duracaoMin <= 240))
    erro = "A duração da sessão deve ficar entre 10 e 240 minutos.";
  else erro = validarPeriodos(dados.periodos);

  return { dados, erro };
}
