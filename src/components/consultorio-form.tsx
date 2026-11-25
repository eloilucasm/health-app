"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FUSOS, type DadosConsultorio } from "@/domain/consultorio";
import { DIAS_SEMANA, LOCAIS, validarPeriodos, type Local, type Periodo } from "@/domain/horarios";
import { CORES } from "@/domain/tema";
import type { Especialidade } from "@/lib/consultorio";
import { atualizarConsultorio, criarConsultorio } from "@/lib/consultorio-actions";

// Ordem de exibição: semana começando na segunda.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  modo: "criar" | "editar";
  inicial: DadosConsultorio;
  especialidades: Especialidade[];
};

export function ConsultorioForm({ modo, inicial, especialidades }: Props) {
  const [dados, setDados] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  const mudar = <K extends keyof DadosConsultorio>(campo: K, valor: DadosConsultorio[K]) => {
    setMensagem(null);
    setDados((atual) => ({ ...atual, [campo]: valor }));
  };
  const conselho = especialidades.find((e) => e.id === dados.especialidade)?.conselho ?? "conselho";

  const mudarPeriodo = (indice: number, parte: Partial<Periodo>) =>
    mudar("periodos", dados.periodos.map((p, i) => (i === indice ? { ...p, ...parte } : p)));
  const novoPeriodo = (weekday: number): Periodo => ({ weekday, inicio: "08:00", fim: "12:00", local: "consultorio" });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const erro = validarPeriodos(dados.periodos);
    if (erro) {
      setMensagem({ tipo: "erro", texto: erro });
      return;
    }
    iniciar(async () => {
      const resultado = await (modo === "criar" ? criarConsultorio(dados) : atualizarConsultorio(dados));
      // No cadastro, o sucesso redireciona e não devolve nada.
      if (!resultado) return;
      setMensagem("erro" in resultado ? { tipo: "erro", texto: resultado.erro } : { tipo: "ok", texto: "Ajustes salvos." });
    });
  }

  return (
    <form onSubmit={enviar} className="stack">
      <h2 className="section">Dados profissionais</h2>
      <label className="field">
        <span className="label">Nome do consultório ou profissional</span>
        <input
          className="input"
          value={dados.nome}
          onChange={(e) => mudar("nome", e.target.value)}
          autoComplete="organization"
          maxLength={120}
          required
        />
      </label>
      <label className="field">
        <span className="label">Especialidade</span>
        <select
          className="input"
          value={dados.especialidade}
          onChange={(e) => mudar("especialidade", e.target.value)}
          disabled={modo === "editar"}
          required
        >
          <option value="" disabled>
            Selecione…
          </option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="row2">
        <label className="field">
          <span className="label">Registro no {conselho}</span>
          <input className="input" value={dados.registro} onChange={(e) => mudar("registro", e.target.value)} maxLength={40} />
        </label>
        <label className="field">
          <span className="label">Telefone / WhatsApp</span>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={dados.telefone}
            onChange={(e) => mudar("telefone", e.target.value)}
            maxLength={40}
          />
        </label>
      </div>
      <label className="field">
        <span className="label">Endereço</span>
        <input
          className="input"
          autoComplete="street-address"
          value={dados.endereco}
          onChange={(e) => mudar("endereco", e.target.value)}
          maxLength={200}
        />
      </label>
      <label className="field">
        <span className="label">Instagram</span>
        <input
          className="input"
          value={dados.instagram}
          onChange={(e) => mudar("instagram", e.target.value)}
          placeholder="@seuperfil"
          autoCapitalize="none"
          maxLength={40}
        />
      </label>

      <h2 className="section">Horários de atendimento</h2>
      <div className="row2">
        <label className="field">
          <span className="label">Duração da sessão (min)</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={10}
            max={240}
            step={5}
            value={dados.duracaoMin || ""}
            onChange={(e) => mudar("duracaoMin", Number(e.target.value))}
            required
          />
        </label>
        <label className="field">
          <span className="label">Fuso horário</span>
          <select className="input" value={dados.fuso} onChange={(e) => mudar("fuso", e.target.value)}>
            {FUSOS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ORDEM_DIAS.map((dia) => {
        const doDia = dados.periodos.map((p, i) => ({ p, i })).filter(({ p }) => p.weekday === dia);
        return (
          <fieldset key={dia} className="day">
            <legend className="sr-only">{DIAS_SEMANA[dia]}</legend>
            <label className="day-toggle">
              <input
                type="checkbox"
                checked={doDia.length > 0}
                onChange={(e) =>
                  mudar(
                    "periodos",
                    e.target.checked
                      ? [...dados.periodos, novoPeriodo(dia)]
                      : dados.periodos.filter((p) => p.weekday !== dia),
                  )
                }
              />
              <b>{DIAS_SEMANA[dia]}</b>
              {!doDia.length && <span className="muted small">não atendo</span>}
            </label>

            {doDia.map(({ p, i }, n) => (
              <div key={i} className="period">
                <input
                  className="input"
                  type="time"
                  aria-label={`${DIAS_SEMANA[dia]}, período ${n + 1}: início`}
                  value={p.inicio}
                  onChange={(e) => mudarPeriodo(i, { inicio: e.target.value })}
                  required
                />
                <input
                  className="input"
                  type="time"
                  aria-label={`${DIAS_SEMANA[dia]}, período ${n + 1}: fim`}
                  value={p.fim}
                  onChange={(e) => mudarPeriodo(i, { fim: e.target.value })}
                  required
                />
                <select
                  className="input"
                  aria-label={`${DIAS_SEMANA[dia]}, período ${n + 1}: local`}
                  value={p.local}
                  onChange={(e) => mudarPeriodo(i, { local: e.target.value as Local })}
                >
                  {Object.entries(LOCAIS).map(([valor, nome]) => (
                    <option key={valor} value={valor}>
                      {nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="remove"
                  aria-label={`Remover período ${n + 1} de ${DIAS_SEMANA[dia]}`}
                  onClick={() => mudar("periodos", dados.periodos.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}

            {doDia.length > 0 && (
              <button
                type="button"
                className="linkbtn"
                onClick={() => mudar("periodos", [...dados.periodos, { ...novoPeriodo(dia), inicio: "14:00", fim: "18:00" }])}
              >
                + outro período
              </button>
            )}
          </fieldset>
        );
      })}

      <h2 className="section">Aparência</h2>
      <fieldset className="swatches">
        <legend className="label">Cor do app</legend>
        {CORES.map((cor) => (
          <label key={cor.valor} className="swatch" style={{ background: cor.valor }} title={cor.nome}>
            <input
              type="radio"
              name="cor"
              className="sr-only"
              aria-label={cor.nome}
              checked={dados.cor === cor.valor}
              onChange={() => mudar("cor", cor.valor)}
            />
          </label>
        ))}
      </fieldset>

      {mensagem && (
        <p className={mensagem.tipo === "erro" ? "error" : "success"} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}
      <button type="submit" className="btn" disabled={enviando}>
        {enviando ? "Salvando…" : modo === "criar" ? "Criar consultório" : "Salvar ajustes"}
      </button>
    </form>
  );
}
