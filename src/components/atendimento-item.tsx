"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { STATUS, type Atendimento, type Status } from "@/domain/agenda";
import { dataLonga, diaMes } from "@/domain/datas";
import { LOCAIS } from "@/domain/horarios";
import { mudarStatus } from "@/lib/agenda-actions";
import { AtendimentoForm, type OpcaoPaciente } from "./atendimento-form";
import { Sheet } from "./sheet";

/** Linha da agenda. Tocar abre a folha com status e edição. */
export function AtendimentoItem({
  atendimento: a,
  pacientes,
  mostrarData = false,
  linkFicha = true,
}: {
  atendimento: Atendimento;
  pacientes: OpcaoPaciente[];
  mostrarData?: boolean;
  linkFicha?: boolean;
}) {
  const detalhes = [mostrarData ? diaMes(a.data) : null, a.local !== "consultorio" ? LOCAIS[a.local] : null, a.obs || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Sheet
      titulo={a.titulo}
      classeGatilho={`appt s-${a.status}`}
      gatilho={
        <>
          <span className="time">{a.hora}</span>
          <span className="who">
            <b>{a.titulo}</b>
            <span>{detalhes || LOCAIS[a.local]}</span>
          </span>
          <span className={`pill ${a.status}`}>{STATUS[a.status]}</span>
        </>
      }
    >
      <Detalhe atendimento={a} pacientes={pacientes} linkFicha={linkFicha} />
    </Sheet>
  );
}

function Detalhe({
  atendimento: a,
  pacientes,
  linkFicha,
}: {
  atendimento: Atendimento;
  pacientes: OpcaoPaciente[];
  linkFicha: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const [mudando, iniciar] = useTransition();

  // O paciente atual precisa estar na lista, mesmo que já tenha sido arquivado.
  const opcoes =
    a.pacienteId && !pacientes.some((p) => p.id === a.pacienteId)
      ? [...pacientes, { id: a.pacienteId, nome: a.titulo }]
      : pacientes;

  if (editando) return <AtendimentoForm id={a.id} inicial={a} pacientes={opcoes} />;

  return (
    <div className="stack form-sheet">
      <p className="muted">
        {dataLonga(a.data)} · {a.hora} · {LOCAIS[a.local]}
        {a.obs && <> · {a.obs}</>}
      </p>
      <div className="statusbtns" role="group" aria-label="Status">
        {(Object.keys(STATUS) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            className={s}
            aria-pressed={a.status === s}
            disabled={mudando}
            onClick={() =>
              iniciar(async () => {
                const resultado = await mudarStatus(a.id, s);
                setErro("erro" in resultado ? resultado.erro : "");
              })
            }
          >
            {STATUS[s]}
          </button>
        ))}
      </div>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      {linkFicha && a.pacienteId && pacientes.some((p) => p.id === a.pacienteId) && (
        <Link className="btn ghost" href={`/pacientes/${a.pacienteId}`}>
          Abrir ficha
        </Link>
      )}
      <button type="button" className="btn ghost" onClick={() => setEditando(true)}>
        Editar agendamento
      </button>
    </div>
  );
}
