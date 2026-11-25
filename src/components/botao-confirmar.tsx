"use client";

import { useState, useTransition } from "react";

/** Ação destrutiva com confirmação em dois toques, como no protótipo. */
export function BotaoConfirmar({
  texto,
  confirmacao,
  acao,
}: {
  texto: string;
  confirmacao: string;
  acao: () => Promise<void>;
}) {
  const [armado, setArmado] = useState(false);
  const [executando, iniciar] = useTransition();

  return (
    <button
      type="button"
      className="btn danger"
      disabled={executando}
      onClick={() => (armado ? iniciar(acao) : setArmado(true))}
    >
      {executando ? "Aguarde…" : armado ? confirmacao : texto}
    </button>
  );
}
