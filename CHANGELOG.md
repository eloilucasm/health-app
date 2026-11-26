# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui, uma entrada por sessão de trabalho.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/). Enquanto a versão começar por `0.`, o produto está em desenvolvimento e qualquer coisa pode mudar. Como registrar uma sessão: [docs/GUIA-DE-SESSAO.md](docs/GUIA-DE-SESSAO.md).

## [Não lançado]

### Sessão 7 · 2026-11-26 · Replanejamento: plataforma SaaS

**Alterado**
- O roadmap de 10 dias foi substituído, a partir do Dia 7, por fases semanais (F0 a F7) que transformam o app em plataforma para muitas profissionais (D-37, [PLANO §11](docs/PLANO.md))
- WhatsApp passa a sair do número da própria profissional, pela API oficial, com a plataforma como parceira técnica da Meta (D-32, D-33)
- Publicação adiada para depois do painel administrativo e da cobrança: ordem F1 → F2 → F0 → F3 → … (D-38). Marcos de versão do guia ajustados

**Adicionado**
- Requisitos RF-21 a RF-40: painel administrativo, planos e assinaturas, conectores (e-mail, Google Agenda), WhatsApp por profissional, API e webhooks
- Princípios da plataforma como decisões D-27 a D-31: nenhum acesso a dados clínicos pelo admin, segredos no Vault, provedores trocáveis, limites pelo plano e saídas por fila
- Perguntas em aberto P-1 a P-3 (créditos de WhatsApp, preço dos planos, guarda de dados após cancelamento)

**Pendências**
- Nada de código nesta sessão
- Pedidos externos que entram já na Fase 0, por conta do Lucas: verificação da empresa na Meta e inscrição como Tech Provider, verificação do app no Google, conta no Asaas, domínio e advogado

**Próxima sessão:** Fase 1, fundação da plataforma: administradores com login em duas etapas, planos, recursos, cotas e exceções, assinaturas com migração dos dados atuais, modo somente leitura, e admin de Clientes e de Planos (RF-21 a RF-23, RF-27, RF-29).

### Sessão 6 · 2026-11-26 · Dia 6: agendamento online

**Adicionado**
- Página pública de agendamento (`/{nome-do-consultorio}`): o paciente escolhe dia e horário livre, informa nome e WhatsApp e autoriza o uso dos dados, sem precisar de login (RF-13)
- Nos Ajustes: ligar ou desligar o agendamento online, antecedência mínima, dias de agenda aberta, mensagem da página e o link para copiar
- Na agenda, o pedido aparece marcado como "Online", com o WhatsApp do contato e atalho para a conversa
- Proteções: visitante não vê nenhum dado do consultório além do perfil público e dos horários livres; sem horário duplo; limite de pedidos por telefone e por hora (D-26)

**Alterado**
- A página pública não aparece em buscadores (D-24)
- Pedido online não é ligado automaticamente a um paciente cadastrado (D-25)

**Pendências**
- A profissional não é avisada de um pedido novo: ele só aparece na agenda
- Sem limite de pedidos por endereço IP (depende da publicação)
- Pendências das sessões anteriores continuam: publicação (Supabase de produção, Vercel, envio de e-mail), migração da Alanna, instalação em celular, login com Google, e-mail de acesso em inglês, revisão do prontuário com o Opus, Meta, Asaas e advogado

**Verificação:** lint, typecheck e build de produção passam, assim como os 27 testes de regras e os 47 de banco, executados no commit do agendamento online; no fechamento o Docker estava desligado e os testes de banco não foram repetidos. Fluxo testado no navegador em tamanho de celular, com um visitante sem login.

**Próxima sessão:** Dia 7. Lembretes por WhatsApp (RF-14). Sem a aprovação da Meta, entra o botão "Enviar lembretes de amanhã" (RF-15).

### Sessão 5 · 2026-11-25 · Dia 5: financeiro, importação e exportação

**Adicionado**
- Financeiro: entradas, saídas, pendências, saldo do mês e acumulado, gráfico do ano e saldo inicial. Lançar recebimento a partir de um atendimento (RF-10)
- Tela Hoje com o recebido no mês, as pendências e o gráfico de entradas (RF-09)
- Importar o backup do app antigo: mostra antes o que vai entrar e o que ficará de fora, e repetir não duplica (RF-11, D-22)
- Exportar todos os dados do consultório em um arquivo, só para a dona, com registro na auditoria (RF-12, D-23)

**Pendências**
- **Marco do Dia 5 não atingido:** a Alanna ainda não migrou, porque o app não está publicado (faltam Supabase de produção, Vercel e envio de e-mail). A versão `0.1.0` fica para quando ela migrar
- A importação foi testada com um backup fictício montado a partir do código do protótipo, não com um backup real: conferir contagens e saldos com o arquivo da Alanna
- O app passa a aceitar envios de até 5 MB nas ações do servidor, por causa do backup
- Pendências das sessões anteriores continuam: instalação em celular, login com Google, e-mail de acesso em inglês, revisão do prontuário com o Opus, Meta, Asaas e advogado

**Verificação:** lint, typecheck e build de produção passam, assim como os 26 testes de regras e os 39 de banco; `supabase db lint` sem erros. Importação, financeiro e exportação testados no navegador em tamanho de celular, com os saldos conferidos à mão.

**Próxima sessão:** Dia 6. Agendamento online: página pública com horários livres, consentimento LGPD e confirmação (RF-13). Recomendado usar o Opus.

