import { getMembership, requireUser } from "@/lib/auth";

// Página provisória do Dia 1: confirma login e vínculo. A tela Hoje chega no Dia 4.
export default async function Home() {
  const user = await requireUser();
  const membership = await getMembership();

  return (
    <main className="auth">
      <div className="auth-brand">
        <span className="auth-mark" aria-hidden="true" />
        <h1>{membership ? membership.orgNome : "Bem-vinda!"}</h1>
        <p className="muted">
          Você entrou como <b className="ink">{user.email}</b>.
        </p>
      </div>

      <div className="card">
        {membership ? (
          <p className="muted">Seu consultório está configurado. As telas do dia a dia chegam nas próximas sessões.</p>
        ) : (
          <>
            <h2 className="card-title">Próximo passo: configurar o consultório</h2>
            <p className="muted">
              Nome, especialidade, registro no conselho e horários de atendimento. Essa etapa chega na próxima
              sessão (Dia 2).
            </p>
          </>
        )}
      </div>

      <form action="/auth/sair" method="post">
        <button type="submit" className="btn ghost">
          Sair
        </button>
      </form>
    </main>
  );
}
