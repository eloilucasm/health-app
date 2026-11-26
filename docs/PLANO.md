# Plano: do protótipo "Consultório Alanna Viana" a um SaaS multi-especialidade

## Contexto

Hoje existe um único arquivo, [legacy/index.html](../legacy/index.html) (~776 linhas, HTML + JS puro): um PWA mobile-first, guia de bolso de uma fisioterapeuta, com as abas **Hoje** (KPIs, alertas, gráfico), **Agenda** (dia/semana), **Pacientes** (ficha, WhatsApp, evolução com escala de dor EVA), **Pacotes** (sessões que descontam sozinhas) e **Financeiro** (entradas, saídas, pendências, saldo). Os dados ficam só no `localStorage`, com backup e restauração em JSON.

Limites para virar produto:
- Uma única usuária, com tudo fixo no código: nome, CREFITO, endereço, dias de atendimento `[1,3,5]` (linha 454), condutas de fisioterapia (`RECURSOS`, linha 259).
- Sem servidor: não há login, sincronização entre aparelhos, lembretes automáticos nem agendamento pelo paciente. O risco de perder dados é alto.
- Guarda dados de saúde (sensíveis pela LGPD) sem controle de acesso nem trilha de auditoria.

**Objetivo:** um SaaS replicável para profissionais de saúde autônomas (primeiro fisioterapeutas, depois fonoaudiólogas, psicólogas, nutricionistas, dentistas e médicas). A meta é **colocar um MVP no ar em 10 dias de desenvolvimento intenso**, com a Alanna como parceira de design. A validação com 10 a 30 profissionais pagantes vem nas semanas seguintes. Os diferenciais do MVP são **lembretes por WhatsApp**, **agendamento online** e **prontuário com documentos**. Quem desenvolve é você, com apoio do Claude, numa stack moderna.

---

## 1. Posicionamento do produto

- **Público inicial:** profissional autônoma ou de consultório pequeno que hoje usa caderno, WhatsApp e planilha. O app não disputa com ERPs de clínica grande (iClinic, Feegow, Ninsaúde, Clinicorp). Concorre com "não usar nada" e com apps de nicho (por exemplo, Zenfisio).
- **Proposta:** "seu consultório no bolso": simples, bonito, no celular, que reduz faltas e mostra quanto você ganhou.
- **Princípio de produto:** o celular vem primeiro e cada tarefa diária leva no máximo 3 toques. Isso é o que o protótipo já faz bem e deve ser preservado.

## 2. Como generalizar para várias especialidades

A especialidade vira **configuração**, não código. Cada especialidade tem um "pacote de especialidade" (`specialty_profiles`) com:

| Item | Fisio (hoje) | Exemplos de outras |
|---|---|---|
| Conselho e registro | CREFITO | CRM, CRO, CRFa, CRP, CRN |
| Modelo de evolução | queixa, EVA 0–10, condutas, observações | Fono: objetivos e atividades. Psico: sessão livre. Nutri: peso e IMC |
| Lista de condutas e procedimentos | `RECURSOS` atual | procedimentos odontológicos, testes etc. |
| Modelo de anamnese | — | por especialidade |
| Modelos de documento | atestado, recibo, declaração de comparecimento | receituário (médico, dentista) |
| Pacotes de sessões | sim | psico e fono sim; médico raramente |

- Os formulários de evolução e de anamnese passam a ser **guiados por um esquema JSON** (campos, tipos, escalas). O componente EVA do protótipo vira o tipo de campo `scale`.
- A profissional pode editar a própria lista de condutas e os próprios modelos.
- Recursos complexos de uma só especialidade (odontograma, TISS/convênios, receita digital certificada) ficam **fora do MVP**.

## 3. Arquitetura recomendada

