import { describe, expect, it } from "vitest";
import { avisoDaAssinatura, diasAte, precoDoPlano, situacaoValida } from "./assinatura";

describe("assinatura", () => {
  it("conta os dias até o fim do teste", () => {
    expect(diasAte("2026-12-01", "2026-11-27")).toBe(4);
    expect(diasAte("2026-11-26", "2026-11-27")).toBe(-1);
  });

  it("só avisa do teste nos últimos 3 dias", () => {
    expect(avisoDaAssinatura("teste", "2026-12-10", "2026-11-27")).toBeNull();
    expect(avisoDaAssinatura("teste", "2026-11-29", "2026-11-27")?.texto).toMatch(/em 2 dias/);
    expect(avisoDaAssinatura("teste", "2026-11-28", "2026-11-27")?.texto).toMatch(/amanhã/);
    expect(avisoDaAssinatura("teste", "2026-11-27", "2026-11-27")?.texto).toMatch(/hoje/);
  });

  it("explica o modo somente leitura e se cala quando está em dia", () => {
    for (const s of ["teste_vencido", "bloqueada", "suspensa", "cancelada"] as const) {
      expect(avisoDaAssinatura(s, null, "2026-11-27")).toMatchObject({ tipo: "alerta", texto: /só para consulta/ });
    }
    expect(avisoDaAssinatura("ativa", null, "2026-11-27")).toBeNull();
    expect(situacaoValida("ativa")).toBe(true);
    expect(situacaoValida("outra")).toBe(false);
  });

  it("formata o preço", () => {
    expect(precoDoPlano(5900, "mensal").replace(/\s/g, " ")).toBe("R$ 59,00/mês");
    expect(precoDoPlano(59000, "anual").replace(/\s/g, " ")).toBe("R$ 590,00/ano");
  });
});
