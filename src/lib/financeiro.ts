import "server-only";
import type { Forma, Lancamento, Situacao, Tipo, TotalMensal } from "@/domain/financeiro";
import { somarDias, somarMeses } from "@/domain/datas";
import { requireMembership } from "@/lib/consultorio";
import { createClient } from "@/lib/supabase/server";

const COLUNAS = "id, tipo, valor_centavos, data, forma, status, descricao, patient_id, appointment_id, obs";

type Linha = {
  id: string;
  tipo: string;
  valor_centavos: number;
  data: string;
  forma: string | null;
  status: string;
  descricao: string | null;
  patient_id: string | null;
  appointment_id: string | null;
  obs: string | null;
};

const paraLancamento = (x: Linha): Lancamento => ({
  id: x.id,
  tipo: x.tipo as Tipo,
  valorCentavos: Number(x.valor_centavos),
  data: x.data,
  forma: (x.forma ?? "") as Forma | "",
  status: x.status as Situacao,
  descricao: x.descricao ?? "",
  pacienteId: x.patient_id ?? "",
  atendimentoId: x.appointment_id ?? "",
  obs: x.obs ?? "",
});

/** Lançamentos de um mês ("AAAA-MM"), do mais recente ao mais antigo. */
export async function listarLancamentos(mes: string): Promise<Lancamento[]> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const primeiro = `${mes}-01`;
  const { data, error } = await supabase
    .from("transactions")
    .select(COLUNAS)
    .eq("org_id", orgId)
    .gte("data", primeiro)
    .lte("data", somarDias(somarMeses(primeiro, 1), -1))
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Falha ao carregar o financeiro: ${error.message}`);
  return data.map(paraLancamento);
}

/** Totais por mês de todo o histórico, saldo inicial e quantidade de recebimentos pendentes. */
export async function carregarTotais(): Promise<{
  totais: TotalMensal[];
  saldoInicial: number;
  pendencias: { quantidade: number; total: number };
}> {
  const { orgId } = await requireMembership();
  const supabase = await createClient();
  const [mensal, org, pendentes] = await Promise.all([
    supabase.from("financeiro_mensal").select("mes, tipo, status, total").eq("org_id", orgId).limit(1000),
    supabase.from("organizations").select("saldo_inicial_centavos").eq("id", orgId).single(),
    supabase
      .from("transactions")
      .select("valor_centavos", { count: "exact" })
      .eq("org_id", orgId)
      .eq("tipo", "entrada")
      .eq("status", "pendente")
      .limit(1000),
  ]);
  if (mensal.error) throw new Error(`Falha ao carregar os totais: ${mensal.error.message}`);
  if (org.error) throw new Error(`Falha ao carregar o saldo inicial: ${org.error.message}`);
  if (pendentes.error) throw new Error(`Falha ao carregar as pendências: ${pendentes.error.message}`);

  return {
    totais: mensal.data.map((t) => ({
      mes: t.mes as string,
      tipo: t.tipo as Tipo,
      status: t.status as Situacao,
      total: Number(t.total),
    })),
    saldoInicial: Number(org.data.saldo_inicial_centavos),
    pendencias: {
      quantidade: pendentes.count ?? pendentes.data.length,
      total: pendentes.data.reduce((s, x) => s + Number(x.valor_centavos), 0),
    },
  };
}
