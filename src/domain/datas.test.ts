import { describe, expect, it } from "vitest";
import { lerAtendimento } from "./agenda";
import {
  dataLonga,
  dataValida,
  diasDoCalendario,
  inicioDaSemana,
  mesAno,
  noFuso,
  paraInstante,
  somarDias,
  somarMeses,
} from "./datas";
import { iniciais, linkWhatsApp, normalizar } from "./pacientes";

describe("fuso do consultório", () => {
  it("converte hora local em instante e volta", () => {
    const i = paraInstante("2026-11-25", "08:30", "America/Bahia");
    expect(i.toISOString()).toBe("2026-11-25T11:30:00.000Z");
    expect(noFuso(i, "America/Bahia")).toEqual({ data: "2026-11-25", hora: "08:30" });
  });
  it("respeita fusos diferentes e a virada do dia", () => {
    expect(paraInstante("2026-11-25", "23:00", "America/Rio_Branco").toISOString()).toBe("2026-11-26T04:00:00.000Z");
    expect(noFuso("2026-11-26T02:00:00Z", "America/Sao_Paulo")).toEqual({ data: "2026-11-25", hora: "23:00" });
  });
});

describe("calendário", () => {
  it("semana começa na segunda, inclusive para o domingo", () => {
    expect(inicioDaSemana("2026-11-25")).toBe("2026-11-23");
    expect(inicioDaSemana("2026-11-29")).toBe("2026-11-23");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("valida datas reais e escreve por extenso", () => {
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("amanhã")).toBe(false);
    expect(dataLonga("2026-11-25")).toBe("Quarta-feira, 25 de novembro");
  });
});

describe("pacientes e atendimentos", () => {
  it("busca ignora acentos e o WhatsApp recebe o DDI", () => {
    expect(normalizar("José ")).toBe("jose");
    expect(iniciais("maria da silva")).toBe("MD");
    expect(linkWhatsApp("(73) 98888-7777")).toBe("https://wa.me/5573988887777");
    expect(linkWhatsApp("+55 73 98888-7777")).toBe("https://wa.me/5573988887777");
    expect(linkWhatsApp("123")).toBeNull();
  });
  it("exige paciente ou descrição, data e hora", () => {
    expect(lerAtendimento({ data: "2026-11-25", hora: "08:00" }).erro).toMatch(/paciente ou descreva/);
    expect(lerAtendimento({ descricao: "Massagem", data: "2026-11-25", hora: "25:00" }).erro).toMatch(/data e horário/);
    const ok = lerAtendimento({ descricao: "Massagem", data: "2026-11-25", hora: "08:00", status: "x", local: "y" });
    expect(ok.erro).toBeNull();
    expect(ok.dados).toMatchObject({ status: "agendado", local: "consultorio" });
  });
});

describe("calendário do mês", () => {
  it("navega entre meses sem pular fevereiro", () => {
    expect(somarMeses("2027-01-31", 1)).toBe("2027-02-01");
    expect(somarMeses("2026-01-15", -1)).toBe("2025-12-01");
  });
  it("monta semanas completas que cobrem o mês", () => {
    const dias = diasDoCalendario("2026-11-25");
    expect(dias[0]).toBe("2026-10-26");
    expect(dias.at(-1)).toBe("2026-12-06");
    expect(dias).toHaveLength(42);
    expect(diasDoCalendario("2027-02-10")).toHaveLength(28);
    expect(mesAno("2026-11-25")).toBe("Novembro de 2026");
  });
});
