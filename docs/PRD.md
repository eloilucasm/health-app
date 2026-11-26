# PRD: Consultório no Bolso

| | |
|---|---|
| **Versão do PRD** | 2.0 |
| **Última atualização** | 2026-11-26 (Sessão 7) |
| **Status do produto** | Núcleo do consultório pronto no ambiente local (Dias 1 a 6). Replanejado como plataforma SaaS, na ordem F1 → F2 → F3 → F4 → F6 → F0 → F5; próxima: F1, fundação da plataforma |
| **Plano de execução** | [PLANO.md](PLANO.md) |
| **Histórico de mudanças** | [CHANGELOG.md](../CHANGELOG.md) |

Este documento diz **o que** o produto faz e **por quê**. O **como** e o **quando** estão no [PLANO.md](PLANO.md). Ele é atualizado ao fim de cada sessão de trabalho, conforme o [GUIA-DE-SESSAO.md](GUIA-DE-SESSAO.md).

---

## 1. Problema

Profissionais de saúde autônomas organizam agenda, prontuário e dinheiro em caderno, WhatsApp e planilha. O resultado:
- pacientes faltam sem avisar;
- sessões de pacote são esquecidas ou cobradas errado;
- ninguém sabe quanto entrou no mês.

O protótipo ([legacy/index.html](../legacy/index.html)) resolve isso para uma fisioterapeuta (Alanna Viana), mas serve só a ela. Os dados ficam presos em um aparelho, sem login, sem lembretes automáticos e sem agendamento pelo paciente.

## 2. Visão

"Seu consultório no bolso": um app de assinatura, feito para o celular, que qualquer profissional de saúde autônoma configura em minutos. Ele reduz faltas e mostra quanto ela ganhou.

## 3. Público e personas

| Persona | Quem é | O que precisa |
|---|---|---|
| **Profissional autônoma** (usuária principal) | Fisioterapeuta, fono, psicóloga, nutricionista, dentista ou médica que atende sozinha, em consultório próprio, sublocado ou em domicílio | Ver o dia, registrar a sessão rápido, controlar pacotes e receber |
| **Paciente** (usuário secundário) | Quem é atendido | Marcar horário sem trocar mensagens e receber lembrete |
| **Alanna** (parceira de design) | Fisioterapeuta, primeira usuária | Migrar os dados do protótipo sem perder nada |

**Fora do público do MVP:** clínicas grandes com recepção, vários profissionais e convênios (atendidas por ERPs como iClinic e Feegow).

## 4. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta |
|---|---|---|
| Lançar o MVP | Beta no ar com profissionais reais | Dia 10 do plano, com 3 a 5 betas |
| Ativação | Primeiro agendamento + primeira evolução em até 48 h do cadastro | ≥ 70% das novas contas |
| Uso recorrente | Sessões registradas por profissional por semana | ≥ 10 |
| Reduzir faltas | Taxa de faltas antes vs. depois dos lembretes | Queda de 30% |
| Receita | Profissionais pagantes | 10 a 30 nas semanas 3 a 6 após o lançamento |
| Retenção | Cancelamentos por mês | < 5% |

## 5. Requisitos funcionais (MVP)

Status: `planejado` · `em andamento` · `pronto` · `adiado`. A coluna **Dia/Fase** segue o [PLANO.md](PLANO.md): números são dias do roadmap original (concluídos até o Dia 6); **F0 a F7** são as fases semanais da plataforma (PLANO §11).

### 5.1 Conta e configuração
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-01 | Cadastro e login por e-mail (link mágico) e Google. E-mail: pronto e testado. Google: código pronto, aguarda credenciais do Google Cloud | 1 | em andamento |
| RF-02 | Onboarding: nome, especialidade, conselho e registro, endereço, telefone e cor (logo próprio adiado, D-14) | 2 | pronto |
| RF-03 | Horários de atendimento configuráveis por dia da semana (substitui os dias fixos do protótipo) | 2 | pronto |
| RF-04 | App instalável no celular (PWA) com tema claro e escuro. Falta testar a instalação em um celular, o que exige o app publicado | 2 | em andamento |

