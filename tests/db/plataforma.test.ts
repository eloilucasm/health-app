/**
 * Fundação da plataforma (Fase 1): administradores, planos, recursos, cotas e
 * modo somente leitura (RF-21 a RF-23, RF-27, RF-29; D-27, D-30, D-36).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createOrg, createPlatformAdmin, createUserClient } from "./helpers";

let ana: SupabaseClient;
let bia: SupabaseClient;
let orgA: string;
let orgB: string;
let pacienteA: string;
let admin: SupabaseClient;
let adminSoSenha: SupabaseClient;
let suporte: SupabaseClient;
const servico = adminClient();

const assinatura = async (cliente: SupabaseClient, org: string) => {
  const { data, error } = await cliente.rpc("minha_assinatura", { p_org: org });
  if (error) throw error;
  return data as {
    situacao: string;
    pode_escrever: boolean;
    plano_id: string;
    recursos: Record<string, { habilitado: boolean; limite: number | null; usado: number }>;
  };
};

/** Ajuste direto, como o provedor de cobrança fará na Fase 3. */
const forcarAssinatura = async (org: string, valores: Record<string, unknown>) => {
  const { error } = await servico.from("subscriptions").update(valores).eq("org_id", org);
  if (error) throw error;
};

const hojeMais = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-plat"));
  ({ client: bia } = await createUserClient("bia-plat"));
  orgA = await createOrg(ana, "Clinica Plat Ana");
  orgB = await createOrg(bia, "Clinica Plat Bia");
  const p = await ana.from("patients").insert({ org_id: orgA, nome: "Paciente Sigiloso" }).select("id").single();
  if (p.error) throw p.error;
  pacienteA = p.data.id;
  await ana.from("clinical_records").insert({
    org_id: orgA,
    patient_id: pacienteA,
    tipo: "evolucao",
    data: "2026-11-27",
    conteudo: { queixa: "conteúdo clínico" },
  });
  ({ comDuasEtapas: admin, soComSenha: adminSoSenha } = await createPlatformAdmin("admin"));
  ({ comDuasEtapas: suporte } = await createPlatformAdmin("suporte"));
});

describe("assinatura da profissional", () => {
  it("consultório novo nasce em teste, com os recursos do plano de teste", async () => {
    const a = await assinatura(ana, orgA);
    expect(a.situacao).toBe("teste");
    expect(a.pode_escrever).toBe(true);
    expect(a.plano_id).toBe("teste");
    expect(a.recursos.agendamento_online.habilitado).toBe(true);
    expect(a.recursos.agendamentos_online_mes).toMatchObject({ limite: 50, usado: 0 });
  });

  it("outra profissional não vê a assinatura alheia", async () => {
    const { error } = await bia.rpc("minha_assinatura", { p_org: orgA });
    expect(error?.message).toMatch(/Sem acesso/);
    const { data } = await bia.from("subscriptions").select("org_id").eq("org_id", orgA);
    expect(data ?? []).toHaveLength(0);
  });

  it("a profissional não cria exceção nem mexe no uso", async () => {
    const excecao = await ana
      .from("org_feature_overrides")
      .insert({ org_id: orgA, recurso: "api", habilitado: true, motivo: "eu mesma" });
    expect(excecao.error).not.toBeNull();
    const uso = await ana
      .from("usage_counters")
      .insert({ org_id: orgA, metrica: "whatsapp_lembretes", periodo: "2026-11", quantidade: 0 });
    expect(uso.error).not.toBeNull();
  });
});

