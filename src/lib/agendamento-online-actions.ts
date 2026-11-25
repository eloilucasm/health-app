"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoOnline = { erro: string } | { ok: true };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Pedido de agendamento feito pelo visitante (sem login). Toda a validação
 * que importa está no banco (agendar_online); aqui só repassamos.
 */
export async function agendarOnline(slug: string, bruto: unknown): Promise<ResultadoOnline> {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  // Campo invisível para pessoas: robôs costumam preenchê-lo. Finge sucesso e não grava.
  if (texto(b.site, 200)) return { ok: true };

  const inicio = texto(b.inicio, 40);
  if (!/^[a-z0-9-]{3,40}$/i.test(String(slug)) || Number.isNaN(Date.parse(inicio))) {
    return { erro: "Escolha um horário." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("agendar_online", {
    p_slug: slug,
    p_inicio: inicio,
    p_nome: texto(b.nome, 120),
    p_telefone: texto(b.telefone, 40),
    p_consentimento: b.consentimento === true,
    p_obs: texto(b.obs, 300) || null,
  });
  if (error?.code === "P0001") return { erro: error.message };
  if (error) return { erro: "Não foi possível agendar agora. Tente de novo em instantes." };

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/** Ajustes do agendamento online (só a dona do consultório, garantido pelo RLS). */
export async function salvarAjustesOnline(bruto: unknown): Promise<ResultadoOnline> {
  const { orgId } = await requireMembership();
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const horas = Number(b.antecedenciaHoras);
  const janela = Number(b.janelaDias);
  if (!Number.isInteger(horas) || horas < 0 || horas > 168) return { erro: "Antecedência entre 0 e 168 horas." };
  if (!Number.isInteger(janela) || janela < 1 || janela > 60) return { erro: "Agenda aberta entre 1 e 60 dias." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_settings")
    .update({
      ativo: b.ativo === true,
      antecedencia_min: horas * 60,
      janela_dias: janela,
      mensagem: texto(b.mensagem, 300) || null,
    })
    .eq("org_id", orgId)
    .select("org_id");
  if (error || !data.length) return { erro: "Não foi possível salvar." };

  revalidatePath("/", "layout");
  return { ok: true };
}
