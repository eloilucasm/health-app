import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recebidoPorMes, resumoDoMes, saldoAte, type TotalMensal } from "./financeiro";
import { lerBackup } from "./importacao";

const totais: TotalMensal[] = [
  { mes: "2026-10", tipo: "saida", status: "recebido", total: 60010 },
  { mes: "2026-11", tipo: "entrada", status: "recebido", total: 125050 },
  { mes: "2026-11", tipo: "entrada", status: "pendente", total: 15000 },
];

describe("financeiro", () => {
  it("resume o mês e acumula o saldo sem contar pendentes", () => {
    expect(resumoDoMes(totais, "2026-11")).toEqual({ recebido: 125050, pendente: 15000, saidas: 0, saldo: 125050 });
    expect(saldoAte(totais, "2026-10", 20000)).toBe(-40010);
    expect(saldoAte(totais, "2026-11", 20000)).toBe(85040);
  });
  it("monta o gráfico de janeiro até o mês", () => {
    const g = recebidoPorMes(totais, "2026-11");
    expect(g).toHaveLength(11);
    expect(g.at(-1)).toEqual({ mes: "2026-11", total: 125050 });
  });
});

describe("importação do backup", () => {
  const exemplo = JSON.parse(readFileSync("tests/fixtures/backup-exemplo.json", "utf8"));

  it("recusa arquivos que não são backup", () => {
    expect(lerBackup(null)).toHaveProperty("erro");
    expect(lerBackup({ app: "outro", pacientes: [] })).toHaveProperty("erro");
    expect(lerBackup({ app: "alanna-fisio", v: 2, pacientes: [] })).toHaveProperty("erro");
  });

  it("converte, limpa as inconsistências e avisa o que ficou de fora", () => {
    const r = lerBackup(exemplo);
    if ("erro" in r) throw new Error(r.erro);
    const { dados, avisos } = r;

    expect(dados.pacientes).toHaveLength(2);
    expect(dados.pacotes).toHaveLength(1);
    expect(dados.pacotes[0]).toMatchObject({ valorCentavos: 125050, usadasAntes: 3 });
    expect(dados.atendimentos.map((a) => a.legacyId)).toEqual(["a1", "a2", "a3", "a4"]);
    // Pacote de outro paciente não é vinculado.
    expect(dados.atendimentos[1]).toMatchObject({ paciente: "p2", pacote: null, local: "domicilio" });
    expect(dados.atendimentos[2]).toMatchObject({ descricao: "Massagem avulsa", hora: "00:00" });
    expect(dados.atendimentos[3]).toMatchObject({ paciente: null, status: "agendado" });
    // Atendimento de outro paciente não é ligado à evolução; dor zero é mantida.
    expect(dados.evolucoes).toHaveLength(2);
    expect(dados.evolucoes[1]).toMatchObject({ atendimento: null, conteudo: { dor: 0 } });
    expect(dados.lancamentos.map((l) => [l.valorCentavos, l.status, l.forma])).toEqual([
      [125050, "recebido", "credito"],
      [15000, "pendente", "pix"],
      [60010, "recebido", "pix"],
    ]);
    expect(dados.saldoInicialCentavos).toBe(20000);
    expect(avisos.join("\n")).toMatch(/Paciente sem nome: ignorado \(1\)/);
    expect(avisos.join("\n")).toMatch(/Pacote sem paciente/);
    expect(avisos.join("\n")).toMatch(/Evolução vazia/);
  });
});
