@AGENTS.md

# Consultório no Bolso

SaaS para profissionais de saúde autônomas (agenda, pacientes, evolução, pacotes, financeiro), nascido do protótipo da fisioterapeuta Alanna Viana ([legacy/index.html](legacy/index.html)). Idioma do produto, da documentação e dos commits: português do Brasil.

## Documentos de referência
- [docs/PLANO.md](docs/PLANO.md): plano aprovado, arquitetura e roadmap de 10 dias
- [docs/PRD.md](docs/PRD.md): requisitos (RF/RNF) com status, decisões (D-xx) e perguntas em aberto
- [CHANGELOG.md](CHANGELOG.md): uma entrada por sessão
- [docs/GUIA-DE-SESSAO.md](docs/GUIA-DE-SESSAO.md): ritual de início e de fechamento de sessão

## Regras de toda sessão
- **Ao começar:** ler a última entrada do CHANGELOG (linha "Próxima sessão") e os RFs do dia no PRD.
- **Ao terminar:** seguir o checklist de fechamento do guia: atualizar CHANGELOG e PRD, depois o commit de fechamento (Conventional Commits em português, com `Refs: RF-xx`).
- Escopo congelado: ideia nova vai para o PRD (perguntas em aberto ou fora do escopo), não para o código.
- Decisão de produto ou arquitetura vira linha nova no Registro de decisões do PRD.

## Princípios da plataforma (obrigatórios; PRD D-27 a D-31, PLANO §11)
1. **A plataforma nunca vê dados clínicos.** Código de admin, suporte ou log só lê conta, assinatura, uso e erros, por funções `admin_*` no banco. Sem "entrar como a cliente".
2. **Tudo novo tem `org_id` e RLS**, inclusive integrações, cotas, chaves de API e webhooks.
3. **Segredos no Supabase Vault**, nunca em coluna comum nem no navegador; chave de API só como hash. A chave de serviço só em `/api/jobs/*` e `/api/webhooks/*`.
4. **Provedores atrás de `src/lib/conectores/`**: nada de chamar Meta, Google, Asaas ou Resend direto de uma tela.
5. **Recursos e limites pelo plano**, conferidos no banco com `tem_recurso` e `consumir_cota`; nunca `if plano === ...`.
6. **Saídas externas pela fila** (`jobs`/`eventos`), com novas tentativas.
- O repositório é **público**: nenhum segredo, dado real de paciente ou dado pessoal novo em commit.

