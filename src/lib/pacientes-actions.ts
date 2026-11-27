"use server";

import { revalidatePath } from "next/cache";
import { uuidValido } from "@/domain/agenda";
import { lerPaciente } from "@/domain/pacientes";
import { lerDadosExtra } from "@/domain/profissao";
import { requireMembership } from "@/lib/consultorio";
import { carregarProfissao } from "@/lib/profissao";
import { createClient } from "@/lib/supabase/server";

export type ResultadoPaciente = { erro: string } | { id: string };

const FALHA = "Não foi possível salvar. Tente de novo.";

/** Cadastra (sem id) ou atualiza um paciente. */
export async function salvarPaciente(id: string | null, bruto: unknown): Promise<ResultadoPaciente> {
  const { orgId } = await requireMembership();
  const { dados, erro } = lerPaciente(bruto);
  if (erro) return { erro };
  if (id !== null && !uuidValido(id)) return { erro: FALHA };
  const profissao = await carregarProfissao();
  const extra = lerDadosExtra(profissao.paciente.fields, (bruto as { extra?: unknown } | null)?.extra);
  if (extra.erro) return { erro: extra.erro };

  const valores = {
    nome: dados.nome,
    telefone: dados.telefone || null,
    nascimento: dados.nascimento || null,
    convenio: dados.convenio || null,
    diagnostico: dados.diagnostico || null,
    medico_encaminhador: dados.medico || null,
    obs: dados.obs || null,
    dados_extra: extra.dados,
  };

  const supabase = await createClient();
  const consulta = id
    ? supabase.from("patients").update(valores).eq("org_id", orgId).eq("id", id)
    : supabase.from("patients").insert({ org_id: orgId, ...valores });
  const { data, error } = await consulta.select("id").maybeSingle();
  if (error || !data) return { erro: FALHA };

  revalidatePath("/", "layout");
  return { id: data.id };
}

/** Exclusão lógica: o paciente some das listas e os atendimentos futuros são cancelados. */
export async function arquivarPaciente(id: string): Promise<{ erro: string } | { ok: true }> {
  await requireMembership();
  if (!uuidValido(id)) return { erro: "Paciente inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("arquivar_paciente", { p_paciente: id });
  if (error) return { erro: "Não foi possível arquivar. Tente de novo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