### 5.2 Rotina do consultório (paridade com o protótipo)
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-05 | Pacientes: cadastro, busca por nome, convênio ou diagnóstico, ficha com histórico, botão WhatsApp | 3 | pronto |
| RF-06 | Agenda por dia, semana e mês; status agendado, confirmado, realizado, faltou e cancelado; local consultório, domicílio ou online | 3 | pronto |
| RF-07 | Evolução da sessão por formulário da especialidade (fisio: queixa, EVA 0–10, condutas, observações); salvar já marca a sessão como realizada | 4 | pronto |
| RF-08 | Pacotes de sessões que descontam sozinhos ao marcar "realizado"; aviso quando restam 2 ou menos | 4 | pronto |
| RF-09 | Tela Hoje: atendimentos do dia, indicadores do mês e alertas (sem baixa, pacote acabando, pendências) | 4 | pronto |
| RF-10 | Financeiro: entradas, saídas, pendências, saldo do mês e acumulado, gráfico mensal | 5 | pronto |
| RF-11 | Importar o backup JSON do protótipo (`app: "alanna-fisio", v: 1`) | 5 | pronto |
| RF-12 | Exportar todos os dados da profissional (portabilidade, LGPD) | 5 | pronto |

### 5.3 Diferenciais
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-13 | Página pública de agendamento online (`/{slug}`) com horários livres, consentimento LGPD e confirmação | 6 | pronto |
| RF-14 | Lembrete por WhatsApp enviado do número da própria profissional (API oficial), 24 h antes, com botões Confirmar e Remarcar que atualizam o status (ver RF-34 a RF-37, D-32) | F5 | planejado |
$1 F5 | planejado |
$1 F3 | planejado |
$1 F3 | planejado |
$1 F3 | planejado |

### 5.4 Negócio
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-19 | Assinatura com teste grátis de 14 dias via Asaas (absorvido por RF-28 a RF-30) | F2 | planejado |
$1 F2 | planejado |

### 5.5 Painel administrativo da plataforma
| ID | Requisito | Fase | Status |
|---|---|---|---|
| RF-21 | Acesso administrativo com papéis (admin, suporte) e login em duas etapas obrigatório; toda ação registrada em auditoria | F1 | planejado |
| RF-22 | Clientes: lista com busca e filtros, detalhe sem dados clínicos, ações de estender teste, trocar plano, suspender e reativar | F1 | planejado |
| RF-23 | Planos, recursos, limites e exceções por cliente | F1 | planejado |
| RF-24 | Assinaturas: faturas, pagamentos, eventos do provedor e inadimplentes | F2 | planejado |
| RF-25 | Métricas: receita recorrente (MRR), cadastros, ativação, conversão do teste, cancelamentos e uso | F2 | planejado |
| RF-26 | Suporte: erros de integração e falhas de entrega de e-mail, WhatsApp e webhooks, sem o conteúdo das mensagens | F4 | planejado |

### 5.6 Assinaturas e limites
| ID | Requisito | Fase | Status |
|---|---|---|---|
| RF-27 | Recursos e cotas do plano aplicados no banco (`tem_recurso`, `consumir_cota`), com exceções por cliente | F1 | planejado |
| RF-28 | Assinatura recorrente via Asaas (Pix, boleto, cartão), com teste grátis e webhook idempotente | F2 | planejado |
| RF-29 | Inadimplência: 7 dias de tolerância, depois modo somente leitura; exportar e pagar continuam permitidos | F1/F2 | planejado |
| RF-30 | Tela Assinatura da profissional: plano, situação, faturas, trocar plano e forma de pagamento | F2 | planejado |

### 5.7 Conectores
| ID | Requisito | Fase | Status |
|---|---|---|---|
| RF-31 | Base de conectores: integração por consultório, segredos no Supabase Vault, fila com novas tentativas e registro de eventos | F4 | planejado |
| RF-32 | E-mail transacional com domínio próprio e modelos em português, inclusive o link de acesso | F0/F4 | planejado |
| RF-33 | Google Agenda: sincronização de mão única (app → Google), sem o nome do paciente por padrão | F4 | planejado |

