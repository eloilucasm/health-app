"use client";

import { useState, useTransition, type FormEvent } from "react";
import { STATUS, type DadosAtendimento } from "@/domain/agenda";
import { LOCAIS } from "@/domain/horarios";
import { emAndamento, pacoteAtivo, usoDoPacote, type Pacote } from "@/domain/pacotes";
import { excluirAtendimento, salvarAtendimento } from "@/lib/agenda-actions";
import { BotaoConfirmar } from "./botao-confirmar";
import { useFecharFolha } from "./sheet";

export type OpcaoPaciente = { id: string; nome: string };

export function AtendimentoForm({
  id = null,
  inicial,
  pacientes,
  pacotes,
}: {
  id?: string | null;
  inicial: DadosAtendimento;
  pacientes: OpcaoPaciente[];
  pacotes: Pacote[];
}) {
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const fechar = useFecharFolha();

  const campo = (nome: keyof DadosAtendimento) => ({
    value: dados[nome],
    onChange: (e: { target: { value: string } }) => {
      setErro("");
      setDados((d) => ({ ...d, [nome]: e.target.value }));
    },
  });

  const opcoesDePacote = pacotes.filter(
    (p) => p.pacienteId === dados.pacienteId && (emAndamento(p) || p.id === inicial.pacoteId),
  );

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    iniciar(async () => {
      const resultado = await salvarAtendimento(id, dados);
      if ("erro" in resultado) return setErro(resultado.erro);
      fechar();
    });
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <label className="field">
        <span className="label">Paciente</span>
        <select
          className="input"
          value={dados.pacienteId}
          onChange={(e) => {
            // Trocar o paciente troca também o pacote sugerido.
            const pacienteId = e.target.value;
            setErro("");
            setDados((d) => ({ ...d, pacienteId, pacoteId: pacoteAtivo(pacotes, pacienteId)?.id ?? "" }));
          }}
        >
          <option value="">Sem cadastro</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      {!dados.pacienteId && (
        <label className="field">
          <span className="label">Descrição (sem cadastro)</span>
          <input className="input" {...campo("descricao")} maxLength={120} placeholder="Ex.: Avaliação" />
        </label>
      )}
      {opcoesDePacote.length > 0 && (
        <label className="field">
          <span className="label">Pacote</span>
          <select className="input" {...campo("pacoteId")}>
            <option value="">Sessão avulsa</option>
            {opcoesDePacote.map((p) => (
              <option key={p.id} value={p.id}>
                Pacote de {p.total} · restam {usoDoPacote(p).restantes}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="row2">
        <label className="field">
          <span className="label">Data</span>
          <input className="input" type="date" {...campo("data")} required />
        </label>
        <label className="field">
          <span className="label">Horário</span>
          <input className="input" type="time" {...campo("hora")} required />
        </label>
      </div>
      <div className="row2">
        <label className="field">
          <span className="label">Local</span>
          <select className="input" {...campo("local")}>
            {Object.entries(LOCAIS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Status</span>
          <select className="input" {...campo("status")}>
            {Object.entries(STATUS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Observação</span>
        <input className="input" {...campo("obs")} maxLength={500} />
      </label>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : id ? "Salvar alterações" : "Agendar"}
      </button>
      {id && (
        <BotaoConfirmar
          texto="Excluir atendimento"
          confirmacao="Toque de novo para excluir"
          acao={async () => {
            const resultado = await excluirAtendimento(id);
            if ("erro" in resultado) return setErro(resultado.erro);
            fechar();
          }}
        />
      )}
    </form>
  );
}
