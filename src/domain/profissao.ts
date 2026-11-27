/**
 * Modelo da profissão (D-41): termos, recursos, tipos de atendimento, campos do
 * paciente e formulários. A profissional ajusta listas e liga/desliga recursos;
 * o admin edita o modelo pelo painel (cada salvamento gera uma versão, D-42).
 */
import { TIPOS_CAMPO, type Campo, type Esquema } from "./evolucao";

export type Termos = {
  atendimento: string; // "sessão" | "consulta"
  atendimentos: string;
  registro: string; // "evolução" | "registro de sessão" | ...
  registros: string;
  novo_registro: string; // "Nova evolução"
  registro_do_atendimento: string; // "Evolução desta sessão"
  sem_registros: string; // "Nenhuma evolução registrada."
};

export const TERMOS_PADRAO: Termos = {
  atendimento: "sessão",
  atendimentos: "sessões",
  registro: "evolução",
  registros: "evoluções",
  novo_registro: "Nova evolução",
  registro_do_atendimento: "Evolução desta sessão",
  sem_registros: "Nenhuma evolução registrada.",
};

export const RECURSOS_PROFISSAO = { pacotes: "Pacotes de sessões" } as const;
export type RecursoProfissao = keyof typeof RECURSOS_PROFISSAO;

export type TipoAtendimento = { nome: string; duracao_min: number };

export type EsquemaPaciente = {
  /** Rótulo dos campos fixos; null esconde o campo. */
  base: { diagnostico?: string | null; medico?: string | null };
  fields: Campo[];
};

export type Modelo = {
  nome?: string;
  ativo?: boolean;
  termos: Termos;
  recursos_padrao: Partial<Record<RecursoProfissao, boolean>>;
  tipos_atendimento: TipoAtendimento[];
  patient_schema: EsquemaPaciente;
  evolution_schema: Esquema;
  anamnesis_schema: Esquema;
  procedimentos: string[];
};

export type AjustesProfissional = {
  recursos: Partial<Record<RecursoProfissao, boolean>>;
  tiposAtendimento: TipoAtendimento[] | null;
  procedimentos: string[] | null;
};

/** O que as telas usam: modelo da profissão com os ajustes do consultório já aplicados. */
export type Profissao = {
  id: string;
  versao: number;
  termos: Termos;
  recursos: Record<RecursoProfissao, boolean>;
  tiposAtendimento: TipoAtendimento[];
  procedimentos: string[];
  paciente: EsquemaPaciente;
  evolucao: Esquema;
  anamnese: Esquema;
};

export function montarProfissao(id: string, versao: number, modelo: Partial<Modelo>, ajustes: AjustesProfissional): Profissao {
  const recursos = { pacotes: true, ...(modelo.recursos_padrao ?? {}), ...ajustes.recursos } as Record<RecursoProfissao, boolean>;
  const tipos = ajustes.tiposAtendimento?.length ? ajustes.tiposAtendimento : (modelo.tipos_atendimento ?? []);
  return {
    id,
    versao,
    termos: { ...TERMOS_PADRAO, ...(modelo.termos ?? {}) },
    recursos,
    tiposAtendimento: tipos.length ? tipos : [{ nome: "Atendimento", duracao_min: 50 }],
    procedimentos: ajustes.procedimentos ?? modelo.procedimentos ?? [],
    paciente: { base: modelo.patient_schema?.base ?? {}, fields: modelo.patient_schema?.fields ?? [] },
    evolucao: modelo.evolution_schema ?? { version: versao, fields: [] },
    anamnese: modelo.anamnesis_schema ?? { version: versao, fields: [] },
  };
}

export const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Lista de linhas digitadas pela profissional (uma por linha), sem repetição. */
export function lerLista(v: unknown, max = 60): string[] {
  const linhas = (Array.isArray(v) ? v : String(v ?? "").split(/\r?\n/)).map((x) => texto(x, 80)).filter(Boolean);
  return [...new Set(linhas)].slice(0, max);
}