### 5.8 WhatsApp com o número da profissional
| ID | Requisito | Fase | Status |
|---|---|---|---|
| RF-34 | Conectar o próprio número pelo Embedded Signup da Meta (plataforma como Tech Provider; intermediário oficial como plano B) | F5 | planejado |
| RF-35 | Mensagens-modelo em português criadas e acompanhadas pela plataforma na conta de cada profissional | F5 | planejado |
| RF-36 | Consentimento do paciente para receber mensagens, com data e origem | F5 | planejado |
| RF-37 | Webhook do WhatsApp: Confirmar e Remarcar pelo botão, status de entrega e aviso de pedido online | F5 | planejado |

### 5.9 API e webhooks
| ID | Requisito | Fase | Status |
|---|---|---|---|
| RF-38 | API v1 com chaves por consultório (guardadas como hash, com escopos e limite de requisições); prontuário fora | F6 | planejado |
| RF-39 | Webhooks com assinatura HMAC, novas tentativas e registro de entregas visível à profissional | F6 | planejado |
| RF-40 | Documentação da API em OpenAPI | F6 | planejado |

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Isolamento entre profissionais:** toda tabela tem `org_id` e Row Level Security; testes automáticos garantem que uma conta não lê dados de outra |
| RNF-02 | **Dados no Brasil:** Supabase na região São Paulo |
| RNF-03 | **Celular primeiro:** cada tarefa diária em no máximo 3 toques; telas a partir de 360 px de largura |
| RNF-04 | **Dinheiro em centavos inteiros**, nunca em ponto flutuante |
| RNF-05 | **Prontuário imutável:** só inclusão e exclusão lógica, com guarda conforme o conselho |
| RNF-06 | **Acessibilidade:** contraste AA, navegação por teclado, rótulos em todos os campos |
| RNF-07 | **Fuso horário** da organização em todas as datas e horários |

## 7. Fora do escopo do MVP

- Perfis completos de especialidades além da fisioterapia (fono e psico entram como esboço)
- Clínicas com várias profissionais e recepção (o modelo de dados já comporta)
- Relatório de evolução em PDF, tela de métricas de faltas, login em duas etapas para as profissionais (para o admin é obrigatório, RF-21)
- Logo próprio de cada consultório, enviado pela usuária nos ajustes (D-14)
- NFS-e, receita digital ICP-Brasil, odontograma, convênios (TISS), teleconsulta

## 8. Registro de decisões

Cada decisão de produto ou arquitetura entra aqui, com data e motivo. Decisões não se apagam: uma mudança vira uma nova linha que cita a anterior.

