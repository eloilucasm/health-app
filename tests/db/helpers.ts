import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Env = { url: string; publishableKey: string; secretKey: string };

let cached: Env | null = null;

/** Lê URL e chaves do Supabase local (`supabase status -o env`), ou das variáveis de ambiente. */
export function localEnv(): Env {
  if (cached) return cached;

  let vars: Record<string, string> = {};
  try {
    const out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    vars = Object.fromEntries(
      out
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => [m[1], m[2]]),
    );
  } catch {
    // Sem CLI disponível: depende só das variáveis de ambiente.
  }

  const url = process.env.SUPABASE_TEST_URL ?? vars.API_URL;
  const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;
  const secretKey = process.env.SUPABASE_TEST_SECRET_KEY ?? vars.SECRET_KEY ?? vars.SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !secretKey) {
    throw new Error("Supabase local não encontrado. Rode `npm run db:start` antes de `npm run test:db`.");
  }
  cached = { url, publishableKey, secretKey };
  return cached;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export function adminClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.url, env.secretKey, noSession);
}

export function anonClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.url, env.publishableKey, noSession);
}

/** Cria uma pessoa de teste e devolve um cliente logado como ela (passa pelo RLS). */
export async function createUserClient(label: string) {
  const admin = adminClient();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.local`;
  const password = `Senha-${Math.random().toString(36).slice(2)}-Aa1!`;

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Falha ao criar pessoa de teste: ${error?.message}`);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Falha ao logar pessoa de teste: ${signInError.message}`);

  return { client, userId: data.user.id, email };
}

/** Cria a organização da pessoa via RPC, como o onboarding fará. */
export async function createOrg(client: SupabaseClient, nome: string) {
  const slug = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await client.rpc("criar_organizacao", {
    p_nome: nome,
    p_slug: slug,
    p_especialidade: "fisioterapia",
  });
  if (error) throw new Error(`Falha ao criar organização: ${error.message}`);
  return data as string;
}
