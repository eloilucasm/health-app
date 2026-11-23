/**
 * Isolamento entre organizações (RNF-01) e prontuário imutável (RNF-05).
 * Roda contra o Supabase local: `npm run db:start` e depois `npm run test:db`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createOrg, createUserClient } from "./helpers";

let ana: SupabaseClient; // dona da org A
let bia: SupabaseClient; // dona da org B
let orgA: string;
let orgB: string;
let pacienteA: string;
let pacienteB: string;

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana"));
  ({ client: bia } = await createUserClient("bia"));
  orgA = await createOrg(ana, "Clinica Ana");
  orgB = await createOrg(bia, "Clinica Bia");

  const a = await ana.from("patients").insert({ org_id: orgA, nome: "Paciente da Ana" }).select("id").single();
  if (a.error) throw a.error;
  pacienteA = a.data.id;

  const b = await bia.from("patients").insert({ org_id: orgB, nome: "Paciente da Bia" }).select("id").single();
  if (b.error) throw b.error;
  pacienteB = b.data.id;
});

describe("isolamento entre organizações", () => {
  it("uma profissional não vê a organização da outra", async () => {
    const { data } = await bia.from("organizations").select("id");
    expect(data?.map((o) => o.id)).toEqual([orgB]);
  });

  it("uma profissional não vê os pacientes da outra", async () => {
    const { data } = await bia.from("patients").select("id, org_id");
    expect(data?.every((p) => p.org_id === orgB)).toBe(true);
    expect(data?.some((p) => p.id === pacienteA)).toBe(false);
  });

  it("não consegue cadastrar paciente na organização da outra", async () => {
    const { error } = await bia.from("patients").insert({ org_id: orgA, nome: "Intrusa" });
    expect(error).not.toBeNull();
  });

  it("não consegue alterar paciente da outra", async () => {
    const { data } = await bia.from("patients").update({ nome: "Alterado" }).eq("id", pacienteA).select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: conferido } = await ana.from("patients").select("nome").eq("id", pacienteA).single();
    expect(conferido?.nome).toBe("Paciente da Ana");
  });

  it("não consegue ligar um atendimento da própria org a um paciente de outra org", async () => {
    const { error } = await bia.from("appointments").insert({
      org_id: orgB,
      patient_id: pacienteA,
      inicio: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("não consegue ver nem lançar no financeiro da outra", async () => {
    const ins = await ana
      .from("transactions")
      .insert({ org_id: orgA, tipo: "entrada", valor_centavos: 15000, data: "2026-11-22", forma: "pix" });
    expect(ins.error).toBeNull();

    const { data } = await bia.from("transactions").select("id").eq("org_id", orgA);
    expect(data ?? []).toHaveLength(0);

    const { error } = await bia
      .from("transactions")
      .insert({ org_id: orgA, tipo: "entrada", valor_centavos: 100, data: "2026-11-22" });
    expect(error).not.toBeNull();
  });

  it("visitante sem login não lê nada", async () => {
    const anon = anonClient();
    const { data } = await anon.from("patients").select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: orgs } = await anon.from("organizations").select("id");
    expect(orgs ?? []).toHaveLength(0);
  });

  it("a profissional não muda o próprio plano de cobrança", async () => {
    await ana.from("organizations").update({ plano: "solo", nome: "Clinica Ana Renomeada" }).eq("id", orgA);
    const { data } = await ana.from("organizations").select("plano, nome").eq("id", orgA).single();
    expect(data?.plano).toBe("trial");
    expect(data?.nome).toBe("Clinica Ana Renomeada");
  });

  it("não cria um segundo consultório para a mesma pessoa", async () => {
    await expect(createOrg(ana, "Outra Clinica")).rejects.toThrow(/já tem um consultório/);
  });
});

describe("prontuário imutável", () => {
  let registro: string;
  let grupo: string;

  beforeAll(async () => {
    const { data, error } = await ana
      .from("clinical_records")
      .insert({ org_id: orgA, patient_id: pacienteA, tipo: "evolucao", data: "2026-11-22", conteudo: { dor: 7 } })
      .select("id, grupo_id")
      .single();
    if (error) throw error;
    registro = data.id;
    grupo = data.grupo_id;
  });

  it("outra organização não lê a evolução", async () => {
    const { data } = await bia.from("clinical_records").select("id").eq("id", registro);
    expect(data ?? []).toHaveLength(0);
  });

  it("não permite editar o conteúdo", async () => {
    const { error } = await ana.from("clinical_records").update({ conteudo: { dor: 2 } }).eq("id", registro);
    expect(error?.message).toMatch(/não podem ser editados/);
  });

  it("não permite apagar", async () => {
    // Sem política de DELETE, o RLS não encontra linhas: nada é apagado (o gatilho é a 2ª barreira).
    const { data: apagadas } = await ana.from("clinical_records").delete().eq("id", registro).select("id");
    expect(apagadas ?? []).toHaveLength(0);
    const { data } = await ana.from("clinical_records").select("id").eq("id", registro);
    expect(data).toHaveLength(1);
  });

  it("correção vira nova versão no mesmo grupo", async () => {
    const { error } = await ana.from("clinical_records").insert({
      org_id: orgA,
      patient_id: pacienteA,
      tipo: "evolucao",
      data: "2026-11-22",
      grupo_id: grupo,
      versao: 2,
      conteudo: { dor: 6 },
    });
    expect(error).toBeNull();

    const { data } = await ana.from("clinical_records_atuais").select("versao, conteudo").eq("grupo_id", grupo);
    expect(data).toEqual([{ versao: 2, conteudo: { dor: 6 } }]);
  });

  it("nova versão não pode trocar de paciente", async () => {
    const { data: outro } = await ana.from("patients").insert({ org_id: orgA, nome: "Outro" }).select("id").single();
    const { error } = await ana.from("clinical_records").insert({
      org_id: orgA,
      patient_id: outro!.id,
      tipo: "evolucao",
      data: "2026-11-22",
      grupo_id: grupo,
      versao: 3,
    });
    expect(error?.message).toMatch(/Versão de prontuário inválida/);
  });

  it("anula uma única vez e some da visão atual", async () => {
    const { data: ultima } = await ana
      .from("clinical_records")
      .select("id")
      .eq("grupo_id", grupo)
      .eq("versao", 2)
      .single();

    const primeira = await ana
      .from("clinical_records")
      .update({ anulado_em: new Date().toISOString(), anulado_motivo: "Paciente errado" })
      .eq("id", ultima!.id);
    expect(primeira.error).toBeNull();

    const segunda = await ana
      .from("clinical_records")
      .update({ anulado_em: new Date().toISOString(), anulado_motivo: "De novo" })
      .eq("id", ultima!.id);
    expect(segunda.error?.message).toMatch(/já foi anulado/);

    const { data } = await ana.from("clinical_records_atuais").select("id").eq("grupo_id", grupo);
    expect(data ?? []).toHaveLength(0);
  });
});

describe("exclusão lógica", () => {
  it("paciente não pode ser apagado fisicamente pela profissional", async () => {
    const { data: apagados } = await bia.from("patients").delete().eq("id", pacienteB).select("id");
    expect(apagados ?? []).toHaveLength(0);
    const { data } = await bia.from("patients").select("id").eq("id", pacienteB);
    expect(data).toHaveLength(1);
  });

  it("nem o acesso administrativo apaga paciente ou prontuário (gatilho)", async () => {
    const admin = adminClient();
    const paciente = await admin.from("patients").delete().eq("id", pacienteB);
    expect(paciente.error?.message).toMatch(/Exclusão física não permitida/);
    const prontuario = await admin.from("clinical_records").delete().eq("patient_id", pacienteA);
    expect(prontuario.error?.message).toMatch(/não podem ser apagados/);
  });
});
