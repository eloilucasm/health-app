"use client";

import Link from "next/link";
import { useState } from "react";
import { iniciais, normalizar } from "@/domain/pacientes";

export type ResumoPaciente = { id: string; nome: string; convenio: string; diagnostico: string };

/** Lista com busca por nome, convênio ou diagnóstico, sem acentos. */
export function ListaPacientes({ pacientes }: { pacientes: ResumoPaciente[] }) {
  const [busca, setBusca] = useState("");
  const q = normalizar(busca);
  const lista = q
    ? pacientes.filter((p) => normalizar(`${p.nome} ${p.convenio} ${p.diagnostico}`).includes(q))
    : pacientes;

  return (
    <>
      <input
        className="input search"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome, convênio ou diagnóstico"
        aria-label="Buscar paciente"
        autoComplete="off"
      />
      <h2 className="section" aria-live="polite">
        {lista.length} paciente{lista.length === 1 ? "" : "s"}
      </h2>
      {lista.length === 0 ? (
        <div className="empty">
          <b>{q ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}</b>
          {q ? "Tente outro nome." : "Toque em + para cadastrar."}
        </div>
      ) : (
        <div className="list">
          {lista.map((p) => (
            <Link key={p.id} href={`/pacientes/${p.id}`} className="prow">
              <span className="avatar" aria-hidden="true">
                {iniciais(p.nome)}
              </span>
              <span className="p-body">
                <b>{p.nome}</b>
                <span>{[p.convenio || "Convênio não informado", p.diagnostico].filter(Boolean).join(" · ")}</span>
              </span>
              <span aria-hidden="true" className="muted">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
