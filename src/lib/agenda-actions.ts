"use server";

import { revalidatePath } from "next/cache";
import { lerAtendimento, statusValido, uuidValido } from "@/domain/agenda";
import { paraInstante } from "@/domain/datas";
import { carregarConsultorio } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAgenda = { erro: string } | { ok: true };

const FALHA = "Não foi possível salvar. Tente de novo.";

/** Cria (sem id) ou atualiza um atendimento. */
export async function salvarAtendimento(id: string | null, bruto: unknown): Promise<ResultadoAgenda> {
  const { orgId, dados: consultorio } = await carregarConsultorio();
  const { dados, erro } = lerAtendimento(bruto);
  if (erro) return { erro };
  if (id !== null && !uuidValido(id)) return { erro: FALHA };

  const inicio = paraInstante(dados.data, dados.hora, consultorio.fuso);
  const valores = {
    patient_id: dados.pacienteId || null,
    descricao_avulsa: dados.descricao || null,
    inicio: inicio.toISOString(),
    fim: new Date(inicio.getTime() + consultorio.duracaoMin * 60_000).toISOString(),
    local: dados.local,
    status: dados.status,
    obs: dados.obs || null,
  };

  const supabase = await createClient();
  const consulta = id
    ? supabase.from("appointments").update(valores).eq("org_id", orgId).eq("id", id)
    : supabase.from("appointments").insert({ org_id: orgId, ...valores });
  const { data, error } = await consulta.select("id").maybeSingle();
  if (error || !data) return { erro: FALHA };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function mudarStatus(id: string, status: string): Promise<ResultadoAgenda> {
  const { orgId } = await carregarConsultorio();
  if (!uuidValido(id) || !statusValido(status)) return { erro: FALHA };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");
  if (error || !data.length) return { erro: FALHA };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirAtendimento(id: string): Promise<ResultadoAgenda> {
  const { orgId } = await carregarConsultorio();
  if (!uuidValido(id)) return { erro: FALHA };

  const supabase = await createClient();
  const { data, error } = await supabase.from("appointments").delete().eq("org_id", orgId).eq("id", id).select("id");
  if (error?.code === "23503") {
    return { erro: "Este atendimento tem registro no prontuário e não pode ser excluído. Marque como cancelado." };
  }
  if (error || !data.length) return { erro: "Não foi possível excluir. Tente de novo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
