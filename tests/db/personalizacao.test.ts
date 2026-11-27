/** Personalização por profissão (Fase 2): RF-41 a RF-48; D-41, D-42. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createOrg, createPlatformAdmin, createUserClient } from "./helpers";

let ana: SupabaseClient;
let bia: SupabaseClient;
let orgA: string;
let admin: SupabaseClient;
let adminSoSenha: SupabaseClient;
let suporte: SupabaseClient;
const servico = adminClient();

// Profissão só para este teste, para não mexer nos modelos reais do banco local.
const profissao = `teste_${Math.random().toString(36).slice(2, 8).replace(/[0-9]/g, "x")}`;
const modelo = (versaoNota: string) => ({
  termos: {
    atendimento: "consulta", atendimentos: "consultas", registro: "anotação", registros: "anotações",
    novo_registro: "Nova anotação", registro_do_atendimento: "Anotação desta consulta", sem_registros: "Nada ainda.",
  },
  recursos_padrao: { pacotes: false },
  tipos_atendimento: [{ nome: "Consulta", duracao_min: 30 }],
  procedimentos: ["Orientação"],
  patient_schema: { base: { diagnostico: "Motivo", medico: null }, fields: [] },
  evolution_schema: { version: 99, fields: [{ key: "nota", label: versaoNota, type: "textarea" }] },
  anamnesis_schema: { version: 99, fields: [] },
});

beforeAll(async () => {
  const p = await servico.from("specialty_profiles").insert({
    id: profissao,
    nome: "Profissão de teste",
    conselho: "CRT",
    ativo: false,
    ordem: 999,
    evolution_schema: { version: 1, fields: [{ key: "nota", label: "Nota v1", type: "textarea" }] },
  });
  if (p.error) throw p.error;

  ({ client: ana } = await createUserClient("ana-prof"));
  ({ client: bia } = await createUserClient("bia-prof"));
  orgA = await createOrg(ana, "Clinica Prof Ana", profissao);
  await createOrg(bia, "Clinica Prof Bia");
  ({ comDuasEtapas: admin, soComSenha: adminSoSenha } = await createPlatformAdmin("admin"));
  ({ comDuasEtapas: suporte } = await createPlatformAdmin("suporte"));
});

describe("leitura dos modelos", () => {
  it("a profissional lê a profissão do próprio consultório mesmo desligada no cadastro", async () => {
    const { data } = await ana.from("specialty_profiles").select("id").eq("id", profissao);
    expect(data).toEqual([{ id: profissao }]);
  });

  it("outras profissionais não veem a profissão desligada; a equipe da plataforma vê", async () => {
    expect((await bia.from("specialty_profiles").select("id").eq("id", profissao)).data).toEqual([]);
    expect((await admin.from("specialty_profiles").select("id").eq("id", profissao)).data).toEqual([{ id: profissao }]);
  });

  it("a profissional não altera modelos nem versões", async () => {
    const { data } = await ana.from("specialty_profiles").update({ nome: "Hackeada" }).eq("id", profissao).select("id");
    expect(data ?? []).toHaveLength(0);
    const v = await ana.from("specialty_profile_versions").insert({ profile_id: profissao, versao: 50, modelo: {} });
    expect(v.error).not.toBeNull();
  });
});

describe("edição dos modelos pelo painel", () => {
  let registroV1: string;

  beforeAll(async () => {
    const paciente = await ana.from("patients").insert({ org_id: orgA, nome: "Paciente Prof" }).select("id").single();
    if (paciente.error) throw paciente.error;
    const r = await ana.rpc("salvar_evolucao", {
      p_org: orgA,
      p_paciente: paciente.data.id,
      p_atendimento: null,
      p_data: "2026-11-27",
      p_conteudo: { nota: "feito na versão 1" },
      p_schema_version: 1,
      p_grupo: null,
    });
    if (r.error) throw r.error;
    registroV1 = r.data as string;
  });

  const salvar = (cliente: SupabaseClient, m: unknown, motivo = "Ajuste de teste") =>
    cliente.rpc("admin_salvar_profissao", { p_id: profissao, p_modelo: m, p_motivo: motivo });

  it("só o admin com as duas etapas edita, com motivo e formato válido", async () => {
    expect((await salvar(suporte, modelo("x"))).error?.message).toMatch(/restrito/);
    expect((await salvar(adminSoSenha, modelo("x"))).error?.message).toMatch(/restrito/);
    expect((await salvar(ana, modelo("x"))).error?.message).toMatch(/restrito/);
    expect((await salvar(admin, modelo("x"), "")).error?.message).toMatch(/motivo/);
    expect((await salvar(admin, { ...modelo("x"), tipos_atendimento: [] })).error?.message).toMatch(/formato inválido/);
  });

  it("salvar gera uma versão nova e guarda a anterior", async () => {
    const { data, error } = await salvar(admin, modelo("Nota v2"));
    expect(error).toBeNull();
    expect(data).toBe(1 + 1);

    const { data: atual } = await ana.from("specialty_profiles").select("versao, evolution_schema, termos").eq("id", profissao).single();
    expect(atual?.versao).toBe(2);
    expect(atual?.evolution_schema.version).toBe(2);
    expect(atual?.termos.atendimento).toBe("consulta");

    const { data: versoes } = await ana.from("specialty_profile_versions").select("versao").eq("profile_id", profissao).order("versao");
    expect(versoes).toEqual([{ versao: 2 }]);
  });

  it("o registro antigo continua apontando para a versão em que foi feito", async () => {
    const { data } = await ana
      .from("clinical_records_atuais")
      .select("schema_version, conteudo")
      .eq("grupo_id", registroV1)
      .single();
    expect(data).toEqual({ schema_version: 1, conteudo: { nota: "feito na versão 1" } });
  });
});

describe("ajustes da profissional e dados novos", () => {
  it("a dona ajusta recursos, tipos e lista; outra profissional não", async () => {
    const ajuste = {
      recursos_profissao: { pacotes: true },
      tipos_atendimento: [{ nome: "Retorno rápido", duracao_min: 15 }],
      procedimentos: ["Minha conduta"],
    };
    const { data } = await ana.from("organizations").update(ajuste).eq("id", orgA).select("recursos_profissao, tipos_atendimento, procedimentos");
    expect(data).toEqual([ajuste]);
    const intrusa = await bia.from("organizations").update({ procedimentos: ["x"] }).eq("id", orgA).select("id");
    expect(intrusa.data ?? []).toHaveLength(0);
  });

  it("campos extras do paciente e tipo de atendimento ficam isolados por consultório", async () => {
    const p = await ana
      .from("patients")
      .insert({ org_id: orgA, nome: "Com extras", dados_extra: { responsavel: "Mãe" } })
      .select("id, dados_extra")
      .single();
    expect(p.data?.dados_extra).toEqual({ responsavel: "Mãe" });
    const a = await ana
      .from("appointments")
      .insert({ org_id: orgA, patient_id: p.data!.id, inicio: new Date().toISOString(), tipo_atendimento: "Retorno rápido" })
      .select("tipo_atendimento")
      .single();
    expect(a.data?.tipo_atendimento).toBe("Retorno rápido");
    expect((await bia.from("patients").select("dados_extra").eq("id", p.data!.id)).data ?? []).toHaveLength(0);
  });
});
