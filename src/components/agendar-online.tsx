"use client";

import { useState, useTransition, type FormEvent } from "react";
import { dataLonga } from "@/domain/datas";
import { LOCAIS, type Local } from "@/domain/horarios";
import type { DiaLivre, Horario } from "@/lib/agendamento-online";
import { agendarOnline } from "@/lib/agendamento-online-actions";

/** Escolha do dia, do horário e os dados de contato. */
export function AgendarOnline({ slug, nome, dias }: { slug: string; nome: string; dias: DiaLivre[] }) {
  const [dia, setDia] = useState(dias[0]?.data ?? "");
  const [horario, setHorario] = useState<Horario | null>(null);
  const [dados, setDados] = useState({ nome: "", telefone: "", obs: "", consentimento: false, site: "" });
  const [erro, setErro] = useState("");
  const [confirmado, setConfirmado] = useState<{ dia: string; horario: Horario } | null>(null);
  const [enviando, iniciar] = useTransition();

  if (confirmado) {
    return (
      <div className="card" role="status">
        <h2 className="card-title">Pedido enviado</h2>
        <p>
          {dataLonga(confirmado.dia)}, às <b>{confirmado.horario.hora}</b>.
        </p>
        <p className="muted">
          {nome} vai confirmar pelo WhatsApp informado. Se precisar desmarcar, avise com antecedência.
        </p>
      </div>
    );
  }

  if (!dias.length) {
    return (
      <div className="empty">
        <b>Sem horários livres no momento</b>
        Fale direto com o consultório para encontrar um horário.
      </div>
    );
  }

  const doDia = dias.find((d) => d.data === dia)?.horarios ?? [];

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!horario) return setErro("Escolha um horário.");
    iniciar(async () => {
      const r = await agendarOnline(slug, { ...dados, inicio: horario.inicio });
      if ("erro" in r) {
        setErro(r.erro);
        // O horário pode ter sido tomado: recarrega a lista sem perder o que foi digitado.
        if (/não está mais disponível/.test(r.erro)) setHorario(null);
        return;
      }
      setConfirmado({ dia, horario });
    });
  }

  return (
    <form onSubmit={enviar} className="stack">
      <h2 className="section">1. Escolha o dia</h2>
      <div className="daychips" role="group" aria-label="Dias com horário livre">
        {dias.map((d) => (
          <button
            key={d.data}
            type="button"
            aria-pressed={d.data === dia}
            onClick={() => {
              setDia(d.data);
              setHorario(null);
              setErro("");
            }}
          >
            <small>{dataLonga(d.data).split(",")[0].slice(0, 3)}</small>
            <b>{Number(d.data.slice(8))}</b>
            <small>{dataLonga(d.data).split(" de ")[1]?.slice(0, 3)}</small>
          </button>
        ))}
      </div>

      <h2 className="section">2. Escolha o horário</h2>
      <p className="muted small">{dataLonga(dia)}</p>
      <div className="slots" role="group" aria-label="Horários livres">
        {doDia.map((h) => (
          <button
            key={h.inicio}
            type="button"
            aria-pressed={horario?.inicio === h.inicio}
            onClick={() => {
              setHorario(h);
              setErro("");
            }}
          >
            {h.hora}
            {h.local !== "consultorio" && <small>{LOCAIS[h.local as Local] ?? h.local}</small>}
          </button>
        ))}
      </div>

      <h2 className="section">3. Seus dados</h2>
      <label className="field">
        <span className="label">Nome completo</span>
        <input
          className="input"
          value={dados.nome}
          onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
          autoComplete="name"
          maxLength={120}
          required
        />
      </label>
      <label className="field">
        <span className="label">WhatsApp com DDD</span>
        <input
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={dados.telefone}
          onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value }))}
          placeholder="(73) 99999-0000"
          maxLength={40}
          required
        />
      </label>
      <label className="field">
        <span className="label">Observação (opcional)</span>
        <input
          className="input"
          value={dados.obs}
          onChange={(e) => setDados((d) => ({ ...d, obs: e.target.value }))}
          maxLength={300}
          placeholder="Ex.: primeira consulta"
        />
      </label>
      {/* Armadilha para robôs: invisível e fora da navegação por teclado. */}
      <input
        className="hp"
        name="site"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={dados.site}
        onChange={(e) => setDados((d) => ({ ...d, site: e.target.value }))}
      />
      <label className="consent">
        <input
          type="checkbox"
          checked={dados.consentimento}
          onChange={(e) => setDados((d) => ({ ...d, consentimento: e.target.checked }))}
          required
        />
        <span>
          Autorizo {nome} a usar meu nome e telefone para agendar e confirmar este atendimento, conforme a Lei
          Geral de Proteção de Dados (LGPD).
        </span>
      </label>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={enviando}>
        {enviando ? "Enviando…" : horario ? `Agendar ${horario.hora}` : "Agendar"}
      </button>
    </form>
  );
}
