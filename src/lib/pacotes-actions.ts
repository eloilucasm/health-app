"use server";

import { revalidatePath } from "next/cache";
import { uuidValido } from "@/domain/agenda";
import { dataValida, noFuso, paraInstante } from "@/domain/datas";
import { lerCentavos } from "@/domain/dinheiro";
import { carregarConsultorio } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoPacote = { erro: string } | { ok: true };

const FALHA = "Não foi possível salvar. Tente de novo.";

/** Cria (sem id) ou atualiza um pacote. */
export async function salvarPacote(id: string | null, bruto: unknown): Promise<ResultadoPacote> {
  const { orgId, dados: consultorio } = await carregarConsultorio();
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  const total = Number(b.total);
  const antes = Number(b.usadasAntes || 0);
  const valorTexto = typeof b.valor === "string" ? b.valor.trim() : "";
  const valor = valorTexto ? lerCentavos(valorTexto) : null;
  const inicio = dataValida(b.inicio) ? b.inicio : null;
  const obs = typeof b.obs === "string" ? b.obs.trim().slice(0, 500) : "";

  if (!uuidValido(b.pacienteId)) return { erro: "Escolha o paciente." };
  if (!Number.isInteger(total) || total < 1 || total > 200) return { erro: "O total deve ficar entre 1 e 200." };
  if (!Number.isInteger(antes) || antes < 0 || antes > total) return { erro: "Sessões já usadas: valor inválido." };
  if (valorTexto && valor === null) return { erro: "Valor inválido. Use, por exemplo, 1.200,00." };
  if (id !== null && !uuidValido(id)) return { erro: FALHA };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase
      .from("packages")
      .update({ total, usadas_antes: antes, valor_centavos: valor, inicio, obs: obs || null })
      .eq("org_id", orgId)
      .eq("id", id)
      .select("id");
    if (error || !data.length) return { erro: FALHA };
  } else {
    // Vincula a partir do começo de hoje, no fuso do consultório.
    const hoje = noFuso(new Date(), consultorio.fuso).data;
    const { error } = await supabase.rpc("criar_pacote", {
      p_org: orgId,
      p_paciente: b.pacienteId,
      p_total: total,
      p_usadas_antes: antes,
      p_valor_centavos: valor,
      p_inicio: inicio ?? hoje,
      p_obs: obs || null,
      p_desde: paraInstante(hoje, "00:00", consultorio.fuso).toISOString(),
    });
    if (error) return { erro: FALHA };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function encerrarPacote(id: string, ativo: boolean): Promise<ResultadoPacote> {
  const { orgId } = await carregarConsultorio();
  if (!uuidValido(id)) return { erro: FALHA };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .update({ ativo: Boolean(ativo) })
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");
  if (error || !data.length) return { erro: FALHA };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirPacote(id: string): Promise<ResultadoPacote> {
  const { orgId } = await carregarConsultorio();
  if (!uuidValido(id)) return { erro: FALHA };
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").delete().eq("org_id", orgId).eq("id", id).select("id");
  if (error || !data.length) return { erro: "Não foi possível excluir. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
