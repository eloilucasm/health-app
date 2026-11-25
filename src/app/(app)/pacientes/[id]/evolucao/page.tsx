import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvolucaoForm } from "@/components/evolucao-form";
import { noFuso } from "@/domain/datas";
import { listarAtendimentos } from "@/lib/agenda";
import { carregarConsultorio } from "@/lib/consultorio";
import { carregarFormulario, listarEvolucoes } from "@/lib/evolucao";
import { buscarPaciente } from "@/lib/pacientes";

export const metadata: Metadata = { title: "Evolução" };

/** ?registro=<grupo> edita; ?atendimento=<id> registra (ou abre a já existente) daquela sessão. */
export default async function EvolucaoPage({ params, searchParams }: PageProps<"/pacientes/[id]/evolucao">) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  const paciente = await buscarPaciente(id);
  if (!paciente) notFound();

  const [{ dados: consultorio }, { esquema, procedimentos }, evolucoes, atendimentos] = await Promise.all([
    carregarConsultorio(),
    carregarFormulario(),
    listarEvolucoes(id),
    listarAtendimentos({ pacienteId: id }),
  ]);

  const registro = evolucoes.find((e) => e.grupoId === consulta.registro);
  if (consulta.registro && !registro) notFound();

  const atendimento = atendimentos.find((a) => a.id === (registro?.atendimentoId || consulta.atendimento));
  if (!registro && atendimento) {
    const existente = evolucoes.find((e) => e.atendimentoId === atendimento.id);
    if (existente) redirect(`/pacientes/${id}/evolucao?registro=${existente.grupoId}`);
  }

  const hoje = noFuso(new Date(), consultorio.fuso).data;

  return (
    <>
      <Link href={`/pacientes/${id}`} className="linkbtn back">
        ‹ {paciente.nome}
      </Link>
      <h1 className="title">{registro ? "Evolução da sessão" : "Nova evolução"}</h1>
      <EvolucaoForm
        key={registro?.id ?? atendimento?.id ?? "nova"}
        esquema={esquema}
        procedimentos={procedimentos}
        pacienteId={id}
        atendimentoId={atendimento?.id ?? ""}
        registro={registro && { id: registro.id, grupoId: registro.grupoId, conteudo: registro.conteudo }}
        dataInicial={registro?.data ?? atendimento?.data ?? hoje}
        marcaRealizado={!registro && Boolean(atendimento) && atendimento?.status !== "realizado"}
      />
    </>
  );
}
