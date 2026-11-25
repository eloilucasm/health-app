/**
 * Leitura do backup do protótipo (app "alanna-fisio", v 1; legacy/index.html,
 * função snapshot). Dados reais podem ter falhas: o que não puder ser importado
 * vira um aviso, nunca um erro silencioso.
 */
import { dataValida } from "./datas";

type Obj = Record<string, unknown>;

export type Importacao = {
  pacientes: Obj[];
  pacotes: Obj[];
  atendimentos: Obj[];
  evolucoes: Obj[];
  lancamentos: Obj[];
  saldoInicialCentavos: number | null;
};

export const CONTAGENS = {
  pacientes: "pacientes",
  atendimentos: "atendimentos",
  evolucoes: "evoluções",
  pacotes: "pacotes",
  lancamentos: "lançamentos",
} as const;

const LIMITE = 20_000;

const texto = (v: unknown, max = 500) =>
  typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "";
const opcional = (v: unknown, max = 500) => texto(v, max) || null;
const lista = (v: unknown): Obj[] =>
  Array.isArray(v) ? v.filter((x): x is Obj => Boolean(x) && typeof x === "object") : [];
const inteiro = (v: unknown) => Math.trunc(Number(v));
/** Reais (float no protótipo) → centavos inteiros. */
const centavos = (v: unknown): number | null => {
  const n = Math.round(Number(v) * 100);
  return Number.isFinite(n) && Math.abs(n) <= 100_000_000_00 ? n : null;
};
const FORMAS: Record<string, string> = {
  pix: "pix",
  "crédito": "credito",
  credito: "credito",
  "débito": "debito",
  debito: "debito",
  dinheiro: "dinheiro",
  boleto: "boleto",
};