## Estrutura
- `src/app/`: rotas do Next.js (App Router). `src/proxy.ts` renova a sessão e redireciona para `/login`.
- `src/lib/supabase/`: clientes `server.ts` (Server Components/Actions), `client.ts` (navegador), `proxy.ts`.
- `src/lib/auth.ts`: `requireUser()` e `getMembership()`; chame em toda página/ação protegida.
- `src/app/(app)/`: telas com cabeçalho e barra de abas; o layout exige consultório cadastrado e aplica a cor escolhida. `src/app/onboarding/` fica fora dele.
- `src/domain/`: regras puras (horários, datas e fuso, agenda, pacientes, pacotes, evolução, indicadores, dinheiro, financeiro, importação do backup, slug, tema, consultório) com testes ao lado. Regra de negócio nova entra aqui.
- `src/components/`: `Sheet` (folha sobre `<dialog>`; feche com `useFecharFolha()`), `TabBar`, `BotaoConfirmar`, formulários de consultório, paciente e atendimento. Estilos em `src/app/globals.css`.
- `src/lib/`: leitura em `consultorio.ts`, `pacientes.ts`, `agenda.ts`, `pacotes.ts`, `evolucao.ts`, `financeiro.ts`; Server Actions nos arquivos `*-actions.ts`. Converta data/hora só com `src/domain/datas.ts`.
- Logo do produto em `public/icons/*.svg`; os PNG saem de `node scripts/gerar-icones.mjs`.
- Evolução e pacote são gravados pelas funções `salvar_evolucao` e `criar_pacote` do banco; o uso dos pacotes vem da visão `pacotes_com_uso`.
- Importação do backup: `src/domain/importacao.ts` valida e a função `importar_backup` grava. Exportação em `src/app/(app)/config/exportar/route.ts`; tabela nova com dados da usuária precisa entrar lá.
- Backup real de paciente nunca entra no repositório; use `tests/fixtures/backup-exemplo.json` (fictício).
- Página pública `src/app/[slug]/` (liberada no proxy por `paginaPublica()`): o visitante só acessa o banco pelas funções `agenda_publica`, `horarios_livres` e `agendar_online`. Toda função nova liberada para `anon` precisa devolver o mínimo e ter teste em `tests/db/agendamento-online.test.ts`. Funções internas sempre com `revoke ... from anon, public`.
- Painel da plataforma em `src/app/admin/`: `(painel)/` exige `requireAdmin()` (`src/lib/admin.ts`: equipe + duas etapas); `verificar/` cadastra e confere o app autenticador. Dados só pelas funções `admin_*` do banco; ações em `src/lib/admin-actions.ts`. Acesso: `npm run admin:conceder -- <e-mail> admin|suporte|remover`.
- Assinatura da profissional: `carregarAssinatura()` e `temRecurso()` em `src/lib/assinatura.ts` (função `minha_assinatura` do banco); regras de situação e avisos em `src/domain/assinatura.ts`.
- No banco: `private.situacao`, `pode_escrever` (somente leitura nas políticas de escrita), `tem_recurso`, `limite_do_recurso` e `consumir_cota`. Recurso novo: cadastrar em `recursos` e nos planos, e conferir dentro da função do banco que o usa.
- Profissão (D-41): `carregarProfissao()` em `src/lib/profissao.ts` junta o modelo (`specialty_profiles`) com os ajustes do consultório; no navegador, `useProfissao()` (`src/components/profissao-context.tsx`). Nenhum texto fixo de fisioterapia nas telas: use `termos` (sessão/consulta, evolução/registro…), `recursos.pacotes`, `tiposAtendimento` e `paciente` (campos extras em `patients.dados_extra`). Regras e validação em `src/domain/profissao.ts`; tipos de campo em `src/domain/evolucao.ts`.
- Modelos têm versão: o admin salva por `admin_salvar_profissao` (gera linha em `specialty_profile_versions`); registros guardam `schema_version` e são exibidos com `carregarVersoesDoRegistro()`. Não renomear chaves de campos em uso.
- `supabase/migrations/`: esquema, RLS e dados de referência. Nunca editar migração já aplicada em produção: criar uma nova.
- `tests/db/`: testes de isolamento (RLS) contra o Supabase local. Para testar o painel, `createPlatformAdmin()` (em `tests/db/helpers.ts`) cria alguém da equipe já com as duas etapas.

## Comandos
- `npm run dev`: app em http://localhost:3000. Se o CSS alterado por script não aparecer, salve `globals.css` de novo (o observador não percebe). Se uma ação do servidor recém-criada falhar com "reading 'apply'", reinicie o `npm run dev` (o processo antigo do Node pode continuar vivo na porta 3000).
- `npm run db:start` / `db:stop` / `db:reset`: Supabase local (precisa do Docker Desktop aberto). E-mails de login caem no Mailpit: http://127.0.0.1:54324
- `npm run check`: lint + typecheck + testes unitários
- `npm run test:db`: testes de RLS (com o Supabase local ligado). Obrigatório antes de fechar sessão que mexa no banco.
- Testes rodam via `scripts/vitest.mjs`, que corrige a letra do drive no Windows (`c:` → `C:`); não chame `npx vitest` direto.
- `npm run demo:contas`: cria (ou reaproveita) uma conta de demonstração por profissão no Supabase local, com paciente, agenda e registros, e imprime links de entrada direta (rota `/auth/confirm`; valem 1 h e servem uma vez). Recusa rodar fora do banco local.
- `npm run db:types`: regenera `src/lib/supabase/database.types.ts`

## Convenções técnicas (ver PLANO.md §3)
- Next.js 16 (App Router), `cacheComponents` desligado (D-07). Middleware agora se chama `proxy`. Consultar `node_modules/next/dist/docs/` antes de usar APIs do Next.
- Supabase com `@supabase/ssr`; sessão validada com `auth.getClaims()`.
- Toda tabela tem `org_id` e Row Level Security; chaves estrangeiras compostas `(org_id, id)` impedem vínculos entre organizações.
- Dinheiro em centavos inteiros. Datas no fuso da organização.
- Prontuário (`clinical_records`) só aceita inclusão: edição = nova versão no mesmo `grupo_id`; anulação única. Pacientes nunca são apagados fisicamente (`deleted_at`).
- Nunca commitar `.env*` (exceto `.env.example`) nem chaves (Supabase, Meta, Asaas).
