import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PapelAdmin = "admin" | "suporte";

/** Papel na equipe da plataforma, ou null. Não exige as duas etapas. */
export const papelNaPlataforma = cache(async (): Promise<PapelAdmin | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("platform_admins").select("papel").eq("user_id", user.id).maybeSingle();
  return (data?.papel as PapelAdmin | undefined) ?? null;
});

/** Nível da sessão: "aal2" quando a segunda etapa foi feita. */
export async function nivelDaSessao(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? null;
}

/**
 * Porta de toda página do painel. Quem não é da equipe recebe "não encontrado"
 * (não revelamos que o painel existe). Quem é, mas sem a segunda etapa, vai
 * para a verificação. A garantia final está no banco (private.is_platform_admin).
 */
export const requireAdmin = cache(async (): Promise<{ papel: PapelAdmin; email: string | null }> => {
  const user = await requireUser();
  const papel = await papelNaPlataforma();
  if (!papel) notFound();
  if ((await nivelDaSessao()) !== "aal2") redirect("/admin/verificar");
  return { papel, email: user.email };
});