export function lerTipos(v: unknown): { tipos: TipoAtendimento[]; erro: string | null } {
  const tipos = (Array.isArray(v) ? v : []).map((t) => ({
    nome: texto((t as TipoAtendimento)?.nome, 60),
    duracao_min: Math.round(Number((t as TipoAtendimento)?.duracao_min)),
  }));
  if (!tipos.length) return { tipos, erro: "Cadastre pelo menos um tipo de atendimento." };
  if (tipos.length > 12) return { tipos, erro: "No máximo 12 tipos de atendimento." };
  for (const t of tipos) {
    if (!t.nome) return { tipos, erro: "Todo tipo de atendimento precisa de nome." };
    if (!(t.duracao_min >= 10 && t.duracao_min <= 240)) return { tipos, erro: `${t.nome}: duração entre 10 e 240 minutos.` };
  }
  if (new Set(tipos.map((t) => t.nome.toLowerCase())).size !== tipos.length) {
    return { tipos, erro: "Há tipos de atendimento com o mesmo nome." };
  }
  return { tipos, erro: null };
}

const CHAVE = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;

function validarCampos(campos: unknown, onde: string, procedimentos: boolean): string | null {
  if (!Array.isArray(campos)) return `${onde}: a lista de campos é obrigatória.`;
  const chaves = new Set<string>();
  for (const c of campos as Campo[]) {
    if (!c || typeof c !== "object") return `${onde}: campo inválido.`;
    if (!CHAVE.test(String(c.key))) return `${onde}: chave inválida "${c.key}" (letras e números, começando por letra).`;
    if (chaves.has(c.key)) return `${onde}: chave repetida "${c.key}".`;
    chaves.add(c.key);
    if (!texto(c.label, 120)) return `${onde}: o campo "${c.key}" precisa de rótulo.`;
    if (!TIPOS_CAMPO.includes(c.type)) return `${onde}: tipo desconhecido "${c.type}" em "${c.key}".`;
    if (c.type === "select" && !(Array.isArray(c.options) && c.options.length)) return `${onde}: "${c.key}" precisa de opções.`;
    if (c.type === "chips" && !c.options?.length && !(procedimentos && c.optionsFrom === "procedimentos")) {
      return `${onde}: "${c.key}" precisa de opções ou da lista de procedimentos.`;
    }
    if (c.type === "scale" && !(Number.isInteger(c.min) && Number.isInteger(c.max) && (c.max as number) > (c.min as number))) {
      return `${onde}: a escala "${c.key}" precisa de mínimo e máximo inteiros.`;
    }
    if (c.type === "computed") {
      if (c.formula !== "imc") return `${onde}: "${c.key}" usa uma fórmula desconhecida (só "imc").`;
      for (const i of c.inputs ?? ["peso", "altura"]) {
        if (!chaves.has(i)) return `${onde}: "${c.key}" depende de "${i}", que precisa vir antes.`;
      }
    }
  }
  return null;
}

/** Validação completa de um modelo editado no painel. */
export function validarModelo(m: unknown): string | null {
  if (!m || typeof m !== "object") return "Modelo inválido.";
  const modelo = m as Modelo;
  for (const k of Object.keys(TERMOS_PADRAO) as (keyof Termos)[]) {
    if (!texto(modelo.termos?.[k], 80)) return `Termo "${k}" vazio.`;
  }
  if (!modelo.recursos_padrao || typeof modelo.recursos_padrao !== "object") return "Recursos padrão ausentes.";
  const { erro } = lerTipos(modelo.tipos_atendimento);
  if (erro) return erro;
  if (!Array.isArray(modelo.procedimentos)) return "A lista de procedimentos é obrigatória (pode ser vazia).";
  return (
    validarCampos(modelo.patient_schema?.fields, "Campos do paciente", false) ??
    validarCampos(modelo.evolution_schema?.fields, "Formulário de registro", true) ??
    validarCampos(modelo.anamnesis_schema?.fields, "Anamnese", true)
  );
}

/** Campos extras do paciente: só os do modelo, no tipo certo. */
export function lerDadosExtra(campos: Campo[], bruto: unknown): { dados: Record<string, string>; erro: string | null } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const dados: Record<string, string> = {};
  for (const c of campos) {
    const v = texto(b[c.key], c.type === "textarea" ? 2000 : 200);
    if (!v) continue;
    if (c.type === "select" && !(c.options ?? []).includes(v)) return { dados: {}, erro: `${c.label}: escolha uma das opções.` };
    dados[c.key] = v;
  }
  return { dados, erro: null };
}
