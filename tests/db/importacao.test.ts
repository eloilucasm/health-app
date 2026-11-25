/** Importação do backup do protótipo e totais do financeiro (RF-10, RF-11). */
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { lerBackup } from "../../src/domain/importacao";
import { createOrg, createUserClient } from "./helpers";

let ana: SupabaseClient;
let bia: SupabaseClient;
let org: string;

const leitura = lerBackup(JSON.parse(readFileSync("tests/fixtures/backup-exemplo.json", "utf8")));
if ("erro" in leitura) throw new Error(leitura.erro);
const { dados } = leitura;

const importar = (cliente: SupabaseClient) => cliente.rpc("importar_backup", { p_org: org, p_dados: dados });

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-imp"));
  ({ client: bia } = await createUserClient("bia-imp"));
  org = await createOrg(ana, "Clinica Imp Ana");
  await createOrg(bia, "Clinica Imp Bia");
});

describe("importar_backup", () => {
  it("outra profissional não importa para a organização", async () => {
    expect((await importar(bia)).error?.message).toMatch(/Só a dona/);
  });

  it("importa tudo, com vínculos, fuso e uso do pacote", async () => {
    const { data, error } = await importar(ana);
    expect(error).toBeNull();
    expect(data).toEqual({ pacientes: 2, pacotes: 1, atendimentos: 4, evolucoes: 2, lancamentos: 3 });

    const atendimento = await ana.from("appointments").select("inicio, status, package_id").eq("legacy_id", "a1").single();
    // 08:00 em America/Sao_Paulo = 11:00 UTC.
    expect(new Date(atendimento.data!.inicio).toISOString()).toBe("2026-11-02T11:00:00.000Z");
    expect(atendimento.data!.package_id).not.toBeNull();

    const uso = await ana.from("pacotes_com_uso").select("usadas_antes, realizadas").eq("org_id", org).single();
    expect(uso.data).toEqual({ usadas_antes: 3, realizadas: 1 });

    const evolucao = await ana.from("clinical_records_atuais").select("appointment_id").eq("legacy_id", "e1").single();
    expect(evolucao.data?.appointment_id).not.toBeNull();

    const saldo = await ana.from("organizations").select("saldo_inicial_centavos").eq("id", org).single();
    expect(saldo.data?.saldo_inicial_centavos).toBe(20000);
  });

  it("repetir não duplica", async () => {
    const { data, error } = await importar(ana);
    expect(error).toBeNull();
    expect(data).toEqual({ pacientes: 0, pacotes: 0, atendimentos: 0, evolucoes: 0, lancamentos: 0 });
  });

  it("totaliza por mês e esconde de outra organização", async () => {
    const { data } = await ana.from("financeiro_mensal").select("mes, tipo, status, total").eq("org_id", org).order("mes");
    expect(data).toEqual(
      expect.arrayContaining([
        { mes: "2026-10", tipo: "saida", status: "recebido", total: 60010 },
        { mes: "2026-11", tipo: "entrada", status: "recebido", total: 125050 },
        { mes: "2026-11", tipo: "entrada", status: "pendente", total: 15000 },
      ]),
    );
    const intrusa = await bia.from("financeiro_mensal").select("total").eq("org_id", org);
    expect(intrusa.data ?? []).toHaveLength(0);
  });
});
