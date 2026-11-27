"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  TERMOS_PADRAO,
  type EsquemaPaciente,
  type RecursoProfissao,
  type Termos,
  type TipoAtendimento,
} from "@/domain/profissao";

export type ProfissaoCliente = {
  termos: Termos;
  recursos: Record<RecursoProfissao, boolean>;
  tiposAtendimento: TipoAtendimento[];
  paciente: EsquemaPaciente;
};

const Contexto = createContext<ProfissaoCliente>({
  termos: TERMOS_PADRAO,
  recursos: { pacotes: true },
  tiposAtendimento: [{ nome: "Sessão", duracao_min: 50 }],
  paciente: { base: { diagnostico: "Diagnóstico de encaminhamento", medico: "Quem encaminhou" }, fields: [] },
});

/** Termos, recursos, tipos de atendimento e campos do paciente da profissão, para o navegador. */
export function ProfissaoProvider({ valor, children }: { valor: ProfissaoCliente; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useProfissao = () => useContext(Contexto);
