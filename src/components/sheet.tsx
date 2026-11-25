"use client";

import { useId, useRef, type ReactNode } from "react";

/**
 * Folha que sobe de baixo, como no protótipo. Usa <dialog>: foco preso,
 * tecla Esc e leitura por leitor de tela sem código extra.
 */
export function Sheet({
  titulo,
  gatilho,
  classeGatilho = "btn ghost",
  children,
}: {
  titulo: string;
  gatilho: ReactNode;
  classeGatilho?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  return (
    <>
      <button type="button" className={classeGatilho} onClick={() => ref.current?.showModal()}>
        {gatilho}
      </button>
      <dialog
        ref={ref}
        className="sheet"
        aria-labelledby={id}
        // Toque no fundo escurecido fecha a folha.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <header>
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="iconbtn" aria-label="Fechar" onClick={() => ref.current?.close()}>
            ×
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </dialog>
    </>
  );
}
