import type { Metadata } from "next";
import { PlanoForm } from "@/components/admin/plano-form";
import { Sheet } from "@/components/sheet";
import { precoDoPlano } from "@/domain/assinatura";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planos" };

export default async function PlanosPage() {
  const { papel } = await requireAdmin();
  const supabase = await createClient();
  const [planos, recursos, features, assinaturas] = await Promise.all([
    supabase.from("plans").select("*").order("ordem"),
    supabase.from("recursos").select("id, nome, tipo").order("ordem"),
    supabase.from("plan_features").select("plan_id, recurso, habilitado, limite"),
    supabase.rpc("admin_listar_clientes", { p_limite: 1 }),
  ]);
  if (planos.error || recursos.error || features.error) throw new Error("Falha ao carregar os planos.");
  const catalogo = recursos.data as { id: string; nome: string; tipo: "booleano" | "cota_mensal" }[];
  const totalClientes = (assinaturas.data as { total: number }[] | null)?.[0]?.total ?? 0;

  const recursosDo = (planoId: string) =>
    catalogo.map((r) => {
      const f = features.data.find((x) => x.plan_id === planoId && x.recurso === r.id);
      return { recurso: r.id, habilitado: f?.habilitado ?? false, limite: f?.limite ?? null };
    });

  return (
    <>
      <h1 className="title">Planos e recursos</h1>
      <p className="muted">
        Os preços são hipótese até a decisão P-2 do PRD. Mudar um plano vale na hora para quem já está nele ({totalClientes}{" "}
        cliente{totalClientes === 1 ? "" : "s"} no total).
      </p>

      <div className="admin-grid">
        {planos.data.map((p) => (
          <section key={p.id} className={`card plan${p.ativo ? "" : " done"}`}>
            <h2 className="card-title">
              {p.nome} <span className="muted small">({p.id})</span>
            </h2>
            <p>
              <b>{precoDoPlano(p.preco_centavos, p.intervalo)}</b>
              {!p.publico && <span className="muted small"> · não aparece para a profissional</span>}
              {!p.ativo && <span className="muted small"> · inativo</span>}
            </p>
            {p.descricao && <p className="muted small">{p.descricao}</p>}
            <ul className="features">
              {recursosDo(p.id).map((f) => {
                const r = catalogo.find((x) => x.id === f.recurso)!;
                return (
                  <li key={f.recurso} className={f.habilitado ? "" : "off"}>
                    {r.nome}
                    {f.habilitado && r.tipo === "cota_mensal" && `: ${f.limite ?? "sem limite"}`}
                    {!f.habilitado && " (não incluído)"}
                  </li>
                );
              })}
            </ul>
            {papel === "admin" && (
              <Sheet titulo={`Editar ${p.nome}`} gatilho="Editar plano">
                <PlanoForm
                  catalogo={catalogo}
                  inicial={{
                    id: p.id,
                    nome: p.nome,
                    descricao: p.descricao ?? "",
                    precoCentavos: p.preco_centavos,
                    intervalo: p.intervalo,
                    ativo: p.ativo,
                    publico: p.publico,
                    ordem: p.ordem,
                    recursos: recursosDo(p.id),
                  }}
                />
              </Sheet>
            )}
          </section>
        ))}
      </div>

      {papel === "admin" && (
        <Sheet titulo="Novo plano" classeGatilho="btn" gatilho="Novo plano">
          <PlanoForm catalogo={catalogo} />
        </Sheet>
      )}
    </>
  );
}
