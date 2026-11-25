"use server";

import { revalidatePath } from "next/cache";
import { uuidValido } from "@/domain/agenda";
import { dataValida, noFuso } from "@/domain/datas";
import { lerCentavos } from "@/domain/dinheiro";
import { FORMAS } from "@/domain/financeiro";
import { carregarConsultorio } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoFinanceiro = { erro: string } | { ok: true };

const FALHA = "Não foi possível salvar. Tente de novo.";
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Cria (sem id) ou atualiza um lançamento. */
export async function salvarLancamento(id: string | null, bruto: unknown): Promise<ResultadoFinanceiro> {
  const { orgId } = await carregarConsultorio();
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  const valor = lerCentavos(texto(b.valor, 30));
  if (!valor) return { erro: "Informe o valor. Ex.: 150,00" };
  if (!dataValida(b.data)) return { erro: "Informe a data." };
  if (id !== null && !uuidValido(id)) return { erro: FALHA };

  const tipo = b.tipo === "saida" ? "saida" : "entrada";
  const forma = texto(b.forma, 20);
  const valores = {
    tipo,
    valor_centavos: valor,
    data: b.data,
    forma: Object.hasOwn(FORMAS, forma) ? forma : null,
    status: tipo === "entrada" && b.status === "pendente" ? "pendente" : "recebido",
    descricao: texto(b.descricao, 200) || null,
    patient_id: uuidValido(b.pacienteId) ? b.pacienteId : null,
    appointment_id: uuidValido(b.atendimentoId) ? b.atendimentoId : null,
    obs: texto(b.obs, 500) || null,
  };

  const supabase = await createClient();
  const consulta = id
    ? supabase.from("transactions").update(valores).eq("org_id", orgId).eq("id", id)
    : supabase.from("transactions").insert({ org_id: orgId, ...valores });
  const { data, error } = await consulta.select("id").maybeSingle();
  if (error || !data) return { erro: FALHA };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Pendência paga: passa a recebida, com a data de hoje. */
export async function marcarRecebido(id: string): Promise<ResultadoFinanceiro> {
  const { orgId, dados } = await carregarConsultorio();
  if (!uuidValido(id)) return { erro: FALHA };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ status: "recebido", data: noFuso(new Date(), dados.fuso).data })
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");
  if (error || !data.length) return { erro: FALHA };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirLancamento(id: string): Promise<ResultadoFinanceiro> {
  const { orgId } = await carregarConsultorio();
  if (!uuidValido(id)) return { erro: FALHA };
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").delete().eq("org_id", orgId).eq("id", id).select("id");
  if (error || !data.length) return { erro: "Não foi possível excluir. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function salvarSaldoInicial(valor: string): Promise<ResultadoFinanceiro> {
  const { orgId } = await carregarConsultorio();
  const bruto = texto(valor, 30);
  const negativo = bruto.startsWith("-");
  const centavos = lerCentavos(bruto.replace(/^-/, "") || "0");
  if (centavos === null) return { erro: "Valor inválido. Ex.: 1.200,00" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ saldo_inicial_centavos: negativo ? -centavos : centavos })
    .eq("id", orgId)
    .select("id");
  if (error || !data.length) return { erro: "Não foi possível salvar o saldo inicial." };
  revalidatePath("/", "layout");
  return { ok: true };
}
