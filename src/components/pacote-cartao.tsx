import { diaMes } from "@/domain/datas";
import { formatarBRL } from "@/domain/dinheiro";
import { emAndamento, usoDoPacote, type Pacote } from "@/domain/pacotes";
import type { OpcaoPaciente } from "./atendimento-form";
import { PacoteForm } from "./pacote-form";
import { PontosSessoes } from "./pontos-sessoes";
import { Sheet } from "./sheet";

export function PacoteCartao({
  pacote,
  pacientes,
  hoje,
}: {
  pacote: Pacote;
  pacientes: OpcaoPaciente[];
  hoje: string;
}) {
  const uso = usoDoPacote(pacote);
  const concluido = !emAndamento(pacote);

  return (
    <Sheet
      titulo={`Pacote de ${pacote.pacienteNome}`}
      classeGatilho={`pack${concluido ? " done" : ""}`}
      gatilho={
        <>
          <span className="ph">
            <b>{pacote.pacienteNome}</b>
            <span className="count">
              {uso.restantes} <small>restante{uso.restantes === 1 ? "" : "s"}</small>
            </span>
          </span>
          <PontosSessoes usadas={uso.usadas} total={uso.total} />
          <span className="meta">
            <span>
              {uso.usadas} de {uso.total} usadas
            </span>
            {pacote.valorCentavos != null && <span>{formatarBRL(pacote.valorCentavos)}</span>}
            {pacote.inicio && <span>Início {diaMes(pacote.inicio)}</span>}
            {concluido && <span>{pacote.ativo ? "Concluído" : "Encerrado"}</span>}
          </span>
        </>
      }
    >
      <PacoteForm pacote={pacote} pacientes={pacientes} hoje={hoje} />
    </Sheet>
  );
}