| # | Data | Decisão | Motivo |
|---|---|---|---|
| D-01 | 2026-11-22 | Stack: Next.js + TypeScript + Tailwind + Supabase, deploy na Vercel | Dev solo com apoio de IA; autenticação, banco, RLS e storage prontos |
| D-02 | 2026-11-22 | Multi-tenant por `org_id` + RLS desde o primeiro dia | Evita reescrita ao abrir para outras profissionais e clínicas |
| D-03 | 2026-11-22 | Especialidade como configuração (`specialty_profiles` com formulários em JSON) | Um único app serve várias especialidades |
| D-04 | 2026-11-22 | WhatsApp só pela API oficial da Meta | APIs não oficiais arriscam banir o número |
| D-05 | 2026-11-22 | Cobrança da assinatura pelo Asaas | Pix recorrente, boleto e cartão com foco no Brasil |
| D-06 | 2026-11-22 | MVP em 10 dias; WhatsApp no dia 5 se a Meta aprovar até o dia 4, senão no dia 7 | Prazo pedido; a aprovação externa dita a ordem |
| D-07 | 2026-11-23 | Next.js 16 com `cacheComponents` desligado | Quase toda página lê a sessão e dados de saúde; renderizar a cada requisição é mais simples e não guarda dados sensíveis em cache no servidor |
| D-08 | 2026-11-23 | App único na raiz do repositório (`src/`), em vez do monorepo previsto no PLANO §8 | Menos configuração para um dev solo em 10 dias; as regras de negócio ficam em `src/domain/`, testáveis do mesmo jeito |
| D-09 | 2026-11-23 | Banco local no Docker para desenvolver e testar; projeto na nuvem (São Paulo) só para produção | Testes de RLS criam usuários falsos; local é isolado, grátis e recriável |
| D-10 | 2026-11-23 | Chaves estrangeiras compostas `(org_id, id)` em todas as relações entre tabelas de cliente | RLS sozinho deixaria ligar um registro ao paciente de outra organização; o banco passa a recusar |
| D-11 | 2026-11-23 | Exclusão física bloqueada por gatilho em pacientes, prontuário, documentos e auditoria, além da ausência de política de DELETE | Segunda barreira, que vale até para acesso administrativo (RNF-05) |
| D-12 | 2026-11-25 | Cor do app escolhida entre 6 opções fixas, não por seletor livre | Garante contraste legível (RNF-06) e impede que texto arbitrário vá para o CSS da página pública |
| D-13 | 2026-11-25 | App instalável sem service worker (não funciona offline) | Evita guardar dados de saúde em cache no aparelho; a instalação não exige offline |
| D-14 | 2026-11-25 | Logo próprio de cada consultório fica fora do MVP; no futuro, cada usuária configura o seu nos ajustes | Pedido do Lucas; o app já identifica o consultório pelo nome, pela inicial e pela cor |
| D-15 | 2026-11-25 | "Excluir" paciente é arquivar: some das listas, o prontuário é mantido e os atendimentos futuros são cancelados | Guarda obrigatória do prontuário (RNF-05) |
| D-16 | 2026-11-25 | Atendimento com registro no prontuário não pode ser excluído, só cancelado | Excluir deixaria a evolução sem a sessão e alteraria um registro imutável |
| D-17 | 2026-11-25 | Agenda ganha a visão de mês (calendário com a quantidade por dia), além de dia e semana | Pedido do Lucas no teste do Dia 3; amplia o RF-06 |
| D-18 | 2026-11-25 | Anular uma evolução exige motivo e já está disponível no Dia 4 | Sem isso, um registro no paciente errado não teria correção (o prontuário não se apaga) |
| D-19 | 2026-11-25 | Pacote novo vincula os próximos atendimentos só até o número de sessões que restam (o protótipo vinculava todos) | Evita sessões além do pacote contando nele |
| D-20 | 2026-11-25 | Partes financeiras da tela Hoje (recebido no mês, gráfico, pendências) ficam para o Dia 5 | Sem o Financeiro não há como lançar valores; mostrariam sempre zero |
| D-21 | 2026-11-25 | O WhatsApp automático fica no Dia 7; o Dia 5 é Financeiro e importação (aplica a regra da D-06) | A aprovação da Meta não saiu até o fim do Dia 4 |
| D-22 | 2026-11-25 | A importação do backup grava tudo de uma vez, pode ser repetida sem duplicar e mostra antes o que ficará de fora | Dados reais podem ter falhas; nada some em silêncio e uma segunda tentativa é segura |
| D-23 | 2026-11-25 | Exportação em um arquivo JSON, só para a dona do consultório, com registro na auditoria | Portabilidade (LGPD) sem permitir saída de dados de saúde por outros papéis |
| D-24 | 2026-11-26 | Página pública fora dos buscadores (noindex) no MVP; o link é divulgado pela profissional | Menos exposição e raspagem enquanto não há limite por IP |
| D-25 | 2026-11-26 | Pedido online entra como atendimento avulso, com nome e WhatsApp, sem ligar sozinho a um paciente pelo telefone | Ligar pelo telefone deixaria qualquer pessoa marcar em nome de um paciente e revelaria quem é paciente |
$1
| D-27 | 2026-11-26 | A plataforma nunca acessa dados clínicos: o admin só lê conta, assinatura e uso por funções do banco; sem "entrar como a cliente" | A plataforma é operadora (LGPD); acesso mínimo necessário |
| D-28 | 2026-11-26 | Segredos (tokens da Meta e do Google, segredos de webhook) no Supabase Vault; chaves de API só como hash | Vazamento de uma tabela não expõe credenciais |
| D-29 | 2026-11-26 | WhatsApp, e-mail, cobrança e agenda atrás de uma interface única (`src/lib/conectores/`) | Trocar de provedor sem reescrever o produto |
| D-30 | 2026-11-26 | Recursos e limites vêm do plano, conferidos dentro do banco (`tem_recurso`, `consumir_cota`) | Nenhuma regra de plano espalhada pelas telas; o admin controla tudo |
| D-31 | 2026-11-26 | Tudo que sai do sistema passa por fila com novas tentativas (outbox) | Falha externa nunca derruba a ação da profissional |
| D-32 | 2026-11-26 | WhatsApp pelo número da própria profissional, via Cloud API + Embedded Signup, com a plataforma como Tech Provider; intermediário oficial (BSP) como plano B. Mantém a D-04 | Pedido do Lucas; mensagem sai do número dela, a resposta volta para ela e cada número tem a própria reputação |
| D-33 | 2026-11-26 | O custo das mensagens da Meta é pago pela profissional, na conta WhatsApp Business dela; os planos só limitam a quantidade | A plataforma não intermedeia cobrança de terceiros |
| D-34 | 2026-11-26 | Evento no Google Agenda sem o nome do paciente por padrão (opção para incluir) | Minimiza dados de saúde enviados ao Google |
| D-35 | 2026-11-26 | Prontuário fora da API v1 | Dado mais sensível; entra só com demanda e salvaguardas próprias |
| D-36 | 2026-11-26 | Inadimplência: 7 dias de tolerância, depois só leitura; exportação sempre permitida | Não sequestra os dados da profissional (portabilidade) |
$1
$1
| D-39 | 2026-11-26 | WhatsApp (F5) vira a última fase e a publicação (F0) a penúltima: ordem F1 → F2 → F3 → F4 → F6 → F0 → F5. A F7 é distribuída: testes e revisão de segurança na F0, abertura geral (`v1.0.0`) ao fim da F5 | Pedido do Lucas; o WhatsApp tem a maior dependência externa e o app funciona sem ele |

