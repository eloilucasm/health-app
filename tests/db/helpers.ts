import { execSync } from "node:child_process";
import { createHmac } from "node:crypto";
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

  return { client, userId: data.user.id, email, password };
}

/** Código TOTP de 6 dígitos (RFC 6238), como um app autenticador geraria. */
export function codigoTotp(segredoBase32: string, agora = Date.now()): string {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of segredoBase32.replace(/=+$/, "").toUpperCase()) {
    bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  }
  const chave = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(agora / 1000 / 30)));
  const hmac = createHmac("sha1", chave).update(contador).digest();
  const deslocamento = hmac[hmac.length - 1] & 0xf;
  const numero = (hmac.readUInt32BE(deslocamento) & 0x7fffffff) % 1_000_000;
  return String(numero).padStart(6, "0");
}

/**
 * Pessoa da equipe da plataforma. Devolve o cliente já com as duas etapas
 * (aal2) e outro, da mesma pessoa, só com a senha (aal1).
 */
export async function createPlatformAdmin(papel: "admin" | "suporte") {
  const pessoa = await createUserClient(`plataforma-${papel}`);
  const { error } = await adminClient().from("platform_admins").insert({ user_id: pessoa.userId, papel });
  if (error) throw new Error(`Falha ao cadastrar administrador: ${error.message}`);

  const fator = await pessoa.client.auth.mfa.enroll({ factorType: "totp" });
  if (fator.error) throw new Error(`Falha ao cadastrar o autenticador: ${fator.error.message}`);
  const verificado = await pessoa.client.auth.mfa.challengeAndVerify({
    factorId: fator.data.id,
    code: codigoTotp(fator.data.totp.secret),
  });
  if (verificado.error) throw new Error(`Falha na segunda etapa: ${verificado.error.message}`);

  const soSenha = anonClient();
  const login = await soSenha.auth.signInWithPassword({ email: pessoa.email, password: pessoa.password });
  if (login.error) throw new Error(`Falha ao logar só com senha: ${login.error.message}`);

  return { comDuasEtapas: pessoa.client, soComSenha: soSenha, userId: pessoa.userId };
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
