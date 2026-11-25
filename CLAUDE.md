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

## Estrutura
- `src/app/`: rotas do Next.js (App Router). `src/proxy.ts` renova a sessão e redireciona para `/login`.
- `src/lib/supabase/`: clientes `server.ts` (Server Components/Actions), `client.ts` (navegador), `proxy.ts`.
- `src/lib/auth.ts`: `requireUser()` e `getMembership()`; chame em toda página/ação protegida.
- `src/app/(app)/`: telas com cabeçalho e barra de abas; o layout exige consultório cadastrado e aplica a cor escolhida. `src/app/onboarding/` fica fora dele.
- `src/domain/`: regras puras (horários, datas e fuso, agenda, pacientes, slug, tema, consultório) com testes ao lado. Regra de negócio nova entra aqui.
- `src/components/`: `Sheet` (folha sobre `<dialog>`; feche com `useFecharFolha()`), `TabBar`, `BotaoConfirmar`, formulários de consultório, paciente e atendimento. Estilos em `src/app/globals.css`.
- `src/lib/`: leitura em `consultorio.ts`, `pacientes.ts`, `agenda.ts`; Server Actions nos arquivos `*-actions.ts`. Converta data/hora só com `src/domain/datas.ts`.
- Logo do produto em `public/icons/*.svg`; os PNG saem de `node scripts/gerar-icones.mjs`.
- `supabase/migrations/`: esquema, RLS e dados de referência. Nunca editar migração já aplicada em produção: criar uma nova.
- `tests/db/`: testes de isolamento (RLS) contra o Supabase local.

## Comandos
- `npm run dev`: app em http://localhost:3000. Se o CSS alterado por script não aparecer, salve `globals.css` de novo (o observador não percebe).
- `npm run db:start` / `db:stop` / `db:reset`: Supabase local (precisa do Docker Desktop aberto). E-mails de login caem no Mailpit: http://127.0.0.1:54324
- `npm run check`: lint + typecheck + testes unitários
- `npm run test:db`: testes de RLS (com o Supabase local ligado). Obrigatório antes de fechar sessão que mexa no banco.
- Testes rodam via `scripts/vitest.mjs`, que corrige a letra do drive no Windows (`c:` → `C:`); não chame `npx vitest` direto.
- `npm run db:types`: regenera `src/lib/supabase/database.types.ts`

## Convenções técnicas (ver PLANO.md §3)
- Next.js 16 (App Router), `cacheComponents` desligado (D-07). Middleware agora se chama `proxy`. Consultar `node_modules/next/dist/docs/` antes de usar APIs do Next.
- Supabase com `@supabase/ssr`; sessão validada com `auth.getClaims()`.
- Toda tabela tem `org_id` e Row Level Security; chaves estrangeiras compostas `(org_id, id)` impedem vínculos entre organizações.
- Dinheiro em centavos inteiros. Datas no fuso da organização.
- Prontuário (`clinical_records`) só aceita inclusão: edição = nova versão no mesmo `grupo_id`; anulação única. Pacientes nunca são apagados fisicamente (`deleted_at`).
- Nunca commitar `.env*` (exceto `.env.example`) nem chaves (Supabase, Meta, Asaas).
