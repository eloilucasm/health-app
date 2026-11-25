"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { AjustesOnline } from "@/lib/agendamento-online";
import { salvarAjustesOnline } from "@/lib/agendamento-online-actions";

export function AjustesOnlineForm({ inicial, link }: { inicial: AjustesOnline; link: string }) {
  const [dados, setDados] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [salvando, iniciar] = useTransition();

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    iniciar(async () => {
      const r = await salvarAjustesOnline(dados);
      setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Ajustes salvos." });
    });
  }

  return (
    <form onSubmit={enviar} className="stack">
      <label className="day-toggle card">
        <input
          type="checkbox"
          checked={dados.ativo}
          onChange={(e) => setDados((d) => ({ ...d, ativo: e.target.checked }))}
        />
        <span>
          <b>Receber agendamentos pelo link</b>
          <br />
          <span className="muted small">
            A página mostra seu nome, especialidade, registro, endereço, WhatsApp e Instagram, e os horários livres.
          </span>
        </span>
      </label>
      {dados.ativo && (
        <div className="card stack">
          <span className="label">Seu link</span>
          <b className="link-out">{link}</b>
          <div className="actions">
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => {});
                setCopiado(true);
              }}
            >
              {copiado ? "Copiado" : "Copiar link"}
            </button>
            <a className="btn ghost" href={`/${dados.slug}`} target="_blank" rel="noopener noreferrer">
              Ver página
            </a>
          </div>
        </div>
      )}
      <div className="row2">
        <label className="field">
          <span className="label">Antecedência mínima (horas)</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            value={dados.antecedenciaHoras}
            onChange={(e) => setDados((d) => ({ ...d, antecedenciaHoras: Number(e.target.value) }))}
          />
        </label>
        <label className="field">
          <span className="label">Agenda aberta (dias)</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={dados.janelaDias}
            onChange={(e) => setDados((d) => ({ ...d, janelaDias: Number(e.target.value) }))}
          />
        </label>
      </div>
      <label className="field">
        <span className="label">Mensagem na página (opcional)</span>
        <input
          className="input"
          value={dados.mensagem}
          onChange={(e) => setDados((d) => ({ ...d, mensagem: e.target.value }))}
          maxLength={300}
          placeholder="Ex.: Atendo convênio Unimed e particular."
        />
      </label>
      {mensagem && (
        <p className={mensagem.tipo === "erro" ? "error" : "success"} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar agendamento online"}
      </button>
    </form>
  );
}
