"use server";

import { revalidatePath } from "next/cache";
import { lerLista, lerTipos } from "@/domain/profissao";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoProfissao = { erro: string } | { ok: true };

/**
 * Ajustes da profissional (RF-46): recursos ligados, tipos de atendimento e lista
 * de procedimentos. null em tipos/procedimentos volta ao padrão da profissão.
 */
export async function salvarAjustesProfissao(bruto: unknown): Promise<ResultadoProfissao> {
  const { orgId, role } = await requireMembership();
  if (role !== "owner") return { erro: "Só a dona do consultório altera estes ajustes." };
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  let tipos = null;
  if (b.tiposAtendimento !== null) {
    const lidos = lerTipos(b.tiposAtendimento);
    if (lidos.erro) return { erro: lidos.erro };
    tipos = lidos.tipos;
  }
  const procedimentos = b.procedimentos === null ? null : lerLista(b.procedimentos);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      recursos_profissao: { pacotes: b.pacotes === true },
      tipos_atendimento: tipos,
      procedimentos,
    })
    .eq("id", orgId)
    .select("id");
  if (error || !data.length) return { erro: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
