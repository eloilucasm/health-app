"use client";

import { useState, useTransition } from "react";
import { CONTAGENS, lerBackup } from "@/domain/importacao";
import { importarBackup, type ResultadoImportacao } from "@/lib/importacao-actions";

type Previa = { arquivo: string; conteudo: string; contagens: string[]; avisos: string[] };

const LIMITE_BYTES = 4_000_000;

/** Escolhe o arquivo, mostra o que será importado e só grava depois da confirmação. */
export function ImportarBackup() {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [importando, iniciar] = useTransition();

  async function escolher(arquivo: File | undefined) {
    setPrevia(null);
    setErro("");
    setResultado(null);
    if (!arquivo) return;
    if (arquivo.size > LIMITE_BYTES) return setErro("Arquivo grande demais (máximo de 4 MB).");

    const conteudo = await arquivo.text();
    let json: unknown;
    try {
      json = JSON.parse(conteudo);
    } catch {
      return setErro("Não consegui ler o arquivo. Ele precisa ser o backup em formato JSON.");
    }
    const leitura = lerBackup(json);
    if ("erro" in leitura) return setErro(leitura.erro);

    setPrevia({
      arquivo: arquivo.name,
      conteudo,
      contagens: Object.entries(CONTAGENS).map(
        ([chave, nome]) => `${nome}: ${leitura.dados[chave as keyof typeof CONTAGENS].length}`,
      ),
      avisos: leitura.avisos,
    });
  }

  if (resultado && "ok" in resultado) {
    return (
      <div className="stack form-sheet" role="status">
        <p className="success">Importação concluída.</p>
        <p>
          Gravados agora:{" "}
          {Object.entries(CONTAGENS)
            .map(([chave, nome]) => `${nome}: ${resultado.contagens[chave] ?? 0}`)
            .join(", ")}
          .
        </p>
        <p className="muted small">O que já tinha sido importado antes não é duplicado.</p>
      </div>
    );
  }

  return (
    <div className="stack form-sheet">
      <p className="muted">
        No app antigo, toque no botão de informações e em “Fazer backup”. Depois escolha aqui o arquivo gerado.
      </p>
      <label className="field">
        <span className="label">Arquivo de backup (.json)</span>
        <input
          className="input"
          type="file"
          accept=".json,application/json"
          onChange={(e) => escolher(e.target.files?.[0])}
        />
      </label>

      {previa && (
        <>
          <p>
            <b>{previa.arquivo}</b> tem {previa.contagens.join(", ")}.
          </p>
          {previa.avisos.length > 0 && (
            <div className="banner">
              <b>Atenção a estes itens:</b>
              <ul>
                {previa.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            className="btn"
            disabled={importando}
            onClick={() =>
              iniciar(async () => {
                const r = await importarBackup(previa.conteudo);
                if ("erro" in r) return setErro(r.erro);
                setResultado(r);
              })
            }
          >
            {importando ? "Importando…" : "Importar estes dados"}
          </button>
        </>
      )}
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