export function lerBackup(bruto: unknown): { erro: string } | { dados: Importacao; avisos: string[] } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Obj;
  if (!Array.isArray(b.pacientes) || (b.app !== undefined && b.app !== "alanna-fisio")) {
    return { erro: "Esse arquivo não é um backup do consultório." };
  }
  if (b.v !== undefined && b.v !== 1) return { erro: "Versão de backup não reconhecida." };
  for (const chave of ["pacientes", "agenda", "evolucoes", "pacotes", "financeiro"]) {
    if (lista(b[chave]).length > LIMITE) return { erro: "Arquivo grande demais para importar de uma vez." };
  }

  const contagem = new Map<string, number>();
  const avisar = (motivo: string) => contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);

  /** Descarta itens sem id ou repetidos. */
  const unicos = (itens: Obj[], nome: string) => {
    const vistos = new Set<string>();
    return itens.filter((x) => {
      const id = texto(x.id, 60);
      if (!id || vistos.has(id)) {
        avisar(`${nome} sem identificador ou repetido: ignorado`);
        return false;
      }
      vistos.add(id);
      return true;
    });
  };

  const pacientes = unicos(lista(b.pacientes), "Paciente").flatMap((p) => {
    const nome = texto(p.nome, 160);
    if (!nome) {
      avisar("Paciente sem nome: ignorado");
      return [];
    }
    return [
      {
        legacyId: texto(p.id, 60),
        nome,
        telefone: opcional(p.telefone, 40),
        nascimento: dataValida(p.nascimento) ? p.nascimento : null,
        convenio: opcional(p.convenio, 80),
        diagnostico: opcional(p.diagnostico, 1000),
        medico: opcional(p.medico, 160),
        obs: opcional(p.obs, 2000),
      },
    ];
  });
  const temPaciente = new Set(pacientes.map((p) => p.legacyId));

  const pacotes = unicos(lista(b.pacotes), "Pacote").flatMap((p) => {
    const paciente = texto(p.pacienteId, 60);
    const total = inteiro(p.total);
    if (!temPaciente.has(paciente)) {
      avisar("Pacote sem paciente correspondente: ignorado");
      return [];
    }
    if (!(total >= 1 && total <= 200)) {
      avisar("Pacote com total inválido: ignorado");
      return [];
    }
    const valor = centavos(p.valor);
    return [
      {
        legacyId: texto(p.id, 60),
        paciente,
        total,
        usadasAntes: Math.min(Math.max(inteiro(p.usadasAntes) || 0, 0), total),
        valorCentavos: valor !== null && valor > 0 ? valor : null,
        inicio: dataValida(p.inicio) ? p.inicio : null,
        ativo: p.ativo !== false,
        obs: opcional(p.obs),
      },
    ];
  });
  const donoDoPacote = new Map(pacotes.map((p) => [p.legacyId, p.paciente]));

  const atendimentos = unicos(lista(b.agenda), "Atendimento").flatMap((a) => {
    if (!dataValida(a.data)) {
      avisar("Atendimento sem data válida: ignorado");
      return [];
    }
    let hora = texto(a.hora, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      hora = "00:00";
      avisar("Atendimento sem horário: importado às 00:00");
    }
    const ref = texto(a.pacienteId, 60);
    const paciente = temPaciente.has(ref) ? ref : null;
    if (ref && !paciente) avisar("Atendimento de paciente excluído: importado como avulso");
    const pacote = texto(a.pacoteId, 60);
    const status = texto(a.status);
    return [
      {
        legacyId: texto(a.id, 60),
        paciente,
        descricao: paciente ? null : texto(a.pacienteNome, 120) || "Sem paciente",
        data: a.data,
        hora,
        local: a.tipo === "domicilio" ? "domicilio" : "consultorio",
        status: ["agendado", "confirmado", "realizado", "faltou"].includes(status) ? status : "agendado",
        pacote: paciente && donoDoPacote.get(pacote) === paciente ? pacote : null,
        obs: opcional(a.obs),
      },
    ];
  });
  const donoDoAtendimento = new Map(atendimentos.map((a) => [a.legacyId, a.paciente]));

  const evolucoes = unicos(lista(b.evolucoes), "Evolução").flatMap((e) => {
    const paciente = texto(e.pacienteId, 60);
    if (!temPaciente.has(paciente)) {
      avisar("Evolução sem paciente correspondente: ignorada");
      return [];
    }
    if (!dataValida(e.data)) {
      avisar("Evolução sem data válida: ignorada");
      return [];
    }
    const conteudo: Obj = {};
    for (const chave of ["queixa", "condutasTexto", "obs"]) {
      const v = texto(e[chave], 5000);
      if (v) conteudo[chave] = v;
    }
    const dor = Number(e.dor);
    if (e.dor !== "" && e.dor != null && Number.isInteger(dor) && dor >= 0 && dor <= 10) conteudo.dor = dor;
    const condutas = Array.isArray(e.condutas) ? e.condutas.map((c) => texto(c, 80)).filter(Boolean) : [];
    if (condutas.length) conteudo.condutas = condutas;
    if (!Object.keys(conteudo).length) {
      avisar("Evolução vazia: ignorada");
      return [];
    }
    const atendimento = texto(e.agendaId, 60);
    return [
      {
        legacyId: texto(e.id, 60),
        paciente,
        atendimento: donoDoAtendimento.get(atendimento) === paciente ? atendimento : null,
        data: e.data,
        conteudo,
      },
    ];
  });

  const lancamentos = unicos(lista(b.financeiro), "Lançamento").flatMap((x) => {
    const valor = centavos(x.valor);
    if (valor === null || valor <= 0) {
      avisar("Lançamento sem valor positivo: ignorado");
      return [];
    }
    if (!dataValida(x.data)) {
      avisar("Lançamento sem data válida: ignorado");
      return [];
    }
    const tipo = x.tipo === "saida" ? "saida" : "entrada";
    const ref = texto(x.pacienteId, 60);
    const forma = texto(x.forma, 20).toLowerCase();
    return [
      {
        legacyId: texto(x.id, 60),
        tipo,
        valorCentavos: valor,
        data: x.data,
        forma: forma ? (FORMAS[forma] ?? "outro") : null,
        status: tipo === "entrada" && x.status === "pendente" ? "pendente" : "recebido",
        descricao: opcional(x.descricao, 200),
        paciente: temPaciente.has(ref) ? ref : null,
        obs: opcional(x.obs),
      },
    ];
  });

  const config = (b.config && typeof b.config === "object" ? b.config : {}) as Obj;
  const saldo = config.saldoInicial === undefined ? null : centavos(config.saldoInicial);

  return {
    dados: { pacientes, pacotes, atendimentos, evolucoes, lancamentos, saldoInicialCentavos: saldo },
    avisos: [...contagem].map(([motivo, n]) => `${motivo} (${n})`),
  };
}
