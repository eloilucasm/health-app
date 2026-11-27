"use client";

import { useState, useTransition } from "react";
import { validarModelo } from "@/domain/profissao";
import { salvarProfissao } from "@/lib/admin-actions";

/**
 * Editor do modelo da profissão em JSON (uso da equipe da plataforma). A
 * validação roda aqui, antes de enviar, e de novo no servidor e no banco.
 */
export function ProfissaoEditor({ id, nome, ativo, modelo }: { id: string; nome: string; ativo: boolean; modelo: string }) {
  const [texto, setTexto] = useState(modelo);
  const [dados, setDados] = useState({ nome, ativo });
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  function salvar() {
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch (e) {
      return setMensagem({ tipo: "erro", texto: `JSON inválido: ${(e as Error).message}` });
    }
    const erro = validarModelo(json);
    if (erro) return setMensagem({ tipo: "erro", texto: erro });
    iniciar(async () => {
      const r = await salvarProfissao(id, { ...(json as object), ...dados }, motivo);
      setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Salvo. Uma nova versão foi criada." });
    });
  }

  return (
    <div className="stack">
      <div className="row2">
        <label className="field">
          <span className="label">Nome</span>
          <input className="input" value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} />
        </label>
        <label className="day-toggle">
          <input type="checkbox" checked={dados.ativo} onChange={(e) => setDados((d) => ({ ...d, ativo: e.target.checked }))} />
          Aparece no cadastro de novos consultórios
        </label>
      </div>
      <label className="field">
        <span className="label">Modelo (JSON)</span>
        <textarea className="input json" spellCheck={false} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <p className="muted small">
        Tipos de campo: text, textarea, number (unit, min, max, step), scale (min, max, legend), chips (options ou
        optionsFrom: &quot;procedimentos&quot;), select (options), date, computed (formula: &quot;imc&quot;, inputs) e
        section. &quot;chart&quot;: true mostra a curva na ficha. Não renomeie chaves de campos em uso: registros antigos
        passam a exibir a chave antiga com rótulo genérico.
      </p>
      <label className="field">
        <span className="label">Motivo da alteração (fica no histórico)</span>
        <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
      </label>
      {mensagem && (
        <p className={mensagem.tipo === "erro" ? "error" : "success"} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}
      <button type="button" className="btn" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando…" : "Salvar nova versão"}
      </button>
    </div>
  );
}
