import { NextResponse } from "next/server";
import { noFuso } from "@/domain/datas";
import { carregarConsultorio, requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

// Tudo do consultório, inclusive pacientes arquivados e todas as versões do prontuário.
const TABELAS = [
  "working_hours",
  "patients",
  "packages",
  "appointments",
  "clinical_records",
  "transactions",
  "documents",
] as const;

const PAGINA = 1000;

/** Portabilidade dos dados (RF-12, LGPD). Só a dona do consultório. */
export async function GET() {
  const { orgId, role } = await requireMembership();
  if (role !== "owner") return new NextResponse("Sem permissão.", { status: 403 });

  const supabase = await createClient();
  const org = await supabase.from("organizations").select("*").eq("id", orgId).single();
  if (org.error) return new NextResponse("Falha ao exportar.", { status: 500 });

  const saida: Record<string, unknown> = {
    app: "consultorio-no-bolso",
    exportadoEm: new Date().toISOString(),
    organizations: org.data,
  };

  for (const tabela of TABELAS) {
    const linhas: unknown[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .eq("org_id", orgId)
        .order("id")
        .range(inicio, inicio + PAGINA - 1);
      // Melhor falhar do que entregar um arquivo incompleto sem avisar.
      if (error) return new NextResponse("Falha ao exportar.", { status: 500 });
      linhas.push(...data);
      if (data.length < PAGINA) break;
    }
    saida[tabela] = linhas;
  }

  const registro = await supabase.from("audit_log").insert({ org_id: orgId, acao: "exportar", entidade: "tudo" });
  if (registro.error) return new NextResponse("Falha ao exportar.", { status: 500 });

  const { dados } = await carregarConsultorio();
  const hoje = noFuso(new Date(), dados.fuso).data;
  return new NextResponse(JSON.stringify(saida, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultorio-${hoje}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
