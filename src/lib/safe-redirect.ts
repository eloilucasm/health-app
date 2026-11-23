/**
 * Aceita só caminhos internos ("/agenda", "/pacientes?x=1") para evitar
 * redirecionamento aberto para outro site (ex.: "//evil.com", "https://…").
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/auth")) return fallback;
  return value;
}
