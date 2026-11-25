import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth center">
      <h1 className="title">Página não encontrada</h1>
      <p className="muted">O endereço não existe ou o registro foi arquivado.</p>
      <Link href="/" className="btn">
        Ir para o início
      </Link>
    </main>
  );
}
