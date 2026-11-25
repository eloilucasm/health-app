/** Agendamento online: o que o visitante sem login consegue e não consegue fazer (RF-13). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, createUserClient } from "./helpers";

let ana: SupabaseClient;
let org: string;
let slug: string;
const visitante = anonClient();

// Um dia daqui a 3 dias, no fuso do consultório (São Paulo, UTC-3 sem horário de verão).
const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
  new Date(Date.now() + 3 * 86_400_000),
);
const as = (hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString();

const livres = async () => {
  const { data, error } = await visitante.rpc("horarios_livres", { p_slug: slug, p_de: dia, p_ate: dia });
  if (error) throw error;
  return (data as { inicio: string }[]).map((h) => new Date(h.inicio).toISOString());
};

const agendar = (inicio: string, extra: Record<string, unknown> = {}) =>
  visitante.rpc("agendar_online", {
    p_slug: slug,
    p_inicio: inicio,
    p_nome: "Visitante Teste",
    p_telefone: "(73) 99999-0000",
    p_consentimento: true,
    ...extra,
  });

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-online"));
  slug = `online-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await ana.rpc("criar_organizacao", {
    p_nome: "Clinica Online",
    p_slug: slug,
    p_especialidade: "fisioterapia",
  });
  if (error) throw error;
  org = data as string;
  const horarios = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, inicio: "08:00", fim: "12:00", local: "consultorio" }));
  const h = await ana.rpc("salvar_horarios", { p_org: org, p_horarios: horarios, p_duracao: 60 });
  if (h.error) throw h.error;
});

describe("desligado", () => {
  it("não mostra nada enquanto o agendamento online não for ligado", async () => {
    expect((await visitante.rpc("agenda_publica", { p_slug: slug })).data).toEqual([]);
    expect(await livres()).toEqual([]);
    expect((await agendar(as("08:00"))).error?.message).toMatch(/indisponível/);
  });
});

describe("ligado", () => {
  beforeAll(async () => {
    const { error } = await ana
      .from("booking_settings")
      .update({ ativo: true, antecedencia_min: 0, janela_dias: 30 })
      .eq("org_id", org);
    if (error) throw error;
  });

  it("mostra o perfil público, sem dados internos", async () => {
    const { data } = await visitante.rpc("agenda_publica", { p_slug: slug.toUpperCase() });
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ nome: "Clinica Online", especialidade: "Fisioterapia", janela_dias: 30 });
    expect(Object.keys(data![0])).not.toContain("plano");
  });

  it("lista a grade e tira o que a profissional já ocupou", async () => {
    expect(await livres()).toEqual([as("08:00"), as("09:00"), as("10:00"), as("11:00")]);
    const { error } = await ana.from("appointments").insert({
      org_id: org,
      descricao_avulsa: "Ocupado",
      inicio: as("10:30"),
      fim: as("11:30"),
    });
    expect(error).toBeNull();
    expect(await livres()).toEqual([as("08:00"), as("09:00")]);
  });

  it("agenda, some da lista e não deixa marcar o mesmo horário de novo", async () => {
    expect((await agendar(as("08:00"))).error).toBeNull();
    expect(await livres()).toEqual([as("09:00")]);
    expect((await agendar(as("08:00"), { p_telefone: "73988887777" })).error?.message).toMatch(/não está mais disponível/);
  });

  it("recusa horário fora da grade, sem consentimento ou com dados inválidos", async () => {
    expect((await agendar(as("09:15"), { p_telefone: "73911112222" })).error?.message).toMatch(/não está mais/);
    expect((await agendar(as("09:00"), { p_consentimento: false })).error?.message).toMatch(/autorizar/);
    expect((await agendar(as("09:00"), { p_nome: " " })).error?.message).toMatch(/nome/);
    expect((await agendar(as("09:00"), { p_telefone: "123" })).error?.message).toMatch(/WhatsApp/);
  });

  it("limita a dois horários futuros por telefone", async () => {
    expect((await agendar(as("09:00"))).error).toBeNull();
    const amanha = new Date(new Date(as("08:00")).getTime() + 86_400_000).toISOString();
    expect((await agendar(amanha)).error?.message).toMatch(/já tem horários marcados/);
  });

  it("a profissional vê o pedido com telefone e consentimento", async () => {
    const { data } = await ana
      .from("appointments")
      .select("descricao_avulsa, origem, contato_telefone, consentimento_versao, status")
      .eq("org_id", org)
      .eq("origem", "online")
      .eq("inicio", as("08:00"))
      .single();
    expect(data).toEqual({
      descricao_avulsa: "Visitante Teste",
      origem: "online",
      contato_telefone: "73999990000",
      consentimento_versao: "v1",
      status: "agendado",
    });
  });

  it("o visitante continua sem ler nenhuma tabela", async () => {
    for (const tabela of ["appointments", "organizations", "booking_settings", "working_hours", "patients"]) {
      const { data } = await visitante.from(tabela).select("*").limit(1);
      expect(data ?? [], tabela).toHaveLength(0);
    }
  });
});
