// Cria cinco contas de demonstração, uma por profissão, com paciente, agenda e
// registros de exemplo, e imprime um link de entrada direto para cada uma.
//
//   npm run demo:contas
//
// Só roda contra o Supabase LOCAL (recusa qualquer outro endereço). Rodar de
// novo não duplica dados: contas existentes só ganham um link novo.
// Os links valem por 1 hora e servem uma vez; para entrar de novo, rode outra vez.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const FUSO = "America/Sao_Paulo";

const saida = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const vars = Object.fromEntries(
  saida
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const URL_DB = vars.API_URL;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(URL_DB ?? "")) {
  console.error("Recusado: este comando só roda contra o Supabase local.");
  process.exit(1);
}
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };
const servico = createClient(URL_DB, vars.SECRET_KEY ?? vars.SERVICE_ROLE_KEY, semSessao);
const CHAVE_PUBLICA = vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;

// ---- Datas no fuso do consultório ----
const diaLocal = (deslocamento) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(Date.now() + deslocamento * 86_400_000));
const instante = (dia, hora) => new Date(`${dia}T${hora}:00-03:00`).toISOString();

/** Mesmo cálculo de src/domain/evolucao.ts (peso em kg, altura em cm, uma casa decimal). */
const comImc = (r) => ({ ...r, imc: Math.round((r.peso / (r.altura / 100) ** 2) * 10) / 10 });

// ---- O que cada conta recebe ----
const CONTAS = [
  {
    email: "psicologia@teste.local",
    nome: "Consultório Psi Demo",
    profissao: "psicologia",
    paciente: { nome: "Bruna Psico (exemplo)", diagnostico: "Ansiedade no trabalho", dados_extra: {} },
    registros: [
      {
        resumo: "Relata crises de ansiedade antes de reuniões. Trouxe situações da semana.",
        intervencoes: ["Acolhimento", "Psicoeducação"],
        evolucao: "Identifica melhor os gatilhos do que na primeira sessão.",
        encaminhamentos: "Registrar situações de ansiedade até a próxima sessão.",
      },
    ],
  },
  {
    email: "fonoaudiologia@teste.local",
    nome: "Consultório Fono Demo",
    profissao: "fonoaudiologia",
    paciente: {
      nome: "Lucas Fono (exemplo)",
      diagnostico: "Atraso de fala",
      dados_extra: { responsavel: "Mãe: Paula", responsavelTelefone: "(73) 90000-0001", escola: "Escola Exemplo" },
    },
    registros: [
      {
        objetivos: "Ampliar vocabulário e produção de fonemas bilabiais.",
        areas: ["Terapia de linguagem", "Orientação familiar"],
        atividades: "Jogo de nomeação com figuras; leitura compartilhada.",
        desempenho: "Dentro do esperado",
        orientacoes: "Ler uma história por dia nomeando as figuras.",
      },
    ],
  },
  {
    email: "nutricao@teste.local",
    nome: "Consultório Nutri Demo",
    profissao: "nutricao",
    paciente: {
      nome: "Carla Nutri (exemplo)",
      diagnostico: "Reeducação alimentar",
      dados_extra: { objetivo: "Emagrecimento", restricoes: "Intolerância à lactose" },
    },
    // Dois acompanhamentos para aparecer a curva de peso. O IMC é calculado como o app faz ao salvar.
    registros: [
      comImc({ peso: 82.4, altura: 168, cintura: 94, condutas: ["Plano alimentar"], plano: "Plano de 1.800 kcal, 5 refeições." }),
      comImc({ peso: 80.9, altura: 168, cintura: 91, condutas: ["Reeducação alimentar"], plano: "Manter plano; aumentar fibras." }),
    ],
  },
  {
    email: "odontologia@teste.local",
    nome: "Consultório Odonto Demo",
    profissao: "odontologia",
    paciente: {
      nome: "Diego Odonto (exemplo)",
      diagnostico: "Dor ao mastigar",
      dados_extra: { alergias: "Nenhuma conhecida", medicamentos: "Nenhum" },
    },
    registros: [
      {
        subjetivo: "Dor ao mastigar do lado esquerdo há uma semana.",
        objetivo: "Cárie oclusal no 36; gengiva sem alterações.",
        avaliacao: "Cárie de dentina no 36.",
        plano: "Restauração em resina no 36; profilaxia.",
        procedimentos: ["Profilaxia", "Restauração"],
        dentes: "36",
      },
    ],
  },
  {
    email: "medicina@teste.local",
    nome: "Consultório Médico Demo",
    profissao: "medicina",
    paciente: {
      nome: "Elisa Medicina (exemplo)",
      diagnostico: "Dor lombar",
      dados_extra: { alergias: "Dipirona", medicamentos: "Losartana 50 mg", comorbidades: "Hipertensão" },
    },
    registros: [
      {
        subjetivo: "Dor lombar há 10 dias, piora ao levantar peso.",
        objetivo: "Lasègue negativo; dor à palpação paravertebral.",
        avaliacao: "Lombalgia mecânica.",
        cid: "M54.5",
        plano: "Analgesia, alongamentos e retorno em 2 semanas.",
        condutas: ["Exame físico", "Orientações"],
      },
    ],
  },
];

