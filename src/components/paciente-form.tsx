"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { PACIENTE_VAZIO, type DadosPaciente } from "@/domain/pacientes";
import { arquivarPaciente, salvarPaciente } from "@/lib/pacientes-actions";
import { BotaoConfirmar } from "./botao-confirmar";
import { useFecharFolha } from "./sheet";

export function PacienteForm({
  id = null,
  inicial = PACIENTE_VAZIO,
  convenios,
}: {
  id?: string | null;
  inicial?: DadosPaciente;
  convenios: string[];
}) {
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const fechar = useFecharFolha();
  const router = useRouter();

  const campo = (nome: keyof DadosPaciente) => ({
    value: dados[nome],
    onChange: (e: { target: { value: string } }) => setDados((d) => ({ ...d, [nome]: e.target.value })),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    iniciar(async () => {
      const resultado = await salvarPaciente(id, dados);
      if ("erro" in resultado) return setErro(resultado.erro);
      fechar();
      if (!id) router.push(`/pacientes/${resultado.id}`);
    });
  }

  return (
    <form onSubmit={enviar} className="stack form-sheet">
      <label className="field">
        <span className="label">Nome completo</span>
        <input className="input" {...campo("nome")} maxLength={160} autoComplete="off" required />
      </label>
      <div className="row2">
        <label className="field">
          <span className="label">Telefone / WhatsApp</span>
          <input className="input" type="tel" inputMode="tel" {...campo("telefone")} maxLength={40} />
        </label>
        <label className="field">
          <span className="label">Nascimento</span>
          <input className="input" type="date" {...campo("nascimento")} />
        </label>
      </div>
      <label className="field">
        <span className="label">Convênio</span>
        <input className="input" list="convenios" {...campo("convenio")} maxLength={80} placeholder="Particular, Unimed…" />
        <datalist id="convenios">
          {convenios.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span className="label">Diagnóstico de encaminhamento</span>
        <textarea className="input" rows={2} {...campo("diagnostico")} maxLength={1000} />
      </label>
      <label className="field">
        <span className="label">Quem encaminhou</span>
        <input className="input" {...campo("medico")} maxLength={160} />
      </label>
      <label className="field">
        <span className="label">Observações</span>
        <textarea className="input" rows={3} {...campo("obs")} maxLength={2000} />
      </label>
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" className="btn" disabled={salvando}>
        {salvando ? "Salvando…" : id ? "Salvar cadastro" : "Cadastrar paciente"}
      </button>
      {id && (
        <BotaoConfirmar
          texto="Arquivar paciente"
          confirmacao="Toque de novo: arquiva e cancela os atendimentos futuros"
          acao={async () => {
            const resultado = await arquivarPaciente(id);
            if ("erro" in resultado) return setErro(resultado.erro);
            router.push("/pacientes");
          }}
        />
      )}
    </form>
  );
}
