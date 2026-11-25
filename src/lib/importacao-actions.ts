"use server";

import { revalidatePath } from "next/cache";
import { lerBackup } from "@/domain/importacao";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type ResultadoImportacao = { erro: string } | { ok: true; contagens: Record<string, number> };

/** Recebe o texto do backup e valida de novo no servidor antes de gravar. */
export async function importarBackup(conteudo: string): Promise<ResultadoImportacao> {
  const { orgId, role } = await requireMembership();
  if (role !== "owner") return { erro: "Só a dona do consultório pode importar." };

  let json: unknown;
  try {
    json = JSON.parse(String(conteudo));
  } catch {
    return { erro: "Arquivo inválido." };
  }
  const leitura = lerBackup(json);
  if ("erro" in leitura) return { erro: leitura.erro };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("importar_backup", { p_org: orgId, p_dados: leitura.dados });
  if (error) {
    // Sem o conteúdo do arquivo no log: são dados de saúde.
    console.error("Falha na importação:", error.code);
    return { erro: "A importação falhou e nada foi gravado. Guarde o arquivo e peça ajuda." };
  }

  revalidatePath("/", "layout");
  return { ok: true, contagens: data as Record<string, number> };
}
