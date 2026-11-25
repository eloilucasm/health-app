"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { STATUS, type Atendimento, type Status } from "@/domain/agenda";
import { dataLonga, diaMes } from "@/domain/datas";
import { LOCAIS } from "@/domain/horarios";
import { linkWhatsApp } from "@/domain/pacientes";
import { usoDoPacote, type Pacote } from "@/domain/pacotes";
import { mudarStatus } from "@/lib/agenda-actions";
import { AtendimentoForm, type OpcaoPaciente } from "./atendimento-form";
import { LancamentoForm } from "./lancamento-form";
import { PontosSessoes } from "./pontos-sessoes";
import { Sheet } from "./sheet";

/** Linha da agenda. Tocar abre a folha com status e edição. */
export function AtendimentoItem({
  atendimento: a,
  pacientes,
  pacotes,
  mostrarData = false,
  linkFicha = true,
}: {
  atendimento: Atendimento;
  pacientes: OpcaoPaciente[];
  pacotes: Pacote[];
  mostrarData?: boolean;
  linkFicha?: boolean;
}) {
  const pacote = pacotes.find((p) => p.id === a.pacoteId);
  const uso = pacote && usoDoPacote(pacote);
  const detalhes = [
    mostrarData ? diaMes(a.data) : null,
    a.origem === "online" ? "Online" : null,
    a.local !== "consultorio" ? LOCAIS[a.local] : null,
    uso ? `Pacote ${uso.usadas}/${uso.total}` : null,
    a.obs || null,
  ]
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
      <Detalhe atendimento={a} pacientes={pacientes} pacotes={pacotes} linkFicha={linkFicha} />
    </Sheet>
  );
}

function Detalhe({
  atendimento: a,
  pacientes,
  pacotes,
  linkFicha,
}: {
  atendimento: Atendimento;
  pacientes: OpcaoPaciente[];
  pacotes: Pacote[];
  linkFicha: boolean;
}) {
  const [modo, setModo] = useState<"detalhe" | "editar" | "receber">("detalhe");
  const [erro, setErro] = useState("");
  const [mudando, iniciar] = useTransition();

  // O paciente atual precisa estar na lista, mesmo que já tenha sido arquivado.
  const opcoes =
    a.pacienteId && !pacientes.some((p) => p.id === a.pacienteId)
      ? [...pacientes, { id: a.pacienteId, nome: a.titulo }]
      : pacientes;

  const pacote = pacotes.find((p) => p.id === a.pacoteId);
  const ativo = Boolean(a.pacienteId) && pacientes.some((p) => p.id === a.pacienteId);

  if (modo === "editar") return <AtendimentoForm id={a.id} inicial={a} pacientes={opcoes} pacotes={pacotes} />;
  if (modo === "receber") {
    return (
      <LancamentoForm
        inicial={{ descricao: a.titulo, data: a.data, pacienteId: ativo ? a.pacienteId : "", atendimentoId: a.id }}
        pacientes={pacientes}
        hoje={a.data}
      />
    );
  }

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
      {a.origem === "online" && (
        <div className="banner">
          <b>Pedido pelo agendamento online.</b> {a.contato && <>WhatsApp: {a.contato}. </>}
          {!a.pacienteId && "Para ligar a um paciente cadastrado, use Editar agendamento."}
          {a.contato && linkWhatsApp(a.contato) && (
            <>
              {" "}
              <a href={linkWhatsApp(a.contato)!} target="_blank" rel="noopener noreferrer">
                Abrir conversa
              </a>
            </>
          )}
        </div>
      )}
      {pacote && (
        <div className="pack">
          <span className="ph">
            <b>Pacote</b>
            <span className="count">
              {usoDoPacote(pacote).restantes} <small>restantes</small>
            </span>
          </span>
          <PontosSessoes usadas={usoDoPacote(pacote).usadas} total={pacote.total} />
        </div>
      )}
      {ativo && (
        <Link className="btn" href={`/pacientes/${a.pacienteId}/evolucao?atendimento=${a.id}`}>
          Evolução desta sessão
        </Link>
      )}
      {linkFicha && ativo && (
        <Link className="btn ghost" href={`/pacientes/${a.pacienteId}`}>
          Abrir ficha
        </Link>
      )}
      <button type="button" className="btn ghost" onClick={() => setModo("receber")}>
        Lançar recebimento
      </button>
      <button type="button" className="btn ghost" onClick={() => setModo("editar")}>
        Editar agendamento
      </button>
    </div>
  );
}
