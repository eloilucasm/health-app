import "server-only";
import type { DadosPaciente } from "@/domain/pacientes";
import { uuidValido } from "@/domain/agenda";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type Paciente = DadosPaciente & { id: string };

const COLUNAS = "id, nome, telefone, nascimento, convenio, diagnostico, medico_encaminhador, obs, dados_extra";

type Linha = {
  id: string;
  nome: string;
  telefone: string | null;
  nascimento: string | null;
  convenio: string | null;
  diagnostico: string | null;
  medico_encaminhador: string | null;
  obs: string | null;
  dados_extra: Record<string, string> | null;
};

const paraPaciente = (p: Linha): Paciente => ({
  id: p.id,
  nome: p.nome,
  telefone: p.telefone ?? "",
  nascimento: p.nascimento ?? "",
  convenio: p.convenio ?? "",
  diagnostico: p.diagnostico ?? "",
  medico: p.medico_encaminhador ?? "",
  obs: p.obs ?? "",
  extra: p.dados_extra ?? {},
});

/** Pacientes não arquivados, em ordem alfabética. */
export async function listarPacientes(): Promise<Paciente[]> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select(COLUNAS)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("nome")
    .limit(1000);
  if (error) throw new Error(`Falha ao carregar os pacientes: ${error.message}`);
  return data.map(paraPaciente).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function buscarPaciente(id: string): Promise<Paciente | null> {
  if (!uuidValido(id)) return null;
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select(COLUNAS)
    .eq("org_id", orgId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar o paciente: ${error.message}`);
  return data ? paraPaciente(data) : null;
}
