/** Agenda e arquivamento de pacientes (RF-05, RF-06). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createOrg, createUserClient } from "./helpers";

let ana: SupabaseClient;
let bia: SupabaseClient;
let org: string;

const emDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

async function criar(tabela: "patients" | "appointments", valores: object): Promise<string> {
  const { data, error } = await ana.from(tabela).insert({ org_id: org, ...valores }).select("id").single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-agenda"));
  ({ client: bia } = await createUserClient("bia-agenda"));
  org = await createOrg(ana, "Clinica Agenda Ana");
  await createOrg(bia, "Clinica Agenda Bia");
});

describe("excluir atendimento", () => {
  it("sem prontuário, exclui", async () => {
    const id = await criar("appointments", { descricao_avulsa: "Massagem", inicio: emDias(1) });
    const { data, error } = await ana.from("appointments").delete().eq("id", id).select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("com evolução registrada, recusa", async () => {
    const paciente = await criar("patients", { nome: "Com evolução" });
    const id = await criar("appointments", { patient_id: paciente, inicio: emDias(-1) });
    const registro = await ana
      .from("clinical_records")
      .insert({ org_id: org, patient_id: paciente, appointment_id: id, tipo: "evolucao", data: "2026-11-24" });
    expect(registro.error).toBeNull();

    const { error } = await ana.from("appointments").delete().eq("id", id);
    expect(error?.code).toBe("23503");
  });
});

describe("arquivar_paciente", () => {
  it("outra profissional não arquiva", async () => {
    const paciente = await criar("patients", { nome: "Da Ana" });
    const { error } = await bia.rpc("arquivar_paciente", { p_paciente: paciente });
    expect(error?.message).toMatch(/não encontrado/);
    const { data } = await ana.from("patients").select("deleted_at").eq("id", paciente).single();
    expect(data?.deleted_at).toBeNull();
  });

  it("cancela só os atendimentos futuros em aberto", async () => {
    const paciente = await criar("patients", { nome: "Vai sair" });
    const passado = await criar("appointments", { patient_id: paciente, inicio: emDias(-2), status: "realizado" });
    const futuro = await criar("appointments", { patient_id: paciente, inicio: emDias(2), status: "confirmado" });

    expect((await ana.rpc("arquivar_paciente", { p_paciente: paciente })).error).toBeNull();

    const { data } = await ana.from("appointments").select("id, status").eq("patient_id", paciente);
    const status = Object.fromEntries((data ?? []).map((a) => [a.id, a.status]));
    expect(status).toEqual({ [passado]: "realizado", [futuro]: "cancelado" });
  });
});
