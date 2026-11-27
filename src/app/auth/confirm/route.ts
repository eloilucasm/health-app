import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// Só tipos de entrada por e-mail; troca de e-mail e recuperação de senha não existem no app.
const TIPOS: EmailOtpType[] = ["magiclink", "email"];

/**
 * Confirma um link de acesso pelo token (padrão do Supabase para SSR). Diferente
 * de /auth/callback, funciona em qualquer navegador, não só no que pediu o link.
 * Usado pelos links gerados para as contas de demonstração e, no futuro, pelos
 * modelos de e-mail personalizados.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?erro=link", origin));
}
