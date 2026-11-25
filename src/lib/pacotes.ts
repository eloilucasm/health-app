import "server-only";
import type { Pacote } from "@/domain/pacotes";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

/** Pacotes do consultório com o uso calculado no banco, do mais novo ao mais antigo. */
export async function listarPacotes(pacienteId?: string): Promise<Pacote[]> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();

  let consulta = supabase
    .from("pacotes_com_uso")
    .select("id, patient_id, total, usadas_antes, realizadas, valor_centavos, inicio, ativo, obs")
    .eq("org_id", orgId)
    .order("inicio", { ascending: false })
    .limit(500);
  if (pacienteId) consulta = consulta.eq("patient_id", pacienteId);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao carregar os pacotes: ${error.message}`);
  if (!data.length) return [];

  // A visão não tem relação declarada com pacientes; busca os nomes à parte.
  const nomes = await supabase
    .from("patients")
    .select("id, nome, deleted_at")
    .eq("org_id", orgId)
    .in("id", [...new Set(data.map((p) => p.patient_id))]);
  if (nomes.error) throw new Error(`Falha ao carregar os pacientes: ${nomes.error.message}`);
  const ativos = new Map(nomes.data.filter((p) => !p.deleted_at).map((p) => [p.id, p.nome]));

  // Pacotes de pacientes arquivados saem das listas.
  return data
    .filter((p) => ativos.has(p.patient_id))
    .map((p) => ({
      id: p.id,
      pacienteId: p.patient_id,
      pacienteNome: ativos.get(p.patient_id)!,
      total: p.total,
      usadasAntes: p.usadas_antes,
      realizadas: p.realizadas,
      valorCentavos: p.valor_centavos === null ? null : Number(p.valor_centavos),
      inicio: p.inicio ?? "",
      ativo: p.ativo,
      obs: p.obs ?? "",
    }));
}
