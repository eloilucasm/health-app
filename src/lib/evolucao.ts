import "server-only";
import { uuidValido } from "@/domain/agenda";
import type { Conteudo, Esquema } from "@/domain/evolucao";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type Evolucao = {
  /** id da versão atual. */
  id: string;
  grupoId: string;
  versao: number;
  pacienteId: string;
  atendimentoId: string;
  data: string;
  conteudo: Conteudo;
};

/** Formulário e lista de condutas da especialidade do consultório. */
export async function carregarFormulario(): Promise<{ esquema: Esquema; procedimentos: string[] }> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("procedimentos, specialty_profiles(evolution_schema, procedimentos)")
    .eq("id", orgId)
    .single();
  if (error) throw new Error(`Falha ao carregar o formulário: ${error.message}`);
  const perfil = data.specialty_profiles as unknown as { evolution_schema: Esquema; procedimentos: string[] };
  return { esquema: perfil.evolution_schema, procedimentos: data.procedimentos ?? perfil.procedimentos };
}

/** Versão atual de cada evolução do paciente (anuladas ficam de fora), da mais nova à mais antiga. */
export async function listarEvolucoes(pacienteId: string): Promise<Evolucao[]> {
  if (!uuidValido(pacienteId)) return [];
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinical_records_atuais")
    .select("id, grupo_id, versao, patient_id, appointment_id, data, conteudo, created_at")
    .eq("org_id", orgId)
    .eq("patient_id", pacienteId)
    .eq("tipo", "evolucao")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Falha ao carregar as evoluções: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    grupoId: r.grupo_id,
    versao: r.versao,
    pacienteId: r.patient_id,
    atendimentoId: r.appointment_id ?? "",
    data: r.data,
    conteudo: r.conteudo as Conteudo,
  }));
}