async function procurarUsuario(email) {
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u || data.users.length < 200) return u ?? null;
  }
}

/** Cliente logado como a conta (passa pelo RLS e pelas mesmas funções do app). */
async function entrarComo(email) {
  const senha = `Demo-${Math.random().toString(36).slice(2)}-Aa1!`;
  let usuario = await procurarUsuario(email);
  if (usuario) {
    const r = await servico.auth.admin.updateUserById(usuario.id, { password: senha });
    if (r.error) throw r.error;
  } else {
    const r = await servico.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (r.error) throw r.error;
    usuario = r.data.user;
  }
  const cliente = createClient(URL_DB, CHAVE_PUBLICA, semSessao);
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return cliente;
}

const falhar = (onde, error) => {
  throw new Error(`${onde}: ${error.message}`);
};

async function prepararConta(conta) {
  const cliente = await entrarComo(conta.email);
  const { data: vinculo } = await cliente.from("memberships").select("org_id").maybeSingle();
  if (vinculo) return "já existia";

  const slug = conta.email.split("@")[0] + "-demo";
  const org = await cliente.rpc("criar_organizacao", { p_nome: conta.nome, p_slug: slug, p_especialidade: conta.profissao });
  if (org.error) falhar("criar consultório", org.error);
  const orgId = org.data;

  const { data: perfil, error: e1 } = await cliente
    .from("specialty_profiles")
    .select("versao, tipos_atendimento")
    .eq("id", conta.profissao)
    .single();
  if (e1) falhar("ler profissão", e1);
  const [primeiroTipo, segundoTipo = primeiroTipo] = perfil.tipos_atendimento;

  const horarios = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, inicio: "08:00", fim: "12:00", local: "consultorio" },
    { weekday, inicio: "14:00", fim: "18:00", local: "consultorio" },
  ]);
  const h = await cliente.rpc("salvar_horarios", { p_org: orgId, p_horarios: horarios, p_duracao: primeiroTipo.duracao_min });
  if (h.error) falhar("horários", h.error);

  const pac = await cliente
    .from("patients")
    .insert({ org_id: orgId, telefone: "(73) 90000-0000", convenio: "Particular", ...conta.paciente })
    .select("id")
    .single();
  if (pac.error) falhar("paciente", pac.error);

  // Atendimentos passados (um por registro), um hoje e um amanhã.
  const passados = conta.registros.map((_, i) => diaLocal(-(conta.registros.length - i) * 7));
  for (const [i, dia] of passados.entries()) {
    const tipo = i === 0 ? primeiroTipo : segundoTipo;
    const a = await cliente
      .from("appointments")
      .insert({
        org_id: orgId,
        patient_id: pac.data.id,
        inicio: instante(dia, "09:00"),
        fim: new Date(Date.parse(instante(dia, "09:00")) + tipo.duracao_min * 60_000).toISOString(),
        tipo_atendimento: tipo.nome,
      })
      .select("id")
      .single();
    if (a.error) falhar("atendimento passado", a.error);
    const r = await cliente.rpc("salvar_evolucao", {
      p_org: orgId,
      p_paciente: pac.data.id,
      p_atendimento: a.data.id,
      p_data: dia,
      p_conteudo: conta.registros[i],
      p_schema_version: perfil.versao,
      p_grupo: null,
    });
    if (r.error) falhar("registro", r.error);
  }
  for (const [deslocamento, hora] of [[0, "15:00"], [1, "10:00"]]) {
    const dia = diaLocal(deslocamento);
    const a = await cliente.from("appointments").insert({
      org_id: orgId,
      patient_id: pac.data.id,
      inicio: instante(dia, hora),
      fim: new Date(Date.parse(instante(dia, hora)) + segundoTipo.duracao_min * 60_000).toISOString(),
      tipo_atendimento: segundoTipo.nome,
      status: deslocamento === 0 ? "confirmado" : "agendado",
    });
    if (a.error) falhar("próximo atendimento", a.error);
  }
  return "criada";
}

/** Link que entra direto na conta (rota /auth/confirm do app). */
async function linkDeEntrada(email) {
  const { data, error } = await servico.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const url = new URL("/auth/confirm", SITE);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "magiclink");
  return url.toString();
}

console.log("Contas de demonstração (Supabase local):\n");
for (const conta of CONTAS) {
  const situacao = await prepararConta(conta);
  console.log(`${conta.profissao.padEnd(15)} ${conta.email.padEnd(28)} ${situacao}`);
  console.log(`  ${await linkDeEntrada(conta.email)}\n`);
}
console.log("Abra cada link numa janela anônima (um consultório por janela).");
console.log("Os links valem por 1 hora e servem uma vez; para novos, rode o comando de novo.");
