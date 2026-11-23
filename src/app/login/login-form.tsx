"use client";

import { useActionState } from "react";
import { enviarLinkMagico, entrarComGoogle, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState(enviarLinkMagico, initial);

  if (state.status === "sent") {
    return (
      <div className="card" role="status">
        <h2 className="card-title">Confira seu e-mail</h2>
        <p className="muted">
          Enviamos um link de acesso para <b className="ink">{state.email}</b>. Abra o e-mail neste
          mesmo aparelho e toque no link para entrar.
        </p>
        <p className="muted small">Não chegou? Veja a caixa de spam ou peça outro link em um minuto.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <form action={action} className="stack" noValidate>
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span className="label">Seu e-mail</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            className="input"
          />
        </label>
        {state.status === "error" && (
          <p className="error" role="alert">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Enviando…" : "Receber link de acesso"}
        </button>
      </form>

      {google && (
        <form action={entrarComGoogle}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn ghost">
            Entrar com Google
          </button>
        </form>
      )}
    </div>
  );
}
