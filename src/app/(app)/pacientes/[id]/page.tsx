import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtendimentoForm } from "@/components/atendimento-form";
import { AtendimentoItem } from "@/components/atendimento-item";
import { Evolucoes } from "@/components/evolucoes";
import { PacoteCartao } from "@/components/pacote-cartao";
import { PacoteForm } from "@/components/pacote-form";
import { PacienteForm } from "@/components/paciente-form";
import { Sheet } from "@/components/sheet";
import { dataCurta, noFuso } from "@/domain/datas";
import { linkWhatsApp } from "@/domain/pacientes";
import { pacoteAtivo } from "@/domain/pacotes";
import { listarAtendimentos } from "@/lib/agenda";
import { carregarConsultorio } from "@/lib/consultorio";
import { carregarFormulario, listarEvolucoes } from "@/lib/evolucao";
import { buscarPaciente, listarPacientes } from "@/lib/pacientes";
import { listarPacotes } from "@/lib/pacotes";

// Título genérico de propósito: nome de paciente não vai para o histórico do navegador.
export const metadata: Metadata = { title: "Ficha do paciente" };

export default async function FichaPage({ params }: PageProps<"/pacientes/[id]">) {
  const { id } = await params;
  const paciente = await buscarPaciente(id);
  if (!paciente) notFound();

  const [{ dados: consultorio }, atendimentos, todos, pacotes, evolucoes, { esquema }] = await Promise.all([
    carregarConsultorio(),
    listarAtendimentos({ pacienteId: id }),
    listarPacientes(),
    listarPacotes(id),
    listarEvolucoes(id),
    carregarFormulario(),
  ]);

  const agora = noFuso(new Date(), consultorio.fuso);
  const hoje = agora.data;
  const proximos = atendimentos.filter((a) => a.data >= hoje && a.status !== "cancelado").slice(0, 5);
  const passados = atendimentos.filter((a) => a.data < hoje);
  const realizadas = atendimentos.filter((a) => a.status === "realizado").length;
  const faltas = atendimentos.filter((a) => a.status === "faltou").length;
  const whatsapp = linkWhatsApp(paciente.telefone);
  const opcoes = todos.map(({ id, nome }) => ({ id, nome }));
  const convenios = [...new Set(["Particular", ...todos.map((p) => p.convenio).filter(Boolean)])];

  const informacoes = [
    ["Telefone", paciente.telefone || "Não informado"],
    ["Convênio", paciente.convenio || "Não informado"],
    ["Diagnóstico de encaminhamento", paciente.diagnostico || "Não informado"],
    ["Encaminhado por", paciente.medico],
    ["Nascimento", paciente.nascimento && dataCurta(paciente.nascimento)],
    ["Observações", paciente.obs],
    ["Histórico", `${realizadas} realizada${realizadas === 1 ? "" : "s"} · ${faltas} falta${faltas === 1 ? "" : "s"}`],
  ].filter(([, valor]) => valor);

  return (
    <>
      <Link href="/pacientes" className="linkbtn back">
        ‹ Pacientes
      </Link>
      <h1 className="title">{paciente.nome}</h1>

      <dl className="info">
        {informacoes.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="actions">
        {whatsapp && (
          <a className="btn ghost" href={whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        <Sheet titulo="Editar cadastro" gatilho="Editar cadastro">
          <PacienteForm id={paciente.id} inicial={paciente} convenios={convenios} />
        </Sheet>
      </div>

      <h2 className="section">Próximos atendimentos</h2>
      {proximos.length ? (
        <div className="list">
          {proximos.map((a) => (
            <AtendimentoItem key={a.id} atendimento={a} pacientes={opcoes} pacotes={pacotes} mostrarData linkFicha={false} />
          ))}
        </div>
      ) : (
        <div className="empty">Nenhum atendimento futuro.</div>
      )}

      <h2 className="section">Pacotes</h2>
      <div className="list">
        {pacotes.map((p) => (
          <PacoteCartao key={p.id} pacote={p} pacientes={opcoes} hoje={hoje} />
        ))}
        <Sheet titulo="Novo pacote" gatilho="Novo pacote">
          <PacoteForm pacientes={opcoes} pacienteId={id} hoje={hoje} />
        </Sheet>
      </div>

      <h2 className="section">Evolução</h2>
      <Link className="btn ghost new-evo" href={`/pacientes/${id}/evolucao`}>
        Nova evolução
      </Link>
      <Evolucoes esquema={esquema} evolucoes={evolucoes} />

      {passados.length > 0 && (
        <>
          <h2 className="section">Anteriores</h2>
          <div className="list">
            {passados.slice(-10).reverse().map((a) => (
              <AtendimentoItem key={a.id} atendimento={a} pacientes={opcoes} pacotes={pacotes} mostrarData linkFicha={false} />
            ))}
          </div>
        </>
      )}

      <Sheet titulo="Novo agendamento" classeGatilho="fab" rotuloGatilho="Agendar para este paciente" gatilho="+">
        <AtendimentoForm
          pacientes={opcoes}
          pacotes={pacotes}
          inicial={{
            pacienteId: paciente.id,
            descricao: "",
            data: hoje,
            hora: "",
            local: "consultorio",
            status: "agendado",
            obs: "",
            pacoteId: pacoteAtivo(pacotes, paciente.id)?.id ?? "",
          }}
        />
      </Sheet>
    </>
  );
}
