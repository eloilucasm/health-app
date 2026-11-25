import { describe, expect, it } from "vitest";
import { formatarBRL, lerCentavos } from "./dinheiro";
import { lerConteudo, type Esquema } from "./evolucao";
import { indicadores } from "./indicadores";
import { acabando, pacoteAtivo, usoDoPacote, type Pacote } from "./pacotes";

const pacote = (parte: Partial<Pacote>): Pacote => ({
  id: "p",
  pacienteId: "a",
  pacienteNome: "A",
  total: 10,
  usadasAntes: 0,
  realizadas: 0,
  valorCentavos: null,
  inicio: "2026-11-01",
  ativo: true,
  obs: "",
  ...parte,
});

describe("pacotes", () => {
  it("soma as sessões anteriores com as realizadas, sem ficar negativo", () => {
    expect(usoDoPacote(pacote({ usadasAntes: 3, realizadas: 2 }))).toEqual({ usadas: 5, total: 10, restantes: 5 });
    expect(usoDoPacote(pacote({ total: 2, realizadas: 3 })).restantes).toBe(0);
  });
  it("sugere o mais antigo em andamento e avisa quando restam 2 ou menos", () => {
    const lista = [
      pacote({ id: "novo", inicio: "2026-11-10" }),
      pacote({ id: "velho", inicio: "2026-10-01", realizadas: 8 }),
      pacote({ id: "acabou", inicio: "2026-09-01", realizadas: 10 }),
      pacote({ id: "encerrado", ativo: false, realizadas: 9 }),
    ];
    expect(pacoteAtivo(lista, "a")?.id).toBe("velho");
    expect(acabando(lista).map((p) => p.id)).toEqual(["velho", "acabou"]);
  });
});

describe("dinheiro", () => {
  it("lê formatos brasileiros em centavos", () => {
    expect(lerCentavos("R$ 1.234,56")).toBe(123456);
    expect(lerCentavos("150")).toBe(15000);
    expect(lerCentavos("0,1")).toBe(10);
    expect(lerCentavos("")).toBeNull();
    expect(lerCentavos("-5")).toBeNull();
    expect(lerCentavos("abc")).toBeNull();
    expect(formatarBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});

describe("formulário da especialidade", () => {
  const esquema: Esquema = {
    version: 1,
    fields: [
      { key: "queixa", label: "Queixa", type: "textarea" },
      { key: "dor", label: "Dor", type: "scale", min: 0, max: 10 },
      { key: "condutas", label: "Condutas", type: "chips" },
    ],
  };
  it("aceita só campos conhecidos e mantém o zero da escala", () => {
    const r = lerConteudo(esquema, { dor: 0, queixa: "  ", condutas: ["Ventosa", "Ventosa"], outro: "x" });
    expect(r).toEqual({ conteudo: { dor: 0, condutas: ["Ventosa"] }, erro: null });
  });
  it("recusa escala fora do intervalo e formulário vazio", () => {
    expect(lerConteudo(esquema, { dor: 11 }).erro).toMatch(/Dor/);
    expect(lerConteudo(esquema, {}).erro).toMatch(/pelo menos um/);
  });
});

describe("indicadores", () => {
  it("conta semana, mês, faltas e pacientes ativos, ignorando cancelados", () => {
    const a = (data: string, status: "realizado" | "faltou" | "agendado" | "cancelado", pacienteId = "x") => ({
      data,
      status,
      pacienteId,
    });
    const r = indicadores(
      [
        a("2026-11-23", "realizado"),
        a("2026-11-25", "agendado", "y"),
        a("2026-11-25", "cancelado", "z"),
        a("2026-11-03", "faltou"),
        a("2026-09-01", "realizado", "antigo"),
      ],
      "2026-11-25",
    );
    expect(r).toEqual({
      atendimentosNaSemana: 2,
      realizadosNaSemana: 1,
      sessoesNoMes: 1,
      faltasNoMes: 1,
      taxaDeFaltas: 50,
      pacientesAtivos: 2,
    });
  });
});
