"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lerDados, type DadosConsultorio } from "@/domain/consultorio";
import { comSufixo, gerarSlug } from "@/domain/slug";
import { getMembership, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ResultadoSalvar = { erro: string } | { ok: true };

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Grava o que não faz parte da criação: contato, fuso, cor e horários. */
async function gravarDetalhes(supabase: Cliente, orgId: string, d: DadosConsultorio) {
  const org = await supabase
    .from("organizations")
    .update({
      nome: d.nome,
      registro: d.registro || null,
      telefone: d.telefone || null,
      endereco: d.endereco || null,
      instagram: d.instagram || null,
      timezone: d.fuso,
      tema: { cor: d.cor },
    })
    .eq("id", orgId)
    .select("id");
  // Sem linha alterada = o RLS barrou (só a dona do consultório pode alterar).
  if (org.error || !org.data.length) return false;

  const horas = await supabase.rpc("salvar_horarios", {
    p_org: orgId,
    p_horarios: d.periodos,
    p_duracao: d.duracaoMin,
  });
  return !horas.error;
}

/** Onboarding (RF-02, RF-03): cria o consultório e entra no app. */
export async function criarConsultorio(bruto: unknown): Promise<ResultadoSalvar> {
  await requireUser();
  if (await getMembership()) redirect("/");

  const { dados, erro } = lerDados(bruto);
  if (erro) return { erro };

  const supabase = await createClient();
  const base = gerarSlug(dados.nome);
  let orgId: string | null = null;

  for (let tentativa = 0; tentativa < 4 && !orgId; tentativa++) {
    const slug = tentativa === 0 ? base : comSufixo(base, Math.random().toString(36).slice(2, 6));
    const { data, error } = await supabase.rpc("criar_organizacao", {
      p_nome: dados.nome,
      p_slug: slug,
      p_especialidade: dados.especialidade,
    });
    if (!error) orgId = data as string;
    else if (error.code !== "23505") return { erro: "Não foi possível criar o consultório. Tente de novo." };
  }
  if (!orgId) return { erro: "Não foi possível criar o consultório. Tente de novo." };

  const completo = await gravarDetalhes(supabase, orgId, dados);
  revalidatePath("/", "layout");
  redirect(completo ? "/" : "/config?aviso=incompleto");
}

/** Tela de ajustes. Especialidade e endereço público não mudam por aqui. */
export async function atualizarConsultorio(bruto: unknown): Promise<ResultadoSalvar> {
  await requireUser();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const { dados, erro } = lerDados(bruto);
  if (erro) return { erro };

  const supabase = await createClient();
  if (!(await gravarDetalhes(supabase, membership.orgId, dados))) {
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
