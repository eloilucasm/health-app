/** Nomes que não podem virar endereço público (/{slug}): colidem com rotas do app. */
export const SLUGS_RESERVADOS = [
  "login", "auth", "onboarding", "config", "agenda", "pacientes", "pacotes",
  "financeiro", "hoje", "api", "admin", "app", "icons", "termos", "privacidade",
];

/** "Consultório Alanna Viana" → "consultorio-alanna-viana" (3 a 40 caracteres). */
export function gerarSlug(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  if (base.length < 3) return `consultorio-${base || "novo"}`.slice(0, 40);
  return SLUGS_RESERVADOS.includes(base) ? `${base}-consultorio` : base;
}

/** O caminho é a página pública de um consultório (/{slug})? */
export function paginaPublica(caminho: string): boolean {
  const m = /^\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])\/?$/.exec(caminho);
  return Boolean(m) && !SLUGS_RESERVADOS.includes(m![1]);
}

/** Acrescenta um sufixo quando o endereço já está em uso, sem passar de 40 caracteres. */
export function comSufixo(slug: string, sufixo: string): string {
  return `${slug.slice(0, 39 - sufixo.length).replace(/-+$/, "")}-${sufixo}`;
}
