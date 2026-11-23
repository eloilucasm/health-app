import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/**
 * Camada de acesso (DAL): valida a sessão no servidor e devolve só o necessário.
 * Chame em toda página e ação protegida; o proxy é só uma checagem otimista.
 */
export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

export type Membership = {
  orgId: string;
  role: "owner" | "profissional" | "recepcao";
  orgNome: string;
};

/** Organização da pessoa logada (MVP: uma por pessoa). null = ainda não fez o onboarding. */
export async function getMembership(): Promise<Membership | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(nome)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o consultório: ${error.message}`);
  if (!data) return null;

  const org = data.organizations as { nome: string } | { nome: string }[] | null;
  const orgNome = Array.isArray(org) ? (org[0]?.nome ?? "") : (org?.nome ?? "");
  return { orgId: data.org_id, role: data.role as Membership["role"], orgNome };
}