### Sessão 4 · 2026-11-25 · Dia 4: evolução, pacotes e tela Hoje

**Adicionado**
- Evolução da sessão pelo formulário da especialidade, com escala de dor, condutas e curva de dor na ficha. Registrar a partir de um atendimento já o marca como realizado (RF-07)
- Editar uma evolução cria nova versão e preserva a anterior; anular exige motivo (D-18)
- Pacotes de sessões: criar, editar, encerrar e excluir. Cada sessão realizada desconta sozinha (RF-08)
- Tela Hoje com atendimentos do dia, pacotes acabando, atendimentos sem baixa e indicadores (RF-09)

**Alterado**
- Pacote novo vincula os próximos atendimentos só até as sessões que restam (D-19)
- WhatsApp automático confirmado para o Dia 7 (D-21)

**Corrigido**
- O banco passa a recusar pacote de um paciente em atendimento de outro, evolução em atendimento de outro paciente e troca de paciente em atendimento com evolução

**Pendências**
- Parte financeira da tela Hoje vai com o Financeiro (D-20)
- A parte do prontuário foi feita com o Sonnet; vale uma revisão com o Opus antes do lançamento
- Pendências das sessões anteriores continuam: instalação em celular, login com Google, e-mail de acesso em inglês, Supabase de produção, Vercel, Meta, Asaas e advogado

**Verificação:** lint, typecheck e build de produção passam, assim como os 22 testes de regras e os 35 de banco; `supabase db lint` sem erros. Fluxos testados no navegador em tamanho de celular.

**Próxima sessão:** Dia 5. Financeiro, importação do backup do protótipo e exportação de dados (RF-10, RF-11, RF-12) e a parte financeira da tela Hoje (RF-09).

### Sessão 3 · 2026-11-25 · Dia 3: pacientes e agenda

**Adicionado**
- Pacientes: cadastro, edição e busca por nome, convênio ou diagnóstico, sem diferenciar acentos (RF-05)
- Ficha do paciente com dados, botão do WhatsApp, total de sessões realizadas e faltas, próximos atendimentos e os anteriores (RF-05)
- Arquivar paciente: sai das listas e os atendimentos futuros são cancelados; o prontuário é mantido (D-15)
- Agenda por dia, semana e mês, com os horários de atendimento cadastrados. No mês, cada dia mostra a quantidade de atendimentos (RF-06, D-17)
- Criar, editar e excluir atendimento, com paciente ou descrição avulsa, e mudar o status (agendado, confirmado, realizado, faltou, cancelado) (RF-06)
- Página "não encontrada" em português

**Alterado**
- Atendimento com registro no prontuário não pode ser excluído, só cancelado (D-16)

**Corrigido**
- Falha no esquema do Dia 1: excluir um atendimento com evolução daria um erro sem explicação

**Pendências**
- Evolução das sessões, pacotes e a tela Hoje completa são do Dia 4
- As abas Pacotes e Financeiro são telas provisórias
- Sem aviso quando dois atendimentos caem no mesmo horário
- A lista de pacientes carrega no máximo 1000 por consultório
- Pendências das sessões anteriores continuam: instalação em celular, login com Google, e-mail de acesso em inglês, Supabase de produção, Vercel, Meta, Asaas e advogado

**Verificação:** lint, typecheck e build de produção passam, assim como os 16 testes de regras e os 26 de banco; `supabase db lint` sem erros. Fluxos de pacientes e agenda testados no navegador em tamanho de celular.

**Próxima sessão:** Dia 4. Evolução pelo formulário da especialidade (EVA), pacotes de sessões e tela Hoje com indicadores e alertas (RF-07, RF-08, RF-09). Se a Meta aprovar o WhatsApp até o fim do Dia 4, ele sobe para o Dia 5 (D-06).

### Sessão 2 · 2026-11-25 · Dia 2: cadastro do consultório e moldura do app

**Adicionado**
- Cadastro do consultório no primeiro acesso: nome, especialidade, registro no conselho, telefone, endereço, Instagram, fuso horário e cor do app (RF-02)
- Horários de atendimento por dia da semana, com vários períodos por dia, local de cada um e duração da sessão. Períodos sobrepostos ou invertidos são recusados (RF-03)
- Tela de ajustes para mudar esses dados depois
- App com cabeçalho do consultório, barra de abas (Hoje, Agenda, Pacientes, Pacotes, Financeiro) e folhas que sobem de baixo, nos temas claro e escuro (RF-04)
- Tela Hoje provisória, com a saudação e o horário de atendimento do dia
- App instalável no celular (RF-04)
- Logo do produto na tela de login e nos ícones do app

**Alterado**
- Logo próprio de cada consultório saiu do MVP e fica para o futuro (D-14)
- Cor escolhida entre 6 opções (D-12). App instalável sem funcionamento offline (D-13)

**Pendências**
- Instalação ainda não testada em celular de verdade: precisa do app publicado
- As abas Agenda, Pacientes, Pacotes e Financeiro são telas provisórias
- Pendências da Sessão 1 continuam: login com Google, e-mail de acesso em inglês, Supabase de produção, Vercel, Meta, Asaas e advogado

**Verificação:** lint, typecheck e build de produção passam, assim como os 8 testes de regras e os 22 de banco; `supabase db lint` sem erros. Fluxo de cadastro e ajustes testado no navegador em tamanho de celular.

**Próxima sessão:** Dia 3. Pacientes (lista, busca, ficha) e Agenda (dia e semana, com os horários cadastrados) (RF-05, RF-06).

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