- **Front-end e back-end:** Next.js (App Router) + TypeScript + Tailwind, como PWA instalável. A identidade visual vem das variáveis CSS do protótipo (linhas 18–36: paleta rosé, modo escuro, Quicksand/Figtree), que passam a ser tokens com tema por profissional (cor e logo).
- **Dados e autenticação:** Supabase (Postgres, Auth por e-mail/magic link e Google, Storage para PDFs e anexos, Edge Functions e cron). Hospedado na **região São Paulo (sa-east-1)**.
- **Multi-tenant desde o primeiro dia:** toda tabela tem `org_id`, e o isolamento é garantido por **Row Level Security** no Postgres. O MVP tem uma profissional por organização, mas o modelo `organizations` + `memberships(role)` já comporta clínicas com várias profissionais e recepcionista depois.
- **Deploy:** Vercel para o app e Supabase gerenciado. Observabilidade com Sentry e analytics de produto com PostHog.
- **WhatsApp:** **API oficial da Meta (WhatsApp Cloud API)** com mensagens-modelo aprovadas. APIs não oficiais (Z-API e similares) têm risco de banimento do número. O custo por conversa entra no preço ou como pacote de créditos.
- **Cobrança da assinatura:** **Asaas** (Pix recorrente, boleto e cartão, foco Brasil) ou Stripe (cartão). Recomendação: Asaas.
- **PDF de documentos:** geração no servidor (React-PDF ou HTML→PDF) com o cabeçalho da profissional.

### Modelo de dados (Postgres)

```
organizations(id, nome, slug, specialty_profile_id, conselho, registro, endereco, telefone, logo_url, tema, plano, timezone)
memberships(org_id, user_id, role: owner|profissional|recepcao)
specialty_profiles(id, nome, conselho, evolution_schema jsonb, anamnesis_schema jsonb, procedimentos text[], doc_templates jsonb)
working_hours(org_id, weekday, inicio, fim, duracao_slot, local)   -- substitui o [1,3,5] fixo
patients(id, org_id, nome, telefone, nascimento, cpf?, convenio, diagnostico, medico_encaminhador, obs, consentimento_lgpd_em, deleted_at)
appointments(id, org_id, patient_id?, descricao_avulsa, inicio timestamptz, fim, local: consultorio|domicilio|online, status: agendado|confirmado|realizado|faltou|cancelado, package_id?, origem: manual|online, obs)
clinical_records(id, org_id, patient_id, appointment_id?, tipo: evolucao|anamnese, data, schema_version, conteudo jsonb, assinado_em, autor_id)  -- só aceita inclusão: edição vira nova versão
packages(id, org_id, patient_id, total, usadas_antes, valor, inicio, ativo, obs)
transactions(id, org_id, tipo: entrada|saida, valor_centavos, data, forma, status: recebido|pendente, patient_id?, appointment_id?, package_id?, descricao)
documents(id, org_id, patient_id, tipo, conteudo, pdf_path, emitido_em)
reminders(id, org_id, appointment_id, canal, agendado_para, enviado_em, status, resposta)
booking_settings(org_id, ativo, antecedencia_min, janela_dias, servicos jsonb, mensagem)
audit_log(id, org_id, user_id, acao, entidade, entidade_id, em, ip)
```

Valores ficam em **centavos inteiros** (o protótipo usa float, linha 277).

## 4. O que reaproveitar do protótipo

Porte para TypeScript, em módulos de domínio testáveis:
- Formatação e datas: `brl`, `parseMoney`, `ymd`, `weekStart`, `fmtLong`, `initials`, `evaColor` (linhas 266–282) → `lib/format.ts` e `lib/dates.ts` (com fuso horário da organização).
- Regras de negócio:
  - `packUsage` e `activePack` (342–347) → `domain/packages.ts`
  - `monthStats` e `saldoAte` (349–359) → `domain/finance.ts`
  - `semBaixa` e os alertas da tela Hoje (360, 409–418) → `domain/alerts.ts`
  - KPIs (394–400) → `domain/kpis.ts`
- Componentes de interface: barra de abas, folhas (sheets) que sobem de baixo, pills de status, "spine dots" dos pacotes, escala EVA, gráfico de barras mensal e curva de dor. Todos viram componentes React com o mesmo visual.
- Fluxos que já funcionam bem: salvar a evolução já marca a sessão como realizada (linha 667); um pacote novo se vincula aos agendamentos futuros (linha 692); a exclusão pede confirmação em dois toques.
- **Importador do backup JSON** (formato `app:"alanna-fisio", v:1`, função `snapshot` na linha 289) para migrar os dados reais da Alanna e de outras usuárias do protótipo.

## 5. Roadmap: MVP em 10 dias

