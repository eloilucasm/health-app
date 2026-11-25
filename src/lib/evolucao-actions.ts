"use server";

import { revalidatePath } from "next/cache";
import { uuidValido } from "@/domain/agenda";
import { dataValida } from "@/domain/datas";
import { lerConteudo } from "@/domain/evolucao";
import { requireMembership } from "@/lib/consultorio";
import { carregarFormulario } from "@/lib/evolucao";
import { createClient } from "@/lib/supabase/server";

export type ResultadoEvolucao = { erro: string } | { ok: true };

const FALHA = "Não foi possível salvar. Tente de novo.";

/** Nova evolução, ou nova versão quando há grupo (o registro anterior é preservado). */
export async function salvarEvolucao(alvo: {
  pacienteId: string;
  atendimentoId: string;
  grupoId: string;
  data: string;
  conteudo: unknown;
}): Promise<ResultadoEvolucao> {
  const { orgId } = await requireMembership();
  if (!uuidValido(alvo?.pacienteId)) return { erro: FALHA };
  if (!dataValida(alvo.data)) return { erro: "Informe a data da sessão." };

  const { esquema } = await carregarFormulario();
  const { conteudo, erro } = lerConteudo(esquema, alvo.conteudo);
  if (erro) return { erro };

  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_evolucao", {
    p_org: orgId,
    p_paciente: alvo.pacienteId,
    p_atendimento: uuidValido(alvo.atendimentoId) ? alvo.atendimentoId : null,
    p_data: alvo.data,
    p_conteudo: conteudo,
    p_schema_version: esquema.version,
    p_grupo: uuidValido(alvo.grupoId) ? alvo.grupoId : null,
  });
  if (error?.code === "P0001") return { erro: error.message };
  if (error) return { erro: FALHA };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Anula a evolução: ela sai das telas, mas continua guardada no prontuário (RNF-05). */
export async function anularEvolucao(id: string, motivo: string): Promise<ResultadoEvolucao> {
  const { orgId } = await requireMembership();
  const texto = typeof motivo === "string" ? motivo.trim().slice(0, 300) : "";
  if (!uuidValido(id)) return { erro: FALHA };
  if (texto.length < 3) return { erro: "Escreva o motivo da anulação." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinical_records")
    .update({ anulado_em: new Date().toISOString(), anulado_motivo: texto })
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");
  if (error || !data.length) return { erro: "Não foi possível anular. Tente de novo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
