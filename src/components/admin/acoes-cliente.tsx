"use client";

import { useState, useTransition } from "react";
import { definirExcecao, definirStatus, estenderTeste, trocarPlano, type ResultadoAdmin } from "@/lib/admin-actions";

function useAcao() {
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [executando, iniciar] = useTransition();
  const executar = (acao: () => Promise<ResultadoAdmin>, sucesso: string) =>
    iniciar(async () => {
      const r = await acao();
      setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: sucesso });
    });
  const aviso = mensagem && (
    <p className={mensagem.tipo === "erro" ? "error" : "success"} role={mensagem.tipo === "erro" ? "alert" : "status"}>
      {mensagem.texto}
    </p>
  );
  return { executar, executando, aviso };
}

/** Estender teste, trocar plano, suspender e reativar. Toda ação pede motivo. */
export function AcoesCliente({
  org,
  emTeste,
  status,
  planoAtual,
  planos,
}: {
  org: string;
  emTeste: boolean;
  status: string;
  planoAtual: string;
  planos: { id: string; nome: string }[];
}) {
  const [motivo, setMotivo] = useState("");
  const [dias, setDias] = useState(7);
  const [plano, setPlano] = useState(planoAtual);
  const { executar, executando, aviso } = useAcao();

  return (
    <div className="card stack">
      <label className="field">
        <span className="label">Motivo (obrigatório, fica no histórico)</span>
        <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ex.: pedido da cliente por e-mail" />
      </label>
      <div className="admin-actions">
        {emTeste && (
          <div className="inline">
            <input
              className="input small-input"
              type="number"
              min={1}
              max={90}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              aria-label="Dias a mais de teste"
            />
            <button type="button" className="btn ghost" disabled={executando} onClick={() => executar(() => estenderTeste(org, dias, motivo), "Teste estendido.")}>
              Estender teste
            </button>
          </div>
        )}
        <div className="inline">
          <select className="input" value={plano} onChange={(e) => setPlano(e.target.value)} aria-label="Plano">
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn ghost"
            disabled={executando || plano === planoAtual}
            onClick={() => executar(() => trocarPlano(org, plano, motivo), "Plano trocado.")}
          >
            Trocar plano
          </button>
        </div>
        {status === "suspended" || status === "canceled" ? (
          <button type="button" className="btn ghost" disabled={executando} onClick={() => executar(() => definirStatus(org, "active", motivo), "Cliente reativada.")}>
            Reativar
          </button>
        ) : (
          <button type="button" className="btn danger" disabled={executando} onClick={() => executar(() => definirStatus(org, "suspended", motivo), "Cliente suspensa (somente leitura).")}>
            Suspender
          </button>
        )}
      </div>
      {aviso}
    </div>
  );
}

/** Exceção de um recurso para esta cliente: ligar, desligar, mudar o limite ou voltar ao plano. */
export function ExcecaoRecurso({
  org,
  recurso,
  tipo,
  excecao,
}: {
  org: string;
  recurso: string;
  tipo: "booleano" | "cota_mensal";
  excecao: { habilitado: boolean | null; limite: number | null; motivo: string } | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [habilitado, setHabilitado] = useState<string>(excecao?.habilitado == null ? "" : String(excecao.habilitado));
  const [limite, setLimite] = useState(excecao?.limite == null ? "" : String(excecao.limite));
  const [motivo, setMotivo] = useState("");
  const { executar, executando, aviso } = useAcao();

  if (!aberto) {
    return (
      <button type="button" className="linkbtn" onClick={() => setAberto(true)}>
        {excecao ? `Exceção: ${excecao.motivo}` : "Definir exceção"}
      </button>
    );
  }

  const valorHabilitado = habilitado === "" ? null : habilitado === "true";
  const valorLimite = limite === "" ? null : Number(limite);

  return (
    <div className="stack excecao">
      <select className="input" value={habilitado} onChange={(e) => setHabilitado(e.target.value)} aria-label="Ligado">
        <option value="">Segue o plano</option>
        <option value="true">Ligado</option>
        <option value="false">Desligado</option>
      </select>
      {tipo === "cota_mensal" && (
        <input className="input" type="number" min={0} value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="Limite (vazio = do plano)" aria-label="Limite" />
      )}
      <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" aria-label="Motivo" maxLength={300} />
      <div className="inline">
        <button
          type="button"
          className="btn ghost"
          disabled={executando}
          onClick={() => executar(() => definirExcecao(org, recurso, valorHabilitado, valorLimite, motivo), "Exceção salva.")}
        >
          Salvar
        </button>
        <button type="button" className="linkbtn" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </div>
      {aviso}
    </div>
  );
}
