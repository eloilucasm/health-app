"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FORMAS, type Lancamento } from "@/domain/financeiro";
import { excluirLancamento, marcarRecebido, salvarLancamento, salvarSaldoInicial } from "@/lib/financeiro-actions";
import type { OpcaoPaciente } from "./atendimento-form";
import { BotaoConfirmar } from "./botao-confirmar";
import { useFecharFolha } from "./sheet";

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export function LancamentoForm({
  lancamento,
  inicial,
  pacientes,
  hoje,
}: {
  lancamento?: Lancamento;
  /** Valores já preenchidos num lançamento novo. */
  inicial?: { descricao?: string; data?: string; pacienteId?: string; atendimentoId?: string };
  pacientes: OpcaoPaciente[];
  hoje: string;
}) {
  const [dados, setDados] = useState({
    tipo: lancamento?.tipo ?? "entrada",
    descricao: lancamento?.descricao ?? inicial?.descricao ?? "",
    valor: lancamento ? reais(lancamento.valorCentavos) : "",
    data: lancamento?.data ?? inicial?.data ?? hoje,
    forma: lancamento?.forma || "pix",
    status: lancamento?.status ?? "recebido",
    pacienteId: lancamento?.pacienteId ?? inicial?.pacienteId ?? "",
    atendimentoId: lancamento?.atendimentoId ?? inicial?.atendimentoId ?? "",
    obs: lancamento?.obs ?? "",
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
    iniciar(() => executar(salvarLancamento(lancamento?.id ?? null, dados)));
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <div className="segbtns" role="group" aria-label="Tipo">
        {(["entrada", "saida"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={dados.tipo === t}
            onClick={() => setDados((d) => ({ ...d, tipo: t }))}
          >
            {t === "entrada" ? "Entrada" : "Saída"}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="label">Descrição</span>
        <input className="input" {...campo("descricao")} maxLength={200} placeholder="Paciente ou despesa" />
      </label>
      <div className="row2">
        <label className="field">
          <span className="label">Valor</span>
          <input className="input" inputMode="decimal" {...campo("valor")} placeholder="0,00" required />
        </label>
        <label className="field">
          <span className="label">Data</span>
          <input className="input" type="date" {...campo("data")} required />
        </label>
      </div>
      <div className="row2">
        <label className="field">
          <span className="label">Forma</span>
          <select className="input" {...campo("forma")}>
            {Object.entries(FORMAS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        {dados.tipo === "entrada" && (
          <label className="field">
            <span className="label">Situação</span>
            <select className="input" {...campo("status")}>
              <option value="recebido">Recebido</option>
              <option value="pendente">Pendente</option>
            </select>
          </label>
        )}
      </div>
      <label className="field">
        <span className="label">Paciente (opcional)</span>
        <select className="input" {...campo("pacienteId")}>
          <option value="">Nenhum</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
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
        {salvando ? "Salvando…" : lancamento ? "Salvar lançamento" : "Lançar"}
      </button>
      {lancamento?.status === "pendente" && (
        <button
          type="button"
          className="btn ghost"
          disabled={salvando}
          onClick={() => iniciar(() => executar(marcarRecebido(lancamento.id)))}
        >
          Marcar como recebido hoje
        </button>
      )}
      {lancamento && (
        <BotaoConfirmar
          texto="Excluir lançamento"
          confirmacao="Toque de novo para excluir"
          acao={() => executar(excluirLancamento(lancamento.id))}
        />
      )}
    </form>
  );
}

export function SaldoInicialForm({ saldoInicial }: { saldoInicial: number }) {
  const [valor, setValor] = useState(reais(saldoInicial));
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const fechar = useFecharFolha();

  return (
    <form
      className="stack form-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const resultado = await salvarSaldoInicial(valor);
          if ("erro" in resultado) return setErro(resultado.erro);
          fechar();
        });
      }}
    >
      <label className="field">
        <span className="label">Saldo inicial</span>
        <input className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      <p className="muted small">Quanto havia em caixa antes do primeiro lançamento no app.</p>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