describe("acesso administrativo", () => {
  it("só com a senha (sem as duas etapas) o admin não entra", async () => {
    const { error } = await adminSoSenha.rpc("admin_listar_clientes", {});
    expect(error?.message).toMatch(/restrito à administração/);
  });

  it("profissional comum e visitante não entram", async () => {
    expect((await ana.rpc("admin_listar_clientes", {})).error?.message).toMatch(/restrito/);
    expect((await anonClient().rpc("admin_listar_clientes", {})).error).not.toBeNull();
  });

  it("com as duas etapas, lista clientes só com dados de conta", async () => {
    // Busca pelo endereço, que é único (execuções anteriores deixam consultórios de mesmo nome).
    const { data: org } = await ana.from("organizations").select("slug").eq("id", orgA).single();
    const { data, error } = await admin.rpc("admin_listar_clientes", { p_busca: org!.slug });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Object.keys(data![0]).sort()).toEqual(
      [
        "atendimentos_30d",
        "criado_em",
        "dona_email",
        "especialidade",
        "nome",
        "org_id",
        "plano",
        "situacao",
        "slug",
        "total",
        "trial_ate",
        "ultimo_acesso",
      ].sort(),
    );
  });

  it("o detalhe traz uso em números, sem nada clínico, e fica registrado", async () => {
    const { data, error } = await admin.rpc("admin_detalhe_cliente", { p_org: orgA });
    expect(error).toBeNull();
    const texto = JSON.stringify(data);
    expect(texto).not.toContain("Paciente Sigiloso");
    expect(texto).not.toContain("conteúdo clínico");
    expect(data.uso).toMatchObject({ pacientes_ativos: 1, evolucoes_30d: 1 });
    expect(data.historico[0]).toMatchObject({ acao: "ver_cliente" });
  });

  it("nem com as duas etapas o admin lê pacientes, agenda ou prontuário", async () => {
    for (const tabela of ["patients", "appointments", "clinical_records", "transactions", "organizations"]) {
      const { data } = await admin.from(tabela).select("*").limit(5);
      expect(data ?? [], tabela).toHaveLength(0);
    }
  });

  it("suporte consulta, mas não altera", async () => {
    expect((await suporte.rpc("admin_listar_clientes", {})).error).toBeNull();
    const { error } = await suporte.rpc("admin_trocar_plano", {
      p_org: orgA,
      p_plano: "completo",
      p_motivo: "teste do suporte",
    });
    expect(error?.message).toMatch(/restrito/);
  });

  it("toda ação exige motivo e fica no histórico", async () => {
    const semMotivo = await admin.rpc("admin_trocar_plano", { p_org: orgA, p_plano: "completo", p_motivo: "" });
    expect(semMotivo.error?.message).toMatch(/motivo/);

    const ok = await admin.rpc("admin_trocar_plano", { p_org: orgA, p_plano: "completo", p_motivo: "Cortesia beta" });
    expect(ok.error).toBeNull();
    expect((await assinatura(ana, orgA)).plano_id).toBe("completo");

    const { data } = await admin.rpc("admin_detalhe_cliente", { p_org: orgA });
    expect(data.historico.some((h: { acao: string; motivo: string }) => h.acao === "trocar_plano" && h.motivo === "Cortesia beta")).toBe(true);
  });

  it("cria e altera plano com recursos", async () => {
    const id = `plano_${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await admin.rpc("admin_salvar_plano", {
      p_id: id,
      p_nome: "Plano de teste",
      p_descricao: null,
      p_preco_centavos: 12345,
      p_intervalo: "mensal",
      p_ativo: true,
      p_publico: false,
      p_ordem: 99,
      p_recursos: [{ recurso: "api", habilitado: true, limite: null }],
    });
    expect(error).toBeNull();
    const { data } = await ana.from("plan_features").select("recurso, habilitado").eq("plan_id", id);
    expect(data).toEqual([{ recurso: "api", habilitado: true }]);
  });
});

describe("modo somente leitura", () => {
  const novoPaciente = (nome: string) => bia.from("patients").insert({ org_id: orgB, nome }).select("id");

  it("suspensa: lê e exporta, mas não grava", async () => {
    const { error } = await admin.rpc("admin_definir_status", {
      p_org: orgB,
      p_status: "suspended",
      p_motivo: "Teste de suspensão",
    });
    expect(error).toBeNull();

    expect((await novoPaciente("Bloqueado")).error).not.toBeNull();
    const renomear = await bia.from("organizations").update({ nome: "Outro" }).eq("id", orgB).select("id");
    expect(renomear.data ?? []).toHaveLength(0);
    expect((await bia.from("patients").select("id").eq("org_id", orgB)).error).toBeNull();
    // A exportação registra na auditoria e precisa continuar funcionando.
    expect((await bia.from("audit_log").insert({ org_id: orgB, acao: "exportar", entidade: "tudo" })).error).toBeNull();
    expect((await assinatura(bia, orgB)).situacao).toBe("suspensa");

    await admin.rpc("admin_definir_status", { p_org: orgB, p_status: "active", p_motivo: "Teste de reativação" });
    expect((await novoPaciente("Liberado")).error).toBeNull();
  });

  it("atraso: grava por 7 dias, depois bloqueia", async () => {
    await forcarAssinatura(orgB, { status: "past_due", inadimplente_desde: hojeMais(-3) });
    expect((await assinatura(bia, orgB)).situacao).toBe("atrasada");
    expect((await novoPaciente("Na tolerância")).error).toBeNull();

    await forcarAssinatura(orgB, { inadimplente_desde: hojeMais(-10) });
    expect((await assinatura(bia, orgB)).situacao).toBe("bloqueada");
    expect((await novoPaciente("Fora da tolerância")).error).not.toBeNull();
  });

  it("teste vencido bloqueia; estender o teste libera", async () => {
    await forcarAssinatura(orgB, { status: "trial", inadimplente_desde: null, trial_ate: hojeMais(-1) });
    expect((await assinatura(bia, orgB)).situacao).toBe("teste_vencido");
    expect((await novoPaciente("Vencido")).error).not.toBeNull();

    const { error } = await admin.rpc("admin_estender_teste", { p_org: orgB, p_dias: 7, p_motivo: "Pedido da cliente" });
    expect(error).toBeNull();
    expect((await novoPaciente("Estendido")).error).toBeNull();
  });
});

describe("recursos e cotas no banco", () => {
  let slug: string;
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + 4 * 86_400_000),
  );
  const as = (hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString();
  const agendar = (inicio: string, telefone: string) =>
    anonClient().rpc("agendar_online", {
      p_slug: slug,
      p_inicio: inicio,
      p_nome: "Visitante Cota",
      p_telefone: telefone,
      p_consentimento: true,
    });

  beforeAll(async () => {
    const { data } = await ana.from("organizations").select("slug").eq("id", orgA).single();
    slug = data!.slug;
    const horarios = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, inicio: "08:00", fim: "12:00", local: "consultorio" }));
    await ana.rpc("salvar_horarios", { p_org: orgA, p_horarios: horarios, p_duracao: 60 });
    await ana.from("booking_settings").update({ ativo: true, antecedencia_min: 0 }).eq("org_id", orgA);
  });

  it("a cota mensal do plano limita os pedidos online e é contada", async () => {
    const { error } = await admin.rpc("admin_definir_excecao", {
      p_org: orgA,
      p_recurso: "agendamentos_online_mes",
      p_habilitado: null,
      p_limite: 1,
      p_motivo: "Teste de cota",
    });
    expect(error).toBeNull();

    expect((await agendar(as("08:00"), "73911110001")).error).toBeNull();
    expect((await agendar(as("09:00"), "73911110002")).error?.message).toMatch(/não está recebendo pedidos/);
    expect((await assinatura(ana, orgA)).recursos.agendamentos_online_mes).toMatchObject({ limite: 1, usado: 1 });
  });

  it("recurso desligado por exceção some da página pública", async () => {
    await admin.rpc("admin_definir_excecao", {
      p_org: orgA,
      p_recurso: "agendamento_online",
      p_habilitado: false,
      p_limite: null,
      p_motivo: "Teste de recurso desligado",
    });
    expect((await anonClient().rpc("agenda_publica", { p_slug: slug })).data).toEqual([]);

    // Exceção removida: volta a seguir o plano.
    await admin.rpc("admin_definir_excecao", {
      p_org: orgA,
      p_recurso: "agendamento_online",
      p_habilitado: null,
      p_limite: null,
      p_motivo: "Fim do teste de recurso",
    });
    expect((await anonClient().rpc("agenda_publica", { p_slug: slug })).data).toHaveLength(1);
  });

  it("consultório em somente leitura não recebe pedidos online", async () => {
    await admin.rpc("admin_definir_status", { p_org: orgA, p_status: "suspended", p_motivo: "Teste página pública" });
    expect((await anonClient().rpc("agenda_publica", { p_slug: slug })).data).toEqual([]);
    await admin.rpc("admin_definir_status", { p_org: orgA, p_status: "active", p_motivo: "Fim do teste página" });
  });
});
