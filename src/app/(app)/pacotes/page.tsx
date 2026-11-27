import type { Metadata } from "next";
import { PacoteCartao } from "@/components/pacote-cartao";
import { PacoteForm } from "@/components/pacote-form";
import { Sheet } from "@/components/sheet";
import { noFuso } from "@/domain/datas";
import { emAndamento } from "@/domain/pacotes";
import { carregarConsultorio } from "@/lib/consultorio";
import { listarPacientes } from "@/lib/pacientes";
import { listarPacotes } from "@/lib/pacotes";
import { carregarProfissao } from "@/lib/profissao";

export const metadata: Metadata = { title: "Pacotes" };

export default async function PacotesPage() {
  if (!(await carregarProfissao()).recursos.pacotes) {
    return (
      <>
        <h1 className="title">Pacotes de sessões</h1>
        <div className="empty">
          <b>Pacotes desligados</b>
          Ligue em Ajustes, na parte “Sua profissão”, se quiser usar pacotes de sessões.
        </div>
      </>
    );
  }
  const [{ dados: consultorio }, pacientes, pacotes] = await Promise.all([
    carregarConsultorio(),
    listarPacientes(),
    listarPacotes(),
  ]);
  const hoje = noFuso(new Date(), consultorio.fuso).data;
  const opcoes = pacientes.map(({ id, nome }) => ({ id, nome }));
  const ativos = pacotes.filter(emAndamento);
  const outros = pacotes.filter((p) => !emAndamento(p));

  return (
    <>
      <h1 className="title">Pacotes de sessões</h1>
      <p className="muted">Cada sessão marcada como realizada na agenda desconta do pacote do paciente.</p>

      <h2 className="section">Em andamento</h2>
      {ativos.length ? (
        <div className="list">
          {ativos.map((p) => (
            <PacoteCartao key={p.id} pacote={p} pacientes={opcoes} hoje={hoje} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <b>Nenhum pacote em andamento</b>
          Toque em + para criar um.
        </div>
      )}

      {outros.length > 0 && (
        <>
          <h2 className="section">Concluídos</h2>
          <div className="list">
            {outros.map((p) => (
              <PacoteCartao key={p.id} pacote={p} pacientes={opcoes} hoje={hoje} />
            ))}
          </div>
        </>
      )}

      <Sheet titulo="Novo pacote" classeGatilho="fab" rotuloGatilho="Novo pacote" gatilho="+">
        <PacoteForm pacientes={opcoes} hoje={hoje} />
      </Sheet>
    </>
  );
}
