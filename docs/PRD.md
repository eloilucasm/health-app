# PRD: Consultório no Bolso

| | |
|---|---|
| **Versão do PRD** | 1.0 |
| **Última atualização** | 2026-11-22 (Sessão 0) |
| **Status do produto** | Planejamento concluído; desenvolvimento do MVP começa no Dia 1 |
| **Plano de execução** | [PLANO.md](PLANO.md) |
| **Histórico de mudanças** | [CHANGELOG.md](../CHANGELOG.md) |

Este documento diz **o que** o produto faz e **por quê**. O **como** e o **quando** estão no [PLANO.md](PLANO.md). Ele é atualizado ao fim de cada sessão de trabalho, conforme o [GUIA-DE-SESSAO.md](GUIA-DE-SESSAO.md).

---

## 1. Problema

Profissionais de saúde autônomas organizam agenda, prontuário e dinheiro em caderno, WhatsApp e planilha. O resultado:
- pacientes faltam sem avisar;
- sessões de pacote são esquecidas ou cobradas errado;
- ninguém sabe quanto entrou no mês.

O protótipo ([index.html](../index.html)) resolve isso para uma fisioterapeuta (Alanna Viana), mas serve só a ela. Os dados ficam presos em um aparelho, sem login, sem lembretes automáticos e sem agendamento pelo paciente.

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

Status: `planejado` · `em andamento` · `pronto` · `adiado`. A coluna **Dia** segue o roadmap do [PLANO.md](PLANO.md).

### 5.1 Conta e configuração
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-01 | Cadastro e login por e-mail (link mágico) e Google | 1 | planejado |
| RF-02 | Onboarding: nome, especialidade, conselho e registro, endereço, telefone, logo e cor | 2 | planejado |
| RF-03 | Horários de atendimento configuráveis por dia da semana (substitui os dias fixos do protótipo) | 2 | planejado |
| RF-04 | App instalável no celular (PWA) com tema claro e escuro | 2 | planejado |

### 5.2 Rotina do consultório (paridade com o protótipo)
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-05 | Pacientes: cadastro, busca por nome, convênio ou diagnóstico, ficha com histórico, botão WhatsApp | 3 | planejado |
| RF-06 | Agenda por dia e por semana; status agendado, confirmado, realizado, faltou e cancelado; local consultório, domicílio ou online | 3 | planejado |
| RF-07 | Evolução da sessão por formulário da especialidade (fisio: queixa, EVA 0–10, condutas, observações); salvar já marca a sessão como realizada | 4 | planejado |
| RF-08 | Pacotes de sessões que descontam sozinhos ao marcar "realizado"; aviso quando restam 2 ou menos | 4 | planejado |
| RF-09 | Tela Hoje: atendimentos do dia, indicadores do mês e alertas (sem baixa, pacote acabando, pendências) | 4 | planejado |
| RF-10 | Financeiro: entradas, saídas, pendências, saldo do mês e acumulado, gráfico mensal | 5 | planejado |
| RF-11 | Importar o backup JSON do protótipo (`app: "alanna-fisio", v: 1`) | 5 | planejado |
| RF-12 | Exportar todos os dados da profissional (portabilidade, LGPD) | 5 | planejado |

### 5.3 Diferenciais
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-13 | Página pública de agendamento online (`/{slug}`) com horários livres, consentimento LGPD e confirmação | 6 | planejado |
| RF-14 | Lembrete por WhatsApp 24 h antes, com botões Confirmar e Remarcar que atualizam o status | 7 (ou 5) | planejado |
| RF-15 | Plano B do RF-14: botão "Enviar lembretes de amanhã" que abre cada conversa com a mensagem pronta | 7 | planejado |
| RF-16 | Anamnese por especialidade; evolução com versões (nada é apagado de verdade); anexos | 8 | planejado |
| RF-17 | Documentos em PDF: atestado, declaração de comparecimento e recibo | 8 | planejado |
| RF-18 | Trilha de auditoria de acesso a prontuários | 8 | planejado |

### 5.4 Negócio
| ID | Requisito | Dia | Status |
|---|---|---|---|
| RF-19 | Assinatura com teste grátis de 14 dias via Asaas (plano B: link Pix e liberação manual) | 9 | planejado |
| RF-20 | Landing page, termos de uso e política de privacidade | 9 | planejado |

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
- Relatório de evolução em PDF, tela de métricas de faltas, login em duas etapas, bloqueio automático por inadimplência
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

## 9. Perguntas em aberto

- [ ] Nome definitivo do produto e domínio
- [ ] Preço final (hipótese: R$ 59 a R$ 89/mês) e tamanho do pacote de WhatsApp incluso
- [ ] Prazos de guarda de prontuário por conselho (confirmar com advogado)
- [ ] Quem são as 3 a 5 profissionais beta do dia 10
