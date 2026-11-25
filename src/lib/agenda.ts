import "server-only";
import type { Atendimento, Status } from "@/domain/agenda";
import { noFuso, paraInstante, somarDias } from "@/domain/datas";
import type { Local } from "@/domain/horarios";
import { carregarConsultorio } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

type Filtro =
  | { de: string; ate: string } // datas no fuso do consultório, inclusivas
  | { pacienteId: string };

/** Atendimentos do consultório, já com data e hora no fuso dele, em ordem. */
export async function listarAtendimentos(filtro: Filtro): Promise<Atendimento[]> {
  const { orgId, dados } = await carregarConsultorio();
  const supabase = await createClient();

  let consulta = supabase
    .from("appointments")
    .select("id, patient_id, descricao_avulsa, inicio, local, status, obs, patients(nome)")
    .eq("org_id", orgId);

  consulta =
    "pacienteId" in filtro
      ? consulta.eq("patient_id", filtro.pacienteId).order("inicio", { ascending: false }).limit(200)
      : consulta
          .gte("inicio", paraInstante(filtro.de, "00:00", dados.fuso).toISOString())
          .lt("inicio", paraInstante(somarDias(filtro.ate, 1), "00:00", dados.fuso).toISOString())
          .order("inicio");

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao carregar a agenda: ${error.message}`);

  return data
    .map((a) => {
      const paciente = a.patients as unknown as { nome: string } | null;
      return {
        id: a.id,
        pacienteId: a.patient_id ?? "",
        titulo: paciente?.nome ?? a.descricao_avulsa ?? "Sem paciente",
        descricao: a.descricao_avulsa ?? "",
        ...noFuso(a.inicio, dados.fuso),
        local: a.local as Local,
        status: a.status as Status,
        obs: a.obs ?? "",
      };
    })
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
}
