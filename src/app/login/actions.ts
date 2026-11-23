"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safe-redirect";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", siteUrl());
  if (next !== "/") url.searchParams.set("next", next);
  return url.toString();
}

/** Envia o link mágico de acesso (RF-01). Cria a conta no primeiro acesso. */
export async function enviarLinkMagico(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(formData.get("next"));

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Digite um e-mail válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
  });

  if (error) {
    const limite = error.status === 429 || /rate limit/i.test(error.message);
    return {
      status: "error",
      message: limite
        ? "Muitos pedidos seguidos. Aguarde um minuto e tente de novo."
        : "Não foi possível enviar o link agora. Tente de novo em instantes.",
    };
  }

  return { status: "sent", email };
}

/** Login com Google (RF-01). Só é chamado quando NEXT_PUBLIC_AUTH_GOOGLE=true. */
export async function entrarComGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });

  if (error || !data.url) {
    redirect("/login?erro=google");
  }
  redirect(data.url);
}
