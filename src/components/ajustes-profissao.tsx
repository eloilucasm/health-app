"use client";

import { useState, useTransition } from "react";
import type { TipoAtendimento } from "@/domain/profissao";
import { salvarAjustesProfissao } from "@/lib/profissao-actions";

export type AjustesIniciais = {
  pacotes: boolean;
  /** null = usa os da profissão. */
  tipos: TipoAtendimento[] | null;
  procedimentos: string[] | null;
  padrao: { tipos: TipoAtendimento[]; procedimentos: string[]; pacotes: boolean };
  /** Rótulo da lista de procedimentos (ex.: "Condutas", "Intervenções"). */
  rotuloLista: string;
};

/** Ajustes da profissional (RF-46): recursos, tipos de atendimento e lista de procedimentos. */
export function AjustesProfissaoForm({ inicial }: { inicial: AjustesIniciais }) {
  const [pacotes, setPacotes] = useState(inicial.pacotes);
  const [tipos, setTipos] = useState<TipoAtendimento[]>(inicial.tipos ?? inicial.padrao.tipos);
  const [tiposPadrao, setTiposPadrao] = useState(inicial.tipos === null);
  const [lista, setLista] = useState((inicial.procedimentos ?? inicial.padrao.procedimentos).join("\n"));
  const [listaPadrao, setListaPadrao] = useState(inicial.procedimentos === null);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  const mudarTipo = (i: number, parte: Partial<TipoAtendimento>) => {
    setTiposPadrao(false);
    setTipos((t) => t.map((x, j) => (j === i ? { ...x, ...parte } : x)));
  };

  function salvar() {
    iniciar(async () => {
      const r = await salvarAjustesProfissao({
        pacotes,
        tiposAtendimento: tiposPadrao ? null : tipos,
        procedimentos: listaPadrao ? null : lista,
      });
      setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Ajustes salvos." });
    });
  }

  return (
    <div className="stack">
      <label className="day-toggle card">
        <input type="checkbox" checked={pacotes} onChange={(e) => setPacotes(e.target.checked)} />
        <span>
          <b>Pacotes de sessões</b>
          <br />
          <span className="muted small">Mostra a aba Pacotes e o desconto automático de sessões.</span>
        </span>
      </label>

      <div className="card stack">
        <span className="label">Tipos de atendimento</span>
        {tipos.map((t, i) => (
          <div key={i} className="period tipo">
            <input
              className="input"
              value={t.nome}
              onChange={(e) => mudarTipo(i, { nome: e.target.value })}
              aria-label={`Nome do tipo ${i + 1}`}
              maxLength={60}
            />
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={10}
              max={240}
              step={5}
              value={t.duracao_min || ""}
              onChange={(e) => mudarTipo(i, { duracao_min: Number(e.target.value) })}
              aria-label={`Duração em minutos do tipo ${i + 1}`}
            />
            <button
              type="button"
              className="remove"
              aria-label={`Remover ${t.nome || "tipo"}`}
              onClick={() => {
                setTiposPadrao(false);
                setTipos((x) => x.filter((_, j) => j !== i));
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div className="inline">
          <button
            type="button"
            className="linkbtn"
            onClick={() => {
              setTiposPadrao(false);
              setTipos((x) => [...x, { nome: "", duracao_min: 50 }]);
            }}
          >
            + outro tipo
          </button>
          {!tiposPadrao && (
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setTipos(inicial.padrao.tipos);
                setTiposPadrao(true);
              }}
            >
              Voltar ao padrão da profissão
            </button>
          )}
        </div>
        <p className="muted small">A duração vale para os novos agendamentos daquele tipo.</p>
      </div>

      <label className="field card">
        <span className="label">{inicial.rotuloLista} (uma por linha)</span>
        <textarea
          className="input"
          rows={6}
          value={lista}
          onChange={(e) => {
            setLista(e.target.value);
            setListaPadrao(false);
          }}
        />
        {!listaPadrao && (
          <button
            type="button"
            className="linkbtn"
            onClick={() => {
              setLista(inicial.padrao.procedimentos.join("\n"));
              setListaPadrao(true);
            }}
          >
            Voltar ao padrão da profissão
          </button>
        )}
      </label>

      {mensagem && (
        <p className={mensagem.tipo === "erro" ? "error" : "success"} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}
      <button type="button" className="btn" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando…" : "Salvar ajustes da profissão"}
      </button>
    </div>
  );
}
