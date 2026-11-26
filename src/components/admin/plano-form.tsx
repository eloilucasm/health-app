"use client";

import { useState, useTransition, type FormEvent } from "react";
import { lerCentavos } from "@/domain/dinheiro";
import { salvarPlano, type DadosPlano } from "@/lib/admin-actions";
import { useFecharFolha } from "../sheet";

type Catalogo = { id: string; nome: string; tipo: "booleano" | "cota_mensal" }[];

export function PlanoForm({ catalogo, inicial }: { catalogo: Catalogo; inicial?: DadosPlano }) {
  const novo = !inicial;
  const [plano, setPlano] = useState<DadosPlano>(
    inicial ?? {
      id: "",
      nome: "",
      descricao: "",
      precoCentavos: 0,
      intervalo: "mensal",
      ativo: true,
      publico: true,
      ordem: 100,
      recursos: catalogo.map((r) => ({ recurso: r.id, habilitado: false, limite: null })),
    },
  );
  const [preco, setPreco] = useState((plano.precoCentavos / 100).toFixed(2).replace(".", ","));
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const fechar = useFecharFolha();

  const mudarRecurso = (id: string, parte: Partial<DadosPlano["recursos"][number]>) =>
    setPlano((p) => ({ ...p, recursos: p.recursos.map((r) => (r.recurso === id ? { ...r, ...parte } : r)) }));

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = lerCentavos(preco || "0");
    if (centavos === null) return setErro("Preço inválido. Ex.: 59,00");
    iniciar(async () => {
      const r = await salvarPlano({ ...plano, precoCentavos: centavos });
      if ("erro" in r) return setErro(r.erro);
      fechar();
    });
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <div className="row2">
        <label className="field">
          <span className="label">Código</span>
          <input
            className="input"
            value={plano.id}
            onChange={(e) => setPlano((p) => ({ ...p, id: e.target.value.toLowerCase() }))}
            disabled={!novo}
            placeholder="ex.: profissional"
            required
          />
        </label>
        <label className="field">
          <span className="label">Nome</span>
          <input className="input" value={plano.nome} onChange={(e) => setPlano((p) => ({ ...p, nome: e.target.value }))} required />
        </label>
      </div>
      <label className="field">
        <span className="label">Descrição</span>
        <input className="input" value={plano.descricao} onChange={(e) => setPlano((p) => ({ ...p, descricao: e.target.value }))} maxLength={300} />
      </label>
      <div className="row2">
        <label className="field">
          <span className="label">Preço (R$)</span>
          <input className="input" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Cobrança</span>
          <select
            className="input"
            value={plano.intervalo}
            onChange={(e) => setPlano((p) => ({ ...p, intervalo: e.target.value as "mensal" | "anual" }))}
          >
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>
        </label>
      </div>
      <label className="day-toggle">
        <input type="checkbox" checked={plano.ativo} onChange={(e) => setPlano((p) => ({ ...p, ativo: e.target.checked }))} />
        Ativo (pode ser atribuído a clientes)
      </label>
      <label className="day-toggle">
        <input type="checkbox" checked={plano.publico} onChange={(e) => setPlano((p) => ({ ...p, publico: e.target.checked }))} />
        Aparece para a profissional escolher
      </label>

      <fieldset className="group">
        <legend className="label">Recursos</legend>
        {catalogo.map((r) => {
          const f = plano.recursos.find((x) => x.recurso === r.id) ?? { recurso: r.id, habilitado: false, limite: null };
          return (
            <div key={r.id} className="feature-row">
              <label className="day-toggle">
                <input type="checkbox" checked={f.habilitado} onChange={(e) => mudarRecurso(r.id, { habilitado: e.target.checked })} />
                {r.nome}
              </label>
              {r.tipo === "cota_mensal" && f.habilitado && (
                <input
                  className="input small-input"
                  type="number"
                  min={0}
                  value={f.limite ?? ""}
                  onChange={(e) => mudarRecurso(r.id, { limite: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="sem limite"
                  aria-label={`Limite de ${r.nome}`}
                />
              )}
            </div>
          );
        })}
      </fieldset>

      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : novo ? "Criar plano" : "Salvar plano"}
      </button>
    </form>
  );
}
