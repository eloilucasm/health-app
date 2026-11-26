import "server-only";
import { cache } from "react";
import { situacaoValida, type Situacao } from "@/domain/assinatura";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

export type Recurso = { habilitado: boolean; limite: number | null; usado: number };

export type Assinatura = {
  situacao: Situacao;
  podeEscrever: boolean;
  plano: string;
  planoId: string;
  trialAte: string | null;
  recursos: Record<string, Recurso>;
};

/** Situação, plano e recursos do consultório da pessoa logada (calculados no banco). */
export const carregarAssinatura = cache(async (): Promise<Assinatura> => {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("minha_assinatura", { p_org: orgId });
  if (error) throw new Error(`Falha ao carregar a assinatura: ${error.message}`);
  const a = (data ?? {}) as Record<string, unknown>;
  return {
    situacao: situacaoValida(a.situacao) ? a.situacao : "sem_assinatura",
    podeEscrever: a.pode_escrever === true,
    plano: String(a.plano ?? ""),
    planoId: String(a.plano_id ?? ""),
    trialAte: typeof a.trial_ate === "string" ? a.trial_ate : null,
    recursos: (a.recursos ?? {}) as Record<string, Recurso>,
  };
});

export async function temRecurso(recurso: string): Promise<boolean> {
  return (await carregarAssinatura()).recursos[recurso]?.habilitado === true;
}
