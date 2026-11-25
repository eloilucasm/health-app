"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

const FecharFolha = createContext<() => void>(() => {});

/** Para o conteúdo de uma folha poder fechá-la (ex.: depois de salvar). */
export const useFecharFolha = () => useContext(FecharFolha);

/**
 * Folha que sobe de baixo, como no protótipo. Usa <dialog>: foco preso,
 * tecla Esc e leitura por leitor de tela sem código extra.
 * O conteúdo só existe enquanto a folha está aberta, então os formulários
 * sempre começam limpos.
 */
export function Sheet({
  titulo,
  gatilho,
  classeGatilho = "btn ghost",
  rotuloGatilho,
  children,
}: {
  titulo: string;
  gatilho: ReactNode;
  classeGatilho?: string;
  rotuloGatilho?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [aberta, setAberta] = useState(false);
  const fechar = () => ref.current?.close();

  useEffect(() => {
    if (aberta && !ref.current?.open) ref.current?.showModal();
  }, [aberta]);

  return (
    <>
      <button type="button" className={classeGatilho} aria-label={rotuloGatilho} onClick={() => setAberta(true)}>
        {gatilho}
      </button>
      {aberta && (
        <dialog
          ref={ref}
          className="sheet"
          aria-labelledby={id}
          onClose={() => setAberta(false)}
          // Toque no fundo escurecido fecha a folha.
          onClick={(e) => e.target === e.currentTarget && fechar()}
        >
          <header>
            <h2 id={id}>{titulo}</h2>
            <button type="button" className="iconbtn" aria-label="Fechar" onClick={fechar}>
              ×
            </button>
          </header>
          <div className="sheet-body">
            <FecharFolha.Provider value={fechar}>{children}</FecharFolha.Provider>
          </div>
        </dialog>
      )}
    </>
  );
}
