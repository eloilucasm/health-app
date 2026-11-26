// Dá (ou tira) acesso ao painel administrativo da plataforma.
//
//   npm run admin:conceder -- pessoa@exemplo.com admin     (ou suporte)
//   npm run admin:conceder -- pessoa@exemplo.com remover
//
// A pessoa precisa já ter entrado no app pelo menos uma vez. No primeiro acesso
// ao painel, ela cadastra o app autenticador (duas etapas obrigatórias).
// Ambiente local: lê URL e chave de `supabase status`. Produção: defina
// SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente (nunca em arquivo commitado).
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const [email, papel = "admin"] = process.argv.slice(2);
if (!email || !["admin", "suporte", "remover"].includes(papel)) {
  console.error("Uso: npm run admin:conceder -- <e-mail> [admin|suporte|remover]");
  process.exit(1);
}

let url = process.env.SUPABASE_URL;
let chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  const saida = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const vars = Object.fromEntries(
    saida
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  url = vars.API_URL;
  chave = vars.SECRET_KEY ?? vars.SERVICE_ROLE_KEY;
}

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

let usuario = null;
for (let pagina = 1; !usuario; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
  if (error) throw error;
  usuario = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 200) break;
}
if (!usuario) {
  console.error(`Nenhuma conta com o e-mail ${email}. Entre no app uma vez antes.`);
  process.exit(1);
}

const { error } =
  papel === "remover"
    ? await supabase.from("platform_admins").delete().eq("user_id", usuario.id)
    : await supabase.from("platform_admins").upsert({ user_id: usuario.id, papel });
if (error) throw error;

console.log(papel === "remover" ? `Acesso removido de ${email}.` : `${email} agora é ${papel} da plataforma.`);
