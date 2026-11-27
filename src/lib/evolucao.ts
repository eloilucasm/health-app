import "server-only";
import { uuidValido } from "@/domain/agenda";
import type { Conteudo, Esquema } from "@/domain/evolucao";
import { requireMembership } from "@/lib/consultorio";
import { carregarProfissao } from "@/lib/profissao";
import { createClient } from "@/lib/supabase/server";

export type Evolucao = {
  /** id da versão atual. */
  id: string;
  grupoId: string;
  versao: number;
  /** Versão do modelo da profissão usada quando o registro foi feito. */
  versaoModelo: number;
  pacienteId: string;
  atendimentoId: string;
  data: string;
  conteudo: Conteudo;
};

/** Formulário de registro e lista de procedimentos da profissão, com os ajustes do consultório. */
export async function carregarFormulario(): Promise<{ esquema: Esquema; procedimentos: string[] }> {
  const profissao = await carregarProfissao();
  return { esquema: profissao.evolucao, procedimentos: profissao.procedimentos };
}

/** Versão atual de cada registro do paciente (anulados ficam de fora), do mais novo ao mais antigo. */
export async function listarEvolucoes(pacienteId: string): Promise<Evolucao[]> {
  if (!uuidValido(pacienteId)) return [];
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinical_records_atuais")
    .select("id, grupo_id, versao, schema_version, patient_id, appointment_id, data, conteudo, created_at")
    .eq("org_id", orgId)
    .eq("patient_id", pacienteId)
    .eq("tipo", "evolucao")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Falha ao carregar os registros: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    grupoId: r.grupo_id,
    versao: r.versao,
    versaoModelo: r.schema_version,
    pacienteId: r.patient_id,
    atendimentoId: r.appointment_id ?? "",
    data: r.data,
    conteudo: r.conteudo as Conteudo,
  }));
}
