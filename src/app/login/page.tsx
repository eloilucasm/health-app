import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  link: "Esse link de acesso expirou ou já foi usado. Peça um novo abaixo.",
  google: "Não foi possível entrar com o Google. Tente de novo ou use o e-mail.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const erro = typeof params.erro === "string" ? ERROS[params.erro] : undefined;

  return (
    <main className="auth">
      <div className="auth-brand">
        <span className="auth-mark" aria-hidden="true" />
        <h1>Consultório no Bolso</h1>
        <p className="muted">Agenda, pacientes e financeiro do seu consultório, no celular.</p>
      </div>
      {erro && (
        <p className="banner" role="alert">
          {erro}
        </p>
      )}
      <LoginForm next={next} google={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} />
      <p className="muted small center">
        Sem senha: você recebe um link por e-mail a cada acesso. No primeiro acesso, sua conta é criada.
      </p>
    </main>
  );
}
