import { describe, expect, it } from "vitest";
import { calcular, formatarValor, lerConteudo, rotuloGenerico, type Esquema } from "./evolucao";
import { lerDadosExtra, lerLista, lerTipos, montarProfissao, validarModelo, type Modelo } from "./profissao";

const nutricao: Esquema = {
  version: 1,
  fields: [
    { key: "medidas", label: "Medidas", type: "section" },
    { key: "peso", label: "Peso", type: "number", unit: "kg", min: 1, max: 400, chart: true },
    { key: "altura", label: "Altura", type: "number", unit: "cm", min: 30, max: 250 },
    { key: "imc", label: "IMC", type: "computed", formula: "imc", inputs: ["peso", "altura"] },
    { key: "objetivo", label: "Objetivo", type: "select", options: ["Emagrecimento", "Ganho de massa"] },
  ],
};

describe("formulário com campos novos", () => {
  it("calcula o IMC no servidor, ignora o valor enviado e aceita vírgula", () => {
    const r = lerConteudo(nutricao, { peso: "72,5", altura: 170, imc: 999, medidas: "x" });
    expect(r.erro).toBeNull();
    expect(r.conteudo).toEqual({ peso: 72.5, altura: 170, imc: 25.1 });
  });
  it("sem altura não há IMC", () => {
    expect(calcular(nutricao.fields[3], { peso: 70 })).toBeUndefined();
    // Enquanto a pessoa digita, o valor ainda é texto com vírgula.
    expect(calcular(nutricao.fields[3], { peso: "78,5", altura: "170" })).toBe(27.2);
  });
  it("seleção só aceita as opções do modelo", () => {
    expect(lerConteudo(nutricao, { objetivo: "Outra coisa" }).erro).toMatch(/opções/);
    expect(lerConteudo(nutricao, { objetivo: "Emagrecimento" }).conteudo).toEqual({ objetivo: "Emagrecimento" });
  });
  it("respeita mínimo e máximo dos números", () => {
    expect(lerConteudo(nutricao, { peso: 0 }).erro).toMatch(/Peso/);
  });
  it("formata valores e dá rótulo a campos que saíram do modelo", () => {
    expect(formatarValor(nutricao.fields[1], 72.5)).toBe("72,5 kg");
    expect(formatarValor(undefined, ["A", "B"])).toBe("A, B");
    expect(rotuloGenerico("condutasTexto")).toBe("Condutas texto");
  });
});

describe("modelo da profissão", () => {
  const base: Partial<Modelo> = {
    termos: { atendimento: "consulta" } as Modelo["termos"],
    recursos_padrao: { pacotes: false },
    tipos_atendimento: [{ nome: "Consulta", duracao_min: 30 }],
    procedimentos: ["A"],
  };

  it("aplica os ajustes da profissional por cima do modelo", () => {
    const p = montarProfissao("medicina", 2, base, {
      recursos: { pacotes: true },
      tiposAtendimento: null,
      procedimentos: ["Minha lista"],
    });
    expect(p.recursos.pacotes).toBe(true);
    expect(p.tiposAtendimento).toEqual([{ nome: "Consulta", duracao_min: 30 }]);
    expect(p.procedimentos).toEqual(["Minha lista"]);
    expect(p.termos.atendimento).toBe("consulta");
    expect(p.termos.registro).toBe("evolução");
  });

  it("valida tipos de atendimento e listas", () => {
    expect(lerTipos([]).erro).toMatch(/pelo menos um/);
    expect(lerTipos([{ nome: "A", duracao_min: 5 }]).erro).toMatch(/duração/);
    expect(lerTipos([{ nome: "A", duracao_min: 30 }, { nome: "a", duracao_min: 40 }]).erro).toMatch(/mesmo nome/);
    expect(lerLista("Um\n\n Dois \nUm")).toEqual(["Um", "Dois"]);
  });

  it("recusa modelo com chave repetida, seleção sem opções ou cálculo sem dependência", () => {
    const valido = {
      termos: {
        atendimento: "a", atendimentos: "a", registro: "r", registros: "r",
        novo_registro: "n", registro_do_atendimento: "x", sem_registros: "s",
      },
      recursos_padrao: {},
      tipos_atendimento: [{ nome: "Consulta", duracao_min: 30 }],
      procedimentos: [],
      patient_schema: { base: {}, fields: [] },
      evolution_schema: nutricao,
      anamnesis_schema: { version: 1, fields: [] },
    };
    expect(validarModelo(valido)).toBeNull();
    const repetida = { ...valido, evolution_schema: { version: 1, fields: [nutricao.fields[1], nutricao.fields[1]] } };
    expect(validarModelo(repetida)).toMatch(/repetida/);
    const semOpcoes = { ...valido, evolution_schema: { version: 1, fields: [{ key: "x", label: "X", type: "select" }] } };
    expect(validarModelo(semOpcoes)).toMatch(/opções/);
    const semDependencia = { ...valido, evolution_schema: { version: 1, fields: [nutricao.fields[3]] } };
    expect(validarModelo(semDependencia)).toMatch(/precisa vir antes/);
  });

  it("campos extras do paciente: só os do modelo", () => {
    const campos = nutricao.fields.filter((c) => c.key === "objetivo");
    expect(lerDadosExtra(campos, { objetivo: "Ganho de massa", intruso: "x" }).dados).toEqual({ objetivo: "Ganho de massa" });
    expect(lerDadosExtra(campos, { objetivo: "Nada" }).erro).toMatch(/opções/);
  });
});
