import type { Metadata } from "next";
import { ListaPacientes } from "@/components/lista-pacientes";
import { PacienteForm } from "@/components/paciente-form";
import { Sheet } from "@/components/sheet";
import { listarPacientes } from "@/lib/pacientes";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PacientesPage() {
  const pacientes = await listarPacientes();
  const convenios = [...new Set(["Particular", ...pacientes.map((p) => p.convenio).filter(Boolean)])];

  return (
    <>
      <h1 className="title">Pacientes</h1>
      {/* Só os campos da lista vão para o navegador (dados mínimos). */}
      <ListaPacientes
        pacientes={pacientes.map(({ id, nome, convenio, diagnostico }) => ({ id, nome, convenio, diagnostico }))}
      />
      <Sheet titulo="Novo paciente" classeGatilho="fab" rotuloGatilho="Novo paciente" gatilho="+">
        <PacienteForm convenios={convenios} />
      </Sheet>
    </>
  );
}
