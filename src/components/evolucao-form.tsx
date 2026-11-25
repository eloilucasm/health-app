"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { corDaEscala, type Campo, type Conteudo, type Esquema } from "@/domain/evolucao";
import { anularEvolucao, salvarEvolucao } from "@/lib/evolucao-actions";

type Valor = string | number | string[] | undefined;

/** Formulário de evolução montado a partir do esquema da especialidade. */
export function EvolucaoForm({
  esquema,
  procedimentos,
  pacienteId,
  atendimentoId,
  registro,
  dataInicial,
  marcaRealizado,
}: {
  esquema: Esquema;
  procedimentos: string[];
  pacienteId: string;
  atendimentoId: string;
  registro?: { id: string; grupoId: string; conteudo: Conteudo };
  dataInicial: string;
  marcaRealizado: boolean;
}) {
  const [data, setData] = useState(dataInicial);
  const [conteudo, setConteudo] = useState<Record<string, Valor>>(registro?.conteudo ?? {});
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [salvando, iniciar] = useTransition();
  const router = useRouter();
  const voltar = () => router.push(`/pacientes/${pacienteId}`);

  const mudar = (chave: string, valor: Valor) => {
    setErro("");
    setConteudo((c) => ({ ...c, [chave]: valor }));
  };

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    iniciar(async () => {
      const resultado = await salvarEvolucao({
        pacienteId,
        atendimentoId,
        grupoId: registro?.grupoId ?? "",
        data,
        conteudo,
      });
      if ("erro" in resultado) return setErro(resultado.erro);
      voltar();
    });
  }

  function campo(c: Campo) {
    const valor = conteudo[c.key];

    if (c.type === "scale") {
      const min = c.min ?? 0;
      const max = c.max ?? 10;
      return (
        <fieldset key={c.key} className="group">
          <legend className="label">{c.label}</legend>
          <div className="evascale">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
              <button
                key={n}
                type="button"
                style={{ background: corDaEscala(n, min, max) }}
                aria-pressed={valor === n}
                aria-label={`${c.label}: ${n}`}
                onClick={() => mudar(c.key, valor === n ? undefined : n)}
              >
                {n}
              </button>
            ))}
          </div>
          {c.legend && (
            <div className="evalegend">
              {c.legend.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          )}
        </fieldset>
      );
    }

    if (c.type === "chips") {
      const marcados = Array.isArray(valor) ? valor : [];
      // Itens já gravados continuam aparecendo, mesmo fora da lista atual.
      const opcoes = [...new Set([...(c.optionsFrom === "procedimentos" ? procedimentos : (c.options ?? [])), ...marcados])];
      return (
        <fieldset key={c.key} className="group">
          <legend className="label">{c.label}</legend>
          <div className="chips">
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                className="chip"
                aria-pressed={marcados.includes(o)}
                onClick={() => mudar(c.key, marcados.includes(o) ? marcados.filter((m) => m !== o) : [...marcados, o])}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      );
    }

    const comum = {
      className: "input",
      value: typeof valor === "string" || typeof valor === "number" ? valor : "",
      placeholder: c.placeholder,
      onChange: (e: { target: { value: string } }) => mudar(c.key, e.target.value),
    };
    return (
      <label key={c.key} className="field">
        <span className="label">{c.label}</span>
        {c.type === "textarea" ? (
          <textarea {...comum} rows={3} maxLength={5000} />
        ) : (
          <input {...comum} type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"} />
        )}
      </label>
    );
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <label className="field">
        <span className="label">Data da sessão</span>
        <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
      </label>
      {esquema.fields.map(campo)}
      {registro && (
        <p className="muted small">Ao salvar, a versão anterior continua guardada no prontuário.</p>
      )}
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : marcaRealizado ? "Salvar e marcar como realizado" : "Salvar evolução"}
      </button>

      {registro &&
        (anulando ? (
          <>
            <label className="field">
              <span className="label">Motivo da anulação</span>
              <input
                className="input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={300}
                placeholder="Ex.: registrado no paciente errado"
              />
            </label>
            <button
              type="button"
              className="btn danger"
              disabled={salvando}
              onClick={() =>
                iniciar(async () => {
                  const resultado = await anularEvolucao(registro.id, motivo);
                  if ("erro" in resultado) return setErro(resultado.erro);
                  voltar();
                })
              }
            >
              Confirmar anulação (não pode ser desfeita)
            </button>
          </>
        ) : (
          <button type="button" className="btn danger" onClick={() => setAnulando(true)}>
            Anular esta evolução
          </button>
        ))}
    </form>
  );
}
