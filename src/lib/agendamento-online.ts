import "server-only";
import { noFuso, somarDias } from "@/domain/datas";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type PerfilPublico = {
  nome: string;
  especialidade: string;
  conselho: string;
  registro: string;
  endereco: string;
  telefone: string;
  instagram: string;
  cor: string;
  mensagem: string;
  janelaDias: number;
  fuso: string;
};

export type Horario = { inicio: string; hora: string; local: string };
export type DiaLivre = { data: string; horarios: Horario[] };

/** Página pública: perfil e horários livres agrupados por dia. null se o agendamento estiver desligado. */
export async function carregarPaginaPublica(slug: string): Promise<{ perfil: PerfilPublico; dias: DiaLivre[] } | null> {
  if (!/^[a-z0-9-]{3,40}$/i.test(slug)) return null;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("agenda_publica", { p_slug: slug });
  if (error) throw new Error(`Falha ao carregar a página: ${error.message}`);
  const p = (data as Record<string, unknown>[] | null)?.[0];
  if (!p) return null;

  const perfil: PerfilPublico = {
    nome: String(p.nome),
    especialidade: String(p.especialidade ?? ""),
    conselho: String(p.conselho ?? ""),
    registro: String(p.registro ?? ""),
    endereco: String(p.endereco ?? ""),
    telefone: String(p.telefone ?? ""),
    instagram: String(p.instagram ?? ""),
    cor: /^#[0-9a-f]{6}$/i.test(String(p.cor)) ? String(p.cor) : "#b8465c",
    mensagem: String(p.mensagem ?? ""),
    janelaDias: Number(p.janela_dias),
    fuso: String(p.fuso),
  };

  const hoje = noFuso(new Date(), perfil.fuso).data;
  const livres = await supabase.rpc("horarios_livres", {
    p_slug: slug,
    p_de: hoje,
    p_ate: somarDias(hoje, perfil.janelaDias),
  });
  if (livres.error) throw new Error(`Falha ao carregar os horários: ${livres.error.message}`);

  const porDia = new Map<string, Horario[]>();
  for (const h of livres.data as { inicio: string; local: string }[]) {
    const { data: dia, hora } = noFuso(h.inicio, perfil.fuso);
    porDia.set(dia, [...(porDia.get(dia) ?? []), { inicio: new Date(h.inicio).toISOString(), hora, local: h.local }]);
  }
  return { perfil, dias: [...porDia].map(([data, horarios]) => ({ data, horarios })) };
}

export type AjustesOnline = {
  ativo: boolean;
  antecedenciaHoras: number;
  janelaDias: number;
  mensagem: string;
  slug: string;
};

export async function carregarAjustesOnline(): Promise<AjustesOnline> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const [b, o] = await Promise.all([
    supabase.from("booking_settings").select("ativo, antecedencia_min, janela_dias, mensagem").eq("org_id", orgId).single(),
    supabase.from("organizations").select("slug").eq("id", orgId).single(),
  ]);
  if (b.error || o.error) throw new Error("Falha ao carregar o agendamento online.");
  return {
    ativo: b.data.ativo,
    antecedenciaHoras: Math.round(b.data.antecedencia_min / 60),
    janelaDias: b.data.janela_dias,
    mensagem: b.data.mensagem ?? "",
    slug: o.data.slug,
  };
}
