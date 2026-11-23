# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui, uma entrada por sessão de trabalho.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/). Enquanto a versão começar por `0.`, o produto está em desenvolvimento e qualquer coisa pode mudar. Como registrar uma sessão: [docs/GUIA-DE-SESSAO.md](docs/GUIA-DE-SESSAO.md).

## [Não lançado]

### Sessão 1 · 2026-11-23 · Dia 1: base, banco com RLS e login

**Adicionado**
- Login sem senha por link mágico no e-mail. O primeiro acesso cria a conta. Quem não está logado é levado ao login e, depois de entrar, volta para a página que tentou abrir (RF-01)
- Botão "Entrar com Google" pronto no código, desligado até existirem as credenciais (RF-01)
- Página inicial provisória que mostra quem está logado e se o consultório já foi configurado, com botão Sair
- Banco de dados com todas as tabelas do plano: consultórios, vínculos, horários, pacientes, agenda, pacotes, prontuário, financeiro, documentos, lembretes, agendamento online e auditoria
- Cada profissional só enxerga e altera os dados do próprio consultório, garantido no banco (RNF-01, D-10)
- Prontuário que não pode ser editado nem apagado: correção vira nova versão e anulação acontece uma única vez. Pacientes e documentos também não podem ser apagados fisicamente (RNF-05, D-11)
- Perfis de especialidade: fisioterapia completa (formulário de evolução e condutas do protótipo), fonoaudiologia e psicologia em esboço (D-03)
- Criação do consultório e do vínculo de dona numa única operação, pronta para o onboarding do Dia 2 (RF-02)
- 17 testes automáticos de segurança (`npm run test:db`)

**Alterado**
- Protótipo original movido para `legacy/index.html`
- Estrutura do projeto: app único na raiz em vez de monorepo (D-08). Plano atualizado
- Decisões técnicas registradas no PRD: D-07 a D-11

**Pendências**
- Login com Google: falta criar as credenciais no Google Cloud
- E-mail do link de acesso ainda sai com o texto padrão do Supabase, em inglês
- Projeto Supabase de produção e conta na Vercel ainda não criados
- Processos externos do Dia 1, por conta do Lucas: verificação na Meta (WhatsApp), conta no Asaas e contato com advogado

**Verificação:** lint, typecheck e build de produção passam. Os 17 testes de RLS passam no Supabase local, e o `supabase db lint` não acusa erros. Login testado no navegador em tamanho de celular: pedido do link, entrada, retorno à página pedida, saída e recusa de link reutilizado.

**Próxima sessão:** Dia 2. Onboarding (nome, especialidade, conselho, horários, logo e cor), layout PWA com os tokens do protótipo, barra de abas e folhas (RF-02, RF-03, RF-04).

## [0.0.0] - 2026-11-22

### Sessão 0 · 2026-11-22 · Planejamento

**Adicionado**
- Plano de transformação do protótipo em SaaS multi-especialidade, com MVP em 10 dias ([docs/PLANO.md](docs/PLANO.md))
- PRD com requisitos RF-01 a RF-20, requisitos não funcionais e registro de decisões D-01 a D-06 ([docs/PRD.md](docs/PRD.md))
- Guia de documentação por sessão ([docs/GUIA-DE-SESSAO.md](docs/GUIA-DE-SESSAO.md)) e este changelog
- `CLAUDE.md` com as regras do projeto para as próximas sessões
- Documento compartilhável para a Alanna e possíveis sócias: [Consultório no Bolso: plano do SaaS](https://claude.ai/artifact/7kY4RPEpemobz8qmSqpqxw)
- Protótipo original (`index.html`) versionado como ponto de partida

**Próxima sessão:** Dia 1 do plano. Repositório Next.js + Supabase, esquema, RLS e login (RF-01). Em paralelo, abrir a verificação na Meta, a conta no Asaas e o contato com o advogado.
