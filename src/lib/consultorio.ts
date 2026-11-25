import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { DadosConsultorio } from "@/domain/consultorio";
import type { Periodo } from "@/domain/horarios";
import { corValida } from "@/domain/tema";
import { getMembership, type Membership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Especialidade = { id: string; nome: string; conselho: string };

export async function listarEspecialidades(): Promise<Especialidade[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialty_profiles")
    .select("id, nome, conselho")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(`Falha ao carregar as especialidades: ${error.message}`);
  return data;
}

/** Vínculo obrigatório: quem ainda não cadastrou o consultório vai para o onboarding. */
export const requireMembership = cache(async (): Promise<Membership> => {
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return membership;
});

/** Dados do consultório no mesmo formato do formulário. */
export const carregarConsultorio = cache(async (): Promise<{ orgId: string; dados: DadosConsultorio }> => {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const [org, horas] = await Promise.all([
    supabase
      .from("organizations")
      .select("nome, specialty_profile_id, registro, telefone, endereco, instagram, timezone, tema")
      .eq("id", orgId)
      .single(),
    supabase
      .from("working_hours")
      .select("weekday, inicio, fim, local, duracao_min")
      .eq("org_id", orgId)
      .order("weekday")
      .order("inicio"),
  ]);
  if (org.error) throw new Error(`Falha ao carregar o consultório: ${org.error.message}`);
  if (horas.error) throw new Error(`Falha ao carregar os horários: ${horas.error.message}`);

  const o = org.data;
  return {
    orgId,
    dados: {
      nome: o.nome,
      especialidade: o.specialty_profile_id,
      registro: o.registro ?? "",
      telefone: o.telefone ?? "",
      endereco: o.endereco ?? "",
      instagram: o.instagram ?? "",
      fuso: o.timezone,
      cor: corValida((o.tema as { cor?: string } | null)?.cor),
      duracaoMin: horas.data[0]?.duracao_min ?? 50,
      periodos: horas.data.map((h) => ({
        weekday: h.weekday,
        inicio: String(h.inicio).slice(0, 5),
        fim: String(h.fim).slice(0, 5),
        local: h.local as Periodo["local"],
      })),
    },
  };
});
