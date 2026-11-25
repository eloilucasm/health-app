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
