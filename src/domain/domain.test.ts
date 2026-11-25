import { describe, expect, it } from "vitest";
import { lerDados } from "./consultorio";
import { validarPeriodos, type Periodo } from "./horarios";
import { comSufixo, gerarSlug } from "./slug";
import { COR_PADRAO, corValida } from "./tema";

describe("gerarSlug", () => {
  it("tira acentos e espaços", () => {
    expect(gerarSlug("Consultório Alanna Viana")).toBe("consultorio-alanna-viana");
  });
  it("não colide com rotas do app", () => {
    expect(gerarSlug("Agenda")).toBe("agenda-consultorio");
  });
  it("garante o tamanho mínimo e máximo", () => {
    expect(gerarSlug("!!")).toBe("consultorio-novo");
    expect(gerarSlug("a".repeat(80))).toHaveLength(40);
    expect(comSufixo("a".repeat(40), "x1y2").length).toBeLessThanOrEqual(40);
  });
});

describe("validarPeriodos", () => {
  const p = (inicio: string, fim: string, weekday = 1): Periodo => ({ weekday, inicio, fim, local: "consultorio" });

  it("aceita manhã e tarde no mesmo dia, inclusive encostados", () => {
    expect(validarPeriodos([p("08:00", "12:00"), p("12:00", "18:00")])).toBeNull();
  });
  it("recusa fim antes do início", () => {
    expect(validarPeriodos([p("14:00", "13:00")])).toMatch(/depois do início/);
  });
  it("recusa sobreposição só no mesmo dia", () => {
    expect(validarPeriodos([p("08:00", "12:00"), p("11:00", "13:00")])).toMatch(/sobrepostos/);
    expect(validarPeriodos([p("08:00", "12:00", 1), p("11:00", "13:00", 2)])).toBeNull();
  });
});

describe("tema e dados do consultório", () => {
  it("só aceita cores da lista", () => {
    expect(corValida("red;} body{display:none")).toBe(COR_PADRAO);
    expect(corValida("#2f6db5")).toBe("#2f6db5");
  });
  it("normaliza a entrada e aponta o primeiro erro", () => {
    expect(lerDados(null).erro).toMatch(/nome/);
    const ok = lerDados({
      nome: " Alanna ",
      especialidade: "fisioterapia",
      duracaoMin: "50",
      instagram: "@alanna",
      fuso: "Marte",
    });
    expect(ok.erro).toBeNull();
    expect(ok.dados).toMatchObject({ nome: "Alanna", instagram: "alanna", fuso: "America/Sao_Paulo", duracaoMin: 50 });
  });
});