> **Substituído a partir do Dia 7** pelas fases semanais da [seção 11](#11-fase-2-plataforma-saas) (decisão D-37 do PRD). Os Dias 1 a 6 foram concluídos como descrito abaixo; a tabela fica como histórico.

O código cabe em 10 dias com o Claude escrevendo a maior parte. **O que não cabe são os prazos externos**, que não dependem de nós e por isso começam no dia 1, em paralelo:
- **WhatsApp Cloud API:** verificação da empresa na Meta, número dedicado e aprovação das mensagens-modelo podem levar de dias a semanas.
- **Asaas:** aprovação da conta (documentos).
- **Jurídico:** revisão dos termos de uso, da política de privacidade e do contrato de tratamento de dados por advogado.

Para não travar, cada um desses itens tem um **plano B que funciona no dia 10** (abaixo).

| Dia | Entrega |
|---|---|
| **1** | Repositório, Supabase (São Paulo), esquema + migrações + **RLS**, login. Abrir os processos da Meta, do Asaas e do jurídico. |
| **2** | Onboarding (nome, especialidade, conselho, horários e cor; logo próprio adiado, D-14 do PRD), layout PWA com os tokens do protótipo, barra de abas e folhas. |
| **3** | Pacientes (lista, busca, ficha) e Agenda (dia/semana/mês, horários vindos de `working_hours`; mês incluído na Sessão 3, D-17 do PRD). |
| **4** | Evolução guiada pelo esquema (EVA como campo `scale`), Pacotes e a tela Hoje (KPIs e alertas). Testes de `domain/`. |
| **5** | Financeiro, **importador do backup JSON** e exportação de dados. **Marco: a Alanna migra para a versão nova.** |
| **6** | **Agendamento online:** página pública `app.com/{slug}` com horários livres, confirmação e consentimento LGPD. |
| **7** (ou 5) | **Lembretes por WhatsApp:** cron 24 h antes + webhook "Confirmar/Remarcar". *Plano B, se a Meta não tiver aprovado:* botão "Enviar lembretes de amanhã" que abre cada conversa no WhatsApp com a mensagem pronta (link `wa.me`), um toque por paciente. |
| **8** | **Prontuário:** anamnese, evolução com versões (sem exclusão), anexos e trilha de auditoria. **Documentos em PDF:** atestado, declaração de comparecimento e recibo. |
| **9** | **Assinatura:** checkout do Asaas + webhook + teste grátis. *Plano B:* link de pagamento Pix manual e liberação pelo painel. Landing page, termos de uso e política de privacidade a partir de modelos, marcados como "em revisão jurídica". |
| **10** | Testes de fim a fim e de RLS, correções, deploy de produção e entrada das primeiras 3 a 5 profissionais beta. |

**WhatsApp com data flexível (dia 5 ou 7):** se a Meta aprovar o número e as mensagens-modelo até o fim do dia 4, o WhatsApp sobe para o **dia 5**. Nesse caso:
- Financeiro e importador vão para o dia 6, e a Alanna migra no dia 6.
- Agendamento online vai para o dia 7.
- A confirmação do agendamento online já sai pelo WhatsApp automático.

Se a aprovação não chegar até o dia 4, fica a ordem da tabela: WhatsApp no dia 7, com o plano B se ainda faltar a aprovação. Os dias 8 a 10 não mudam.

**O que sai do MVP de 10 dias** (vai para as semanas seguintes):
- perfis de especialidade completos além de fisioterapia (fono e psico só como esboço);
- relatório de evolução em PDF;
- tela de métricas de faltas;
- autenticação em dois fatores;
- bloqueio automático por inadimplência.

**Condições para dar certo:**
- Dedicação de tempo integral nos 10 dias.
- Escopo congelado: ideia nova vai para o backlog.
- A Alanna disponível para testar no dia 5 e no dia 10.

**Semanas 3 a 6 depois do lançamento:** ativar o WhatsApp automático assim que a Meta aprovar, concluir a revisão jurídica, completar os perfis de fono e psico e ir de 5 betas a 10–30 pagantes.

**Depois do MVP (backlog priorizado)**
1. Clínicas com várias profissionais e recepção (o modelo já suporta).
2. Lembrete de pacote acabando e de pendência financeira enviado ao paciente.
3. Emissão de NFS-e (integração com Asaas ou eNotas).
4. Receita digital com certificado ICP-Brasil (médicos e dentistas, por exemplo via Memed).
5. Odontograma e orçamentos para dentistas.
6. Convênios e TISS. Teleconsulta.

## 6. LGPD e conformidade (não opcional, já que são dados de saúde)

- A profissional é a **controladora** e o SaaS é o **operador**: isso vai em contrato (DPA) e nos termos.
- Dados no Brasil, criptografia em trânsito e em repouso, RLS testada automaticamente, `audit_log` de acessos a prontuários, autenticação em dois fatores opcional.
- Prontuário **não pode ser apagado** (só exclusão lógica). Os prazos de guarda vêm das resoluções de cada conselho (ex.: CFM 1.821/2007, de 20 anos; COFFITO para fisioterapia). **Validar com um advogado especialista** antes do lançamento.
- Registro do consentimento do paciente no agendamento online, além de exportação e portabilidade dos dados da profissional.

## 7. Negócio (hipóteses a validar)

- **Preço:** plano solo entre R$ 59 e R$ 89/mês, com um pacote de WhatsApp incluso (ex.: 300 lembretes) e excedente cobrado à parte. Desconto anual.
- **Canais:** a Alanna como caso de sucesso e porta de indicação. Comunidades de fisioterapia no Instagram, conselhos regionais e faculdades. Programa de indicação (um mês grátis).
- **Métricas:** ativação (primeiro agendamento + primeira evolução em 48 h), sessões registradas por semana, taxa de faltas antes e depois, conversão do teste para pago e churn mensal.

## 8. Estrutura de pastas (ajustada na Sessão 1, decisão D-08 do PRD)

```
src/app/                  Next.js (login, auth, (app)/hoje|agenda|pacientes|pacotes|financeiro, [slug] = página pública)
src/domain/               regras portadas do protótipo + testes (packages, finance, alerts, kpis, availability)
src/components/           tokens e componentes (Sheet, TabBar, Pill, Spine, EvaScale, Charts)
src/lib/supabase/         clientes do Supabase (servidor, navegador, proxy)
tests/db/                 testes de isolamento (RLS) contra o Supabase local
supabase/migrations/      esquema + RLS
supabase/functions/       send-reminders (cron), whatsapp-webhook, asaas-webhook, generate-pdf
legacy/index.html         protótipo original preservado como referência
```

## 9. Verificação

- **Testes unitários** (Vitest) de `domain/`: uso de pacotes, saldo mensal e acumulado, KPIs, alertas e cálculo de horários livres, com casos tirados do comportamento atual do protótipo.
- **Testes de RLS:** um usuário da org A não consegue ler nem escrever dados da org B (testes SQL ou de integração no CI).
- **Fim a fim** (Playwright, já disponível via MCP) em tamanho de celular: onboarding → cadastrar paciente → agendar → registrar evolução → conferir o pacote descontado e o KPI → lançar recebimento → gerar PDF.
- **Importação:** importar um backup JSON real da Alanna e conferir as contagens (pacientes, atendimentos, evoluções, pacotes, lançamentos) e os saldos contra o protótipo.
- **WhatsApp:** número de teste da Cloud API. Simular o webhook de "Confirmar" e checar a mudança de status.
- **Piloto:** duas semanas da Alanna usando só a versão nova antes de abrir para outras profissionais.

## 10. Próximos passos imediatos (após a aprovação)

1. Criar um **doc compartilhável** (Claude Docs) com a visão de produto, o roadmap e o modelo de negócio, para a Alanna, possíveis sócias e outras pessoas interessadas.
2. Dia 1: inicializar o git, mover o protótipo para `legacy/`, criar o monorepo e o projeto Supabase (região São Paulo), e escrever esquema, RLS e login.
3. No mesmo dia 1, você abre a verificação na Meta (WhatsApp Business), a conta no Asaas e o contato com o advogado. Essa parte depende de você, não do código.

## 11. Fase 2: plataforma SaaS

Aprovada em 2026-11-26 (Sessão 7). O núcleo do consultório (Dias 1 a 6) está pronto; esta fase transforma o app em produto para muitas profissionais: painel administrativo, assinaturas, conectores e API, e WhatsApp com o número de cada profissional. Decisões do Lucas: WhatsApp com número próprio desde já, painel administrativo completo, conectores prioritários (e-mail, Google Agenda, API e webhooks) e prazo em fases semanais.

### 11.1 Princípios da plataforma

Valem para tudo que vem a seguir. Cada um vira decisão no PRD.

1. **A plataforma nunca vê dados clínicos.** O painel administrativo, o suporte e os logs só enxergam conta, assinatura, uso e erros. Pacientes, agenda e prontuário ficam fora, garantido no banco e não só na tela. A plataforma é operadora (LGPD) e só acessa o que precisa.
2. **Isolamento por consultório continua sendo a base.** Tudo que é novo (integrações, cotas, chaves de API, webhooks) tem `org_id` e RLS. Cada profissional tem o próprio número de WhatsApp, a própria conexão com o Google e as próprias chaves de API, então o problema de uma não atinge as outras.
3. **Segredos fora das tabelas.** Tokens da Meta e do Google, segredos de webhook e chaves de API ficam no **Supabase Vault**, criptografados. Chave de API é guardada só como hash. Nenhum segredo vai para o navegador.
4. **Provedores trocáveis.** WhatsApp, e-mail, cobrança e agenda são acessados por uma interface única no código (`src/lib/conectores/`). Trocar de provedor, ou cair para um intermediário oficial (BSP), não exige reescrever o produto.
5. **Recursos e limites vêm do plano.** Nenhuma tela ou função testa "se o plano é X". Elas consultam `tem_recurso(org, recurso)` e `consumir_cota(org, métrica)`, e o painel administrativo controla os planos.
6. **Tudo que sai do sistema passa por uma fila.** Lembretes, sincronização com o Google e webhooks são gravados numa fila e enviados por um processador, com novas tentativas e registro de entrega. Uma falha externa nunca derruba a ação da profissional.

### 11.2 Arquitetura

#### 11.2.1 Painel administrativo (`/admin`)

**Acesso**
- Tabela `platform_admins` (`user_id`, `papel`: `admin` | `suporte`).
- Rota `/admin` fora do layout do consultório. O proxy e o layout exigem admin e **login em duas etapas** (TOTP do Supabase, nível `aal2`).
- O admin **não ganha permissão nas tabelas dos consultórios.** Ele só lê por funções `admin_*` (security definer) que conferem `private.is_platform_admin()` + `aal2` e devolvem apenas campos de conta, assinatura e uso.
- Toda ação vai para `admin_audit_log`: quem, o quê, em qual consultório e quando.
- Sem "entrar como a cliente" (impersonação), porque isso daria acesso a dados clínicos.

**Telas**
| Tela | O que mostra e faz |
|---|---|
| Clientes | Lista com busca e filtros (situação, plano, especialidade); detalhe com e-mail da dona, plano, situação, datas, uso do mês, status das integrações e últimos erros; ações de estender teste, trocar plano, suspender e reativar, todas registradas |
| Assinaturas | Faturas, pagamentos e eventos do provedor por cliente; inadimplentes |
| Métricas | Receita recorrente mensal (MRR), novos cadastros, ativação (consultório + primeiro atendimento + primeira evolução em 48 h), conversão do teste, cancelamentos e uso (atendimentos, mensagens, agendamentos online). Tudo agregado por funções que só devolvem números |
| Planos e recursos | Cadastro de planos (preço, intervalo), recursos e limites por plano, e exceções por cliente |
| Suporte | Erros de integração, falhas de entrega de e-mail, WhatsApp e webhooks, sem conteúdo das mensagens |

#### 11.2.2 Planos, assinaturas e limites

**Modelo de dados** (nova migração; substitui `organizations.plano` e `trial_ate`, migrando os dados):
```
plans(id, nome, preco_centavos, intervalo: mensal|anual, ativo, ordem)
plan_features(plan_id, recurso, habilitado, limite)      -- ex.: whatsapp_lembretes 300/mês, api true
org_feature_overrides(org_id, recurso, habilitado, limite, motivo, criado_por)
subscriptions(org_id, plan_id, status: trial|active|past_due|canceled|suspended,
              trial_ate, periodo_ate, provedor, provedor_cliente_id, provedor_assinatura_id)
billing_events(id, provedor, evento_id único, tipo, payload, processado_em)   -- idempotência
invoices(org_id, valor_centavos, vencimento, status, link_pagamento, provedor_id)
usage_counters(org_id, metrica, periodo 'AAAA-MM', quantidade)
```

**Regras**
- `private.tem_recurso(org, recurso)` e `private.consumir_cota(org, metrica)` são usadas dentro das funções do banco (agendar online, enviar WhatsApp, criar chave de API), não só na tela.
- **Inadimplência:**
  1. 7 dias de tolerância.
  2. Depois, **modo somente leitura**: a profissional vê tudo, exporta os dados e paga, mas não grava. É uma função `private.pode_escrever(org)` incluída em todas as políticas de inserção e alteração.
  3. Cancelada ou suspensa: só leitura e exportação, por prazo definido nos termos.
- **Cobrança via Asaas:**
  - assinatura recorrente com Pix, boleto e cartão;
  - checkout com link de pagamento;
  - webhook `/api/webhooks/asaas` com token de autenticação, gravação em `billing_events` antes de processar e reprocessamento seguro.
- **Tela "Assinatura" nos Ajustes da profissional:** plano atual, situação, próximas cobranças, faturas, trocar plano e atualizar pagamento.

#### 11.2.3 Base de conectores

```
integrations(org_id, provedor: whatsapp|google_calendar|..., status: conectado|erro|desconectado,
             config jsonb (sem segredos), segredo_id → vault, conectado_em, ultimo_erro, ultimo_erro_em)
jobs(id, org_id, tipo, payload, executar_em, tentativas, status, erro)        -- fila
eventos(id, org_id, tipo: atendimento.criado|alterado|cancelado|..., entidade_id, criado_em)  -- outbox
```

- Gatilhos nas tabelas de agenda gravam em `eventos`. Um processador transforma cada evento em jobs: sincronizar com o Google, entregar webhook, agendar lembrete.
- **Processador da fila:** uma rota protegida `/api/jobs/processar`, chamada a cada minuto pelo `pg_cron` do Supabase (via `pg_net`) ou pelo Cron da Vercel.
  - Tentativas com espera crescente, até 8.
  - Trava por job (`for update skip locked`).
  - Usa a chave de serviço **só nesta rota e nos webhooks**, nunca em páginas.
- Segredos lidos do Vault por funções `private.*` executadas apenas pela chave de serviço.

#### 11.2.4 Conectores prioritários

**E-mail transacional** (nível plataforma, não por consultório)
- Provedor: Resend, ou outro com SMTP.
- Usado no login do Supabase (SMTP próprio, para os links chegarem a qualquer pessoa) e nos e-mails do app.
- Modelos em português: link de acesso, boas-vindas, teste acabando, cobrança, pagamento recebido e falha de integração.
- Domínio próprio com SPF, DKIM e DMARC.

**Google Agenda** (por profissional)
- Conexão OAuth com o escopo `calendar.events` e token de atualização guardado no Vault.
- Sincronização **de mão única** (app → Google): criar, alterar e cancelar eventos numa agenda "Consultório no Bolso". Ler a agenda do Google para bloquear horários fica para depois.
- **Privacidade:** por padrão o evento leva só "Atendimento" e o horário. Incluir o nome do paciente é uma opção que a profissional liga sabendo que o dado vai para o Google.
- O escopo é considerado sensível pelo Google. Até 100 usuárias de teste funciona sem verificação; para abrir a todas é preciso a verificação do app, que leva semanas e deve ser pedida cedo.

**API própria e webhooks**
- `/api/v1` (REST + JSON) com **chaves por consultório**:
  - criadas e revogadas nos Ajustes;
  - exibidas uma única vez e guardadas como hash;
  - com escopos `leitura` e `escrita`.
- Recursos da v1: horários livres, atendimentos (ler, criar, alterar status) e pacientes (só nome e contato). **Prontuário fora da API v1.**
- Limite de requisições por chave, paginação por cursor, versão no caminho, documentação OpenAPI em `/api/v1/docs`.
- Webhooks: a profissional cadastra a URL e escolhe os eventos.
  - Entrega pela fila, com assinatura **HMAC-SHA256** no cabeçalho, carimbo de tempo, até 8 tentativas e registro de entregas visível a ela.
  - Disponível só nos planos com o recurso `api`.

#### 11.2.5 WhatsApp com o número de cada profissional

**Caminho escolhido: Meta WhatsApp Cloud API com Embedded Signup, sendo a plataforma Tech Provider da Meta.**
- Cada profissional conecta o próprio número por um fluxo da Meta dentro dos Ajustes, sem sair do app.
- O número pode ser o que ela já usa no WhatsApp Business, com a coexistência entre o app do celular e a API, se o número for elegível. Também pode ser um número novo.

**Pré-requisitos externos** (começam na Fase 0; são o caminho crítico):
- verificação da empresa no Meta Business Manager;
- app da Meta com o produto WhatsApp;
- inscrição como **Tech Provider**;
- **App Review** das permissões `whatsapp_business_management` e `whatsapp_business_messaging`;
- configuração do Embedded Signup.
- **Plano B, se a Meta demorar:** o mesmo fluxo por um BSP parceiro (360dialog ou Twilio), com o provedor trocável (princípio 4).

**Quem paga as mensagens:** a cobrança da Meta vai para a conta WhatsApp Business **da própria profissional** (a Meta cobra por mensagem-modelo). A plataforma não intermedeia esse custo; os planos só limitam a quantidade de lembretes por mês. Pergunta em aberto P-1: oferecer créditos inclusos no futuro?

**Como funciona**
1. **Conectar:** o Embedded Signup devolve `waba_id`, `phone_number_id` e o token. Eles vão para `integrations` e para o Vault. O app então inscreve a WABA nos webhooks da plataforma.
2. **Mensagens-modelo:** a plataforma cria, via API, as mensagens na WABA de cada profissional, a partir de um catálogo nosso em pt_BR, categoria utilidade:
   - `lembrete_consulta`, com os botões Confirmar e Remarcar;
   - `agendamento_recebido`;
   - `agendamento_confirmado`.
   O status de aprovação de cada uma fica salvo.
3. **Consentimento:** o paciente precisa ter aceitado receber mensagens, exigência da Meta e da LGPD.
   - Novo campo `patients.whatsapp_optin_em`, com a origem do aceite.
   - O consentimento do agendamento online passa para a versão "v2" e inclui os lembretes.
   - Pacientes antigos: a profissional marca o aceite na ficha.
4. **Lembretes:** um job de hora em hora cria `reminders` para atendimentos de amanhã (agendados ou confirmados, com telefone e consentimento) e envia pelo provedor.
   - Cada envio consome a cota `whatsapp_lembretes`.
   - Antecedência configurável, 24 h por padrão.
5. **Webhook** `/api/webhooks/whatsapp`, um só para a plataforma:
   - confere a assinatura `X-Hub-Signature-256` com o segredo do app;
   - identifica o consultório pelo `phone_number_id`.
   - Botão **Confirmar** → atendimento `confirmado`.
   - **Remarcar** → aviso para a profissional.
   - Status de entrega → `reminders`.
   - Mensagem livre → só registrada como "nova mensagem", sem guardar o texto.
6. **Aviso de pedido online** (pendência do Dia 6): a mensagem `agendamento_recebido` vai para o paciente, e um aviso vai para a profissional.
7. **Sem número conectado:** o botão "Enviar lembretes de amanhã", que abre a conversa no WhatsApp da profissional (RF-15), continua disponível. Ele não exige nada e serve a quem não quer pagar a Meta.

Sem API não oficial em nenhuma hipótese (D-04).

### 11.3 Roadmap em fases semanais

**Ordem de execução (D-38): F1 → F2 → F0 → F3 → F4 → F5 → F6 → F7.** A publicação (F0) acontece depois do painel administrativo e da cobrança, para o app já entrar no ar como plataforma. Os nomes das fases não mudam, para não renumerar os requisitos.

**Já, em paralelo** (não depende de publicar, e é o caminho crítico): verificação da empresa na Meta e inscrição como Tech Provider, pedido de verificação do app no Google, conta no Asaas (sandbox para a F2), domínio e advogado. A Meta e o Google costumam pedir um site no domínio com política de privacidade; uma página simples basta.

| Fase | Duração | Entrega | Modelo |
|---|---|---|---|
| **1. Fundação da plataforma** | 1 semana | `platform_admins` + duas etapas; planos, recursos, cotas e exceções; `subscriptions` com migração dos dados atuais; modo somente leitura; admin: Clientes e Planos e recursos | Opus |
| **2. Assinaturas e cobrança** | 1 semana | Asaas: assinatura, checkout, webhook idempotente, faturas, inadimplência; tela Assinatura da profissional; admin: Assinaturas e Métricas; termos de uso e privacidade. Testada no sandbox do Asaas, com túnel local para os webhooks | Opus |
| **0. Publicar** | 2 a 3 dias | Supabase de produção (São Paulo), Vercel (região `gru1`), Resend com SMTP no Supabase e e-mails em português, domínio. **Publicação já com painel administrativo e cobrança: a Alanna migra e entram as primeiras betas → `v0.1.0`.** Revisão do prontuário com o Opus | Opus |
| **3. Prontuário e documentos** | 1 semana | Itens originais do Dia 8 (RF-16 a RF-18): anamnese, anexos, auditoria de acesso, PDFs | Opus no banco, Sonnet nas telas |
| **4. Conectores** | 1 semana | Base (`integrations`, Vault, fila, outbox); e-mails transacionais; Google Agenda; admin: Suporte → `v0.2.0` | Opus |
| **5. WhatsApp com número próprio** | 1 a 2 semanas (depende da Meta) | Embedded Signup, mensagens-modelo, consentimento, lembretes, webhook, avisos de pedido online, botão de link para quem não conectou → `v0.3.0` | Opus |
| **6. API e webhooks** | 1 semana | `/api/v1`, chaves, escopos, limite de requisições, OpenAPI, webhooks assinados com registro de entrega | Opus |
| **7. Lançamento** | contínuo | Testes de fim a fim, revisão de segurança, abertura geral → `v1.0.0` | Opus |

**Por que nessa ordem**
- Admin e cobrança antes de publicar (D-38): a plataforma entra no ar já controlando clientes e assinaturas. O custo é a Alanna migrar mais tarde.
- Planos e assinaturas antes dos conectores: os conectores dependem de recursos e cotas.
- WhatsApp depois da base de conectores: ele usa a fila, o Vault e as cotas.
- A Fase 5 também depende da Meta. Se a aprovação atrasar, as Fases 4 e 6 sobem na frente.

### 11.4 Documentação (primeiro passo depois da aprovação)

- **PLANO.md:** nova seção "Fase 2: plataforma", com este conteúdo. O roadmap de 10 dias fica como histórico, marcado como substituído a partir do Dia 7.
- **PRD:**
  - novos requisitos RF-21 a RF-40 (admin, assinaturas, conectores, API, WhatsApp);
  - RF-14 reescrito para "número próprio via Embedded Signup";
  - RF-19 absorvido pela Fase 2;
  - decisões D-27 em diante (os seis princípios, Tech Provider, quem paga a Meta, privacidade no Google, prontuário fora da API);
  - perguntas em aberto P-1 (créditos de WhatsApp), P-2 (preço dos planos) e P-3 (prazo de guarda após cancelamento).
- **CHANGELOG:** entrada "Replanejamento" na Sessão 7.
- **CLAUDE.md:** os seis princípios como regras obrigatórias.

### 11.5 Riscos

| Risco | Efeito | Resposta |
|---|---|---|
| App Review da Meta demorar ou ser negado | Fase 5 atrasa | Pedir na Fase 0; BSP como plano B; botão de link continua |
| Verificação do Google (escopo sensível) | Agenda limitada a 100 usuárias | Pedir na Fase 0; funciona em teste até lá |
| Dados de pacientes indo para Meta e Google (transferência internacional) | Exigência da LGPD | Consentimento explícito, mínimo de dados (sem nome no Google por padrão), cláusulas nos termos e no contrato de dados; validar com o advogado |
| Escopo cresce de novo | Lançamento nunca chega | Cada fase fecha com versão e changelog; ideia nova vai para o PRD |

### 11.6 Verificação (para cada fase)

- **Testes de banco** (`tests/db/`):
  - admin não lê pacientes, agenda nem prontuário, nem com `aal1`;
  - cliente não vê dados de outra;
  - modo somente leitura bloqueia gravação e permite exportar;
  - cotas e recursos são respeitados dentro das funções;
  - webhooks de cobrança são idempotentes;
  - chaves de API respeitam os escopos e o consultório.
- **Testes de regras** (`src/domain/`): assinatura HMAC dos webhooks, conferência de `X-Hub-Signature-256`, cálculo de MRR, ativação, cancelamentos e cotas, montagem das mensagens-modelo.
- **Ambientes de teste dos provedores:** sandbox do Asaas (assinatura, pagamento, atraso e cancelamento), número de teste da Meta (envio, botão Confirmar, status de entrega), Google OAuth com usuária de teste, e Resend em modo de teste.
- **Navegador** (Playwright, celular): admin com duas etapas, conexão do WhatsApp e do Google, fluxo de assinatura.
- Fechamento de cada sessão pelo guia: changelog, PRD, commit e envio. Lembrete: o repositório é público, então nenhum segredo nem dado real entra em commit.
