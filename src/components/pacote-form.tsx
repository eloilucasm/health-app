"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Pacote } from "@/domain/pacotes";
import { encerrarPacote, excluirPacote, salvarPacote } from "@/lib/pacotes-actions";
import type { OpcaoPaciente } from "./atendimento-form";
import { BotaoConfirmar } from "./botao-confirmar";
import { useFecharFolha } from "./sheet";

export function PacoteForm({
  pacote,
  pacientes,
  pacienteId = "",
  hoje,
}: {
  pacote?: Pacote;
  pacientes: OpcaoPaciente[];
  pacienteId?: string;
  hoje: string;
}) {
  const [dados, setDados] = useState({
    pacienteId: pacote?.pacienteId ?? pacienteId,
    total: String(pacote?.total ?? 10),
    usadasAntes: String(pacote?.usadasAntes ?? 0),
    valor: pacote?.valorCentavos != null ? (pacote.valorCentavos / 100).toFixed(2).replace(".", ",") : "",
    inicio: pacote?.inicio || hoje,
    obs: pacote?.obs ?? "",
  });
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const fechar = useFecharFolha();

  const campo = (nome: keyof typeof dados) => ({
    value: dados[nome],
    onChange: (e: { target: { value: string } }) => {
      setErro("");
      setDados((d) => ({ ...d, [nome]: e.target.value }));
    },
  });

  const executar = async (acao: Promise<{ erro: string } | { ok: true }>) => {
    const resultado = await acao;
    if ("erro" in resultado) return setErro(resultado.erro);
    fechar();
  };

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    iniciar(() => executar(salvarPacote(pacote?.id ?? null, dados)));
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <label className="field">
        <span className="label">Paciente</span>
        <select className="input" {...campo("pacienteId")} disabled={Boolean(pacote)} required>
          <option value="" disabled>
            Selecione…
          </option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="row2">
        <label className="field">
          <span className="label">Total de sessões</span>
          <input className="input" type="number" inputMode="numeric" min={1} max={200} {...campo("total")} required />
        </label>
        <label className="field">
          <span className="label">Sessões já usadas</span>
          <input className="input" type="number" inputMode="numeric" min={0} {...campo("usadasAntes")} />
        </label>
      </div>
      <div className="row2">
        <label className="field">
          <span className="label">Valor do pacote</span>
          <input className="input" inputMode="decimal" {...campo("valor")} placeholder="0,00" />
        </label>
        <label className="field">
          <span className="label">Início</span>
          <input className="input" type="date" {...campo("inicio")} />
        </label>
      </div>
      <label className="field">
        <span className="label">Observação</span>
        <input className="input" {...campo("obs")} maxLength={500} placeholder="Ex.: pago em 3x" />
      </label>
      <p className="muted small">
        “Sessões já usadas” conta as feitas antes de usar o app. As próximas descontam sozinhas quando o atendimento do
        pacote for marcado como realizado.
      </p>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : pacote ? "Salvar pacote" : "Criar pacote"}
      </button>
      {pacote && (
        <>
          <button
            type="button"
            className="btn ghost"
            disabled={salvando}
            onClick={() => iniciar(() => executar(encerrarPacote(pacote.id, !pacote.ativo)))}
          >
            {pacote.ativo ? "Encerrar pacote" : "Reativar pacote"}
          </button>
          <BotaoConfirmar
            texto="Excluir pacote"
            confirmacao="Toque de novo para excluir"
            acao={() => executar(excluirPacote(pacote.id))}
          />
        </>
      )}
    </form>
  );
}