## 9. Perguntas em aberto

- [ ] Nome definitivo do produto e domínio (o nome atual já está desenhado no logo)
- [ ] Rever o símbolo do logo: lembra um estetoscópio, que remete mais a medicina do que às outras especialidades
- [ ] P-1: oferecer créditos de WhatsApp inclusos nos planos no futuro? (hoje a profissional paga a Meta, D-33)
- [ ] P-2: preço final dos planos (hipótese: R$ 59 a R$ 89/mês) e limite de lembretes por plano
- [ ] P-3: por quanto tempo guardar os dados de quem cancela, antes de excluir (definir nos termos, com o advogado)
- [ ] Prazos de guarda de prontuário por conselho (confirmar com advogado)
- [ ] Quem são as 3 a 5 profissionais beta do dia 10
- [ ] Credenciais do Google Cloud para o login com Google (RF-01)
- [ ] Avisar quando dois atendimentos caírem no mesmo horário?
- [ ] Publicar o app (Supabase de produção + Vercel): F0, a penúltima fase (D-39); só então a Alanna migra
- [ ] Limite de pedidos por IP no agendamento online (precisa da infraestrutura de produção)
- [ ] Avisar a profissional de um novo pedido online (hoje ele só aparece na agenda; por e-mail na F4, pelo WhatsApp no RF-37)
- [ ] E-mails de login em português (hoje o modelo padrão do Supabase está em inglês)
- [ ] Criação do projeto Supabase de produção (região São Paulo) e da conta na Vercel
