"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Estado =
  | { fase: "carregando" }
  | { fase: "cadastrar"; fatorId: string; qr: string; segredo: string }
  | { fase: "confirmar"; fatorId: string };

/** Cadastro do app autenticador (primeira vez) ou digitação do código (demais vezes). */
export function DuasEtapas() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setErro("Não foi possível iniciar a verificação. Recarregue a página.");
      const verificado = data.totp.find((f) => f.status === "verified");
      if (verificado) return setEstado({ fase: "confirmar", fatorId: verificado.id });

      // Cadastros abandonados no meio atrapalham um novo: remove antes.
      for (const f of data.all.filter((x) => x.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const novo = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Painel administrativo" });
      if (novo.error) return setErro("Não foi possível gerar o código de cadastro.");
      setEstado({ fase: "cadastrar", fatorId: novo.data.id, qr: novo.data.totp.qr_code, segredo: novo.data.totp.secret });
    })();
  }, []);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (estado.fase === "carregando") return;
    setEnviando(true);
    setErro("");
    const { error } = await createClient().auth.mfa.challengeAndVerify({
      factorId: estado.fatorId,
      code: codigo.replace(/\D/g, ""),
    });
    setEnviando(false);
    if (error) return setErro("Código inválido ou vencido. Confira o relógio do celular e tente de novo.");
    router.replace("/admin");
    router.refresh();
  }

  if (estado.fase === "carregando") {
    return <p className="muted">{erro || "Preparando a verificação…"}</p>;
  }

  return (
    <form onSubmit={confirmar} className="stack">
      {estado.fase === "cadastrar" && (
        <>
          <p>
            Primeira vez: no seu app autenticador (Google Authenticator, Microsoft Authenticator, 1Password…), adicione
            uma conta lendo este código.
          </p>
          {/* O QR vem do próprio Supabase como imagem SVG em data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={estado.qr} alt="Código QR para o app autenticador" width={200} height={200} className="qr" />
          <p className="muted small">
            Sem câmera? Digite a chave: <code className="secret">{estado.segredo}</code>
          </p>
        </>
      )}
      <label className="field">
        <span className="label">Código de 6 dígitos do app</span>
        <input
          className="input code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
        />
      </label>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={enviando || codigo.length !== 6}>
        {enviando ? "Verificando…" : "Entrar no painel"}
      </button>
    </form>
  );
}
