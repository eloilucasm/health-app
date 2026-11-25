import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { paginaPublica } from "@/domain/slug";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Rotas acessíveis sem login, além da página pública de cada consultório (/{slug}). */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return paginaPublica(pathname) || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Renova o token do Supabase a cada requisição e manda quem não está logado
 * para /login. É só uma checagem otimista: a autorização de verdade é o RLS
 * no banco e a verificação da sessão em cada página e ação do servidor.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cabeçalhos anti-cache: impedem que uma CDN guarde a sessão de alguém.
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não colocar código entre createServerClient e getClaims: getClaims valida e renova o token.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return copySession(response, NextResponse.redirect(url));
  }

  if (logado && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return copySession(response, NextResponse.redirect(url));
  }

  return response;
}

/** Leva cookies e cabeçalhos de cache renovados para uma resposta de redirecionamento. */
function copySession(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
  return to;
}
