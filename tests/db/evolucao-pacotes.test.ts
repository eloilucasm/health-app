/** Evolução das sessões e pacotes (RF-07, RF-08). */
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

const novoPacote = (cliente: SupabaseClient, paciente: string, total = 2, antes = 0) =>
  cliente.rpc("criar_pacote", {
    p_org: org,
    p_paciente: paciente,
    p_total: total,
    p_usadas_antes: antes,
    p_valor_centavos: 30000,
    p_inicio: "2026-11-25",
    p_obs: null,
    p_desde: new Date().toISOString(),
  });

const evoluir = (
  cliente: SupabaseClient,
  paciente: string,
  atendimento: string | null,
  grupo: string | null = null,
  dor = 5,
) =>
  cliente.rpc("salvar_evolucao", {
    p_org: org,
    p_paciente: paciente,
    p_atendimento: atendimento,
    p_data: "2026-11-25",
    p_conteudo: { dor },
    p_schema_version: 1,
    p_grupo: grupo,
  });

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-evo"));
  ({ client: bia } = await createUserClient("bia-evo"));
  org = await createOrg(ana, "Clinica Evo Ana");
  await createOrg(bia, "Clinica Evo Bia");
});

describe("pacotes", () => {
  it("vincula os próximos atendimentos só até as sessões que restam e conta as realizadas", async () => {
    const paciente = await criar("patients", { nome: "Pacote" });
    const passado = await criar("appointments", { patient_id: paciente, inicio: emDias(-3) });
    const [um, dois, tres] = [
      await criar("appointments", { patient_id: paciente, inicio: emDias(1) }),
      await criar("appointments", { patient_id: paciente, inicio: emDias(2) }),
      await criar("appointments", { patient_id: paciente, inicio: emDias(3) }),
    ];

    const { data: pacote, error } = await novoPacote(ana, paciente, 3, 1);
    expect(error).toBeNull();

    const { data } = await ana.from("appointments").select("id, package_id").eq("patient_id", paciente);
    const vinculo = Object.fromEntries((data ?? []).map((a) => [a.id, a.package_id]));
    expect(vinculo).toEqual({ [passado]: null, [um]: pacote, [dois]: pacote, [tres]: null });

    await ana.from("appointments").update({ status: "realizado" }).eq("id", um);
    await ana.from("appointments").update({ status: "faltou" }).eq("id", dois);
    const uso = await ana.from("pacotes_com_uso").select("realizadas").eq("id", pacote).single();
    expect(uso.data?.realizadas).toBe(1);

    const intrusa = await bia.from("pacotes_com_uso").select("id").eq("id", pacote);
    expect(intrusa.data ?? []).toHaveLength(0);
  });

  it("recusa pacote de um paciente em atendimento de outro", async () => {
    const dono = await criar("patients", { nome: "Dono do pacote" });
    const outro = await criar("patients", { nome: "Outro" });
    const { data: pacote } = await novoPacote(ana, dono);
    const { error } = await ana
      .from("appointments")
      .insert({ org_id: org, patient_id: outro, package_id: pacote, inicio: emDias(5) });
    expect(error?.code).toBe("23503");
  });

  it("outra profissional não cria pacote na organização", async () => {
    const paciente = await criar("patients", { nome: "Protegido" });
    const { error } = await novoPacote(bia, paciente);
    expect(error).not.toBeNull();
  });

  it("excluir o pacote solta os atendimentos sem apagá-los", async () => {
    const paciente = await criar("patients", { nome: "Solta" });
    const atendimento = await criar("appointments", { patient_id: paciente, inicio: emDias(4) });
    const { data: pacote } = await novoPacote(ana, paciente);
    expect((await ana.from("packages").delete().eq("id", pacote)).error).toBeNull();
    const { data } = await ana.from("appointments").select("package_id").eq("id", atendimento).single();
    expect(data?.package_id).toBeNull();
  });
});

describe("evolução", () => {
  let paciente: string;
  let atendimento: string;
  let grupo: string;

  beforeAll(async () => {
    paciente = await criar("patients", { nome: "Evolui" });
    atendimento = await criar("appointments", { patient_id: paciente, inicio: emDias(-1) });
    const { data, error } = await evoluir(ana, paciente, atendimento, null, 7);
    if (error) throw error;
    grupo = data as string;
  });

  it("a primeira versão marca o atendimento como realizado", async () => {
    const { data } = await ana.from("appointments").select("status").eq("id", atendimento).single();
    expect(data?.status).toBe("realizado");
  });

  it("editar cria nova versão, mantém o atendimento e não mexe no status", async () => {
    await ana.from("appointments").update({ status: "confirmado" }).eq("id", atendimento);
    expect((await evoluir(ana, paciente, null, grupo, 4)).error).toBeNull();

    const { data } = await ana
      .from("clinical_records_atuais")
      .select("versao, conteudo, appointment_id")
      .eq("grupo_id", grupo);
    expect(data).toEqual([{ versao: 2, conteudo: { dor: 4 }, appointment_id: atendimento }]);

    const status = await ana.from("appointments").select("status").eq("id", atendimento).single();
    expect(status.data?.status).toBe("confirmado");
  });

  it("recusa atendimento de outro paciente", async () => {
    const outro = await criar("patients", { nome: "Sem relação" });
    const { error } = await evoluir(ana, outro, atendimento);
    expect(error?.message).toMatch(/não é deste paciente/);
  });

  it("o atendimento com evolução não troca de paciente", async () => {
    const outro = await criar("patients", { nome: "Substituto" });
    const { error } = await ana.from("appointments").update({ patient_id: outro }).eq("id", atendimento);
    expect(error?.message).toMatch(/não pode ser trocado/);
  });

  it("outra profissional não grava nem versiona", async () => {
    expect((await evoluir(bia, paciente, null)).error).not.toBeNull();
    expect((await evoluir(bia, paciente, null, grupo)).error).not.toBeNull();
  });
});
