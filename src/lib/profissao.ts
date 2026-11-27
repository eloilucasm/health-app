import "server-only";
import { cache } from "react";
import type { Esquema } from "@/domain/evolucao";
import { montarProfissao, type Modelo, type Profissao, type TipoAtendimento } from "@/domain/profissao";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

/** Modelo da profissão do consultório, já com os ajustes da profissional (D-41). */
export const carregarProfissao = cache(async (): Promise<Profissao> => {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "specialty_profile_id, procedimentos, recursos_profissao, tipos_atendimento, " +
        "specialty_profiles(versao, termos, recursos_padrao, tipos_atendimento, patient_schema, evolution_schema, anamnesis_schema, procedimentos)",
    )
    .eq("id", orgId)
    .single();
  if (error) throw new Error(`Falha ao carregar a profissão: ${error.message}`);

  const org = data as unknown as {
    specialty_profile_id: string;
    procedimentos: string[] | null;
    recursos_profissao: Record<string, boolean> | null;
    tipos_atendimento: TipoAtendimento[] | null;
    specialty_profiles: Modelo & { versao: number };
  };
  const modelo = org.specialty_profiles;
  return montarProfissao(org.specialty_profile_id, modelo.versao, modelo, {
    recursos: org.recursos_profissao ?? {},
    tiposAtendimento: org.tipos_atendimento,
    procedimentos: org.procedimentos,
  });
});

/** Formulário de registro de cada versão do modelo, para mostrar registros antigos como foram feitos (D-42). */
export const carregarVersoesDoRegistro = cache(async (): Promise<Record<number, Esquema>> => {
  const profissao = await carregarProfissao();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialty_profile_versions")
    .select("versao, modelo")
    .eq("profile_id", profissao.id);
  if (error) throw new Error(`Falha ao carregar as versões do formulário: ${error.message}`);
  const versoes: Record<number, Esquema> = {};
  for (const v of data) versoes[v.versao] = (v.modelo as { evolution_schema: Esquema }).evolution_schema;
  versoes[profissao.versao] = profissao.evolucao;
  return versoes;
});

/** Ajustes atuais da profissional e o padrão da profissão, para a tela de Ajustes. */
export async function carregarAjustesProfissao() {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("procedimentos, recursos_profissao, tipos_atendimento, specialty_profiles(recursos_padrao, tipos_atendimento, procedimentos, evolution_schema)")
    .eq("id", orgId)
    .single();
  if (error) throw new Error(`Falha ao carregar os ajustes da profissão: ${error.message}`);
  const org = data as unknown as {
    procedimentos: string[] | null;
    recursos_profissao: { pacotes?: boolean } | null;
    tipos_atendimento: TipoAtendimento[] | null;
    specialty_profiles: Pick<Modelo, "recursos_padrao" | "tipos_atendimento" | "procedimentos" | "evolution_schema">;
  };
  const modelo = org.specialty_profiles;
  const padraoPacotes = modelo.recursos_padrao?.pacotes ?? true;
  const lista = modelo.evolution_schema.fields.find((c) => c.type === "chips" && c.optionsFrom === "procedimentos");
  return {
    pacotes: org.recursos_profissao?.pacotes ?? padraoPacotes,
    tipos: org.tipos_atendimento,
    procedimentos: org.procedimentos,
    padrao: { tipos: modelo.tipos_atendimento, procedimentos: modelo.procedimentos ?? [], pacotes: padraoPacotes },
    rotuloLista: lista?.label ?? "Procedimentos",
  };
}
