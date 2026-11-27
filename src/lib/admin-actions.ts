"use server";

import { revalidatePath } from "next/cache";
import { uuidValido } from "@/domain/agenda";
import { validarModelo } from "@/domain/profissao";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAdmin = { erro: string } | { ok: true };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Chama uma função admin_* do banco; ele confere o papel e as duas etapas de novo. */
async function executar(funcao: string, args: Record<string, unknown>, caminho: string): Promise<ResultadoAdmin> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc(funcao, args);
  if (error?.code === "P0001" || error?.code === "42501") return { erro: error.message };
  if (error) return { erro: "Não foi possível concluir. Tente de novo." };
  revalidatePath(caminho);
  return { ok: true };
}

export async function estenderTeste(org: string, dias: number, motivo: string): Promise<ResultadoAdmin> {
  if (!uuidValido(org)) return { erro: "Cliente inválido." };
  return executar(
    "admin_estender_teste",
    { p_org: org, p_dias: Math.round(Number(dias)), p_motivo: texto(motivo, 300) },
    `/admin/clientes/${org}`,
  );
}

export async function trocarPlano(org: string, plano: string, motivo: string): Promise<ResultadoAdmin> {
  if (!uuidValido(org)) return { erro: "Cliente inválido." };
  return executar(
    "admin_trocar_plano",
    { p_org: org, p_plano: texto(plano, 40), p_motivo: texto(motivo, 300) },
    `/admin/clientes/${org}`,
  );
}

export async function definirStatus(org: string, status: string, motivo: string): Promise<ResultadoAdmin> {
  if (!uuidValido(org)) return { erro: "Cliente inválido." };
  return executar(
    "admin_definir_status",
    { p_org: org, p_status: texto(status, 20), p_motivo: texto(motivo, 300) },
    `/admin/clientes/${org}`,
  );
}

/** habilitado/limite nulos = remove a exceção e volta a seguir o plano. */
export async function definirExcecao(
  org: string,
  recurso: string,
  habilitado: boolean | null,
  limite: number | null,
  motivo: string,
): Promise<ResultadoAdmin> {
  if (!uuidValido(org)) return { erro: "Cliente inválido." };
  if (limite !== null && !(Number.isInteger(limite) && limite >= 0)) return { erro: "Limite inválido." };
  return executar(
    "admin_definir_excecao",
    {
      p_org: org,
      p_recurso: texto(recurso, 40),
      p_habilitado: typeof habilitado === "boolean" ? habilitado : null,
      p_limite: limite,
      p_motivo: texto(motivo, 300),
    },
    `/admin/clientes/${org}`,
  );
}

export type DadosPlano = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  intervalo: "mensal" | "anual";
  ativo: boolean;
  publico: boolean;
  ordem: number;
  recursos: { recurso: string; habilitado: boolean; limite: number | null }[];
};

export async function salvarPlano(p: DadosPlano): Promise<ResultadoAdmin> {
  if (!/^[a-z0-9_]{2,40}$/.test(String(p?.id))) return { erro: "Código do plano: letras minúsculas, números e _." };
  if (!Number.isInteger(p.precoCentavos) || p.precoCentavos < 0) return { erro: "Preço inválido." };
  return executar(
    "admin_salvar_plano",
    {
      p_id: p.id,
      p_nome: texto(p.nome, 80),
      p_descricao: texto(p.descricao, 300) || null,
      p_preco_centavos: p.precoCentavos,
      p_intervalo: p.intervalo === "anual" ? "anual" : "mensal",
      p_ativo: p.ativo === true,
      p_publico: p.publico === true,
      p_ordem: Math.round(Number(p.ordem) || 100),
      p_recursos: (Array.isArray(p.recursos) ? p.recursos : []).map((r) => ({
        recurso: texto(r.recurso, 40),
        habilitado: r.habilitado === true,
        limite: Number.isInteger(r.limite) && (r.limite as number) >= 0 ? r.limite : null,
      })),
    },
    "/admin/planos",
  );
}

/** Novo modelo da profissão (gera versão). Validado aqui e conferido de novo no banco. */
export async function salvarProfissao(id: string, modelo: unknown, motivo: string): Promise<ResultadoAdmin> {
  if (!/^[a-z_]{2,40}$/.test(String(id))) return { erro: "Profissão inválida." };
  const erro = validarModelo(modelo);
  if (erro) return { erro };
  return executar(
    "admin_salvar_profissao",
    { p_id: id, p_modelo: modelo, p_motivo: texto(motivo, 300) },
    `/admin/profissoes/${id}`,
  );
}
