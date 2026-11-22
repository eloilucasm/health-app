# Guia de sessão: como documentar cada sessão de trabalho

Toda sessão termina com três coisas: **changelog atualizado, PRD atualizado e um commit**. Sem isso, a sessão não acabou.

Uma **sessão** é um bloco contínuo de trabalho, normalmente um dia do roadmap do [PLANO.md](PLANO.md). Elas são numeradas em sequência a partir da Sessão 0 (planejamento, em 2026-11-22).

---

## 1. Ao começar

1. Ler a última entrada do [CHANGELOG.md](../CHANGELOG.md), principalmente a linha **Próxima sessão**.
2. Ver no [PRD.md](PRD.md) quais requisitos (RF) são do dia e em que status estão.
3. Rodar `git status` e conferir que não há trabalho solto da sessão anterior.
4. Definir em uma frase o objetivo da sessão (ex.: "Dia 3: pacientes e agenda").

## 2. Durante

- Ao começar um requisito, mudar o status dele no PRD para `em andamento`.
- Toda decisão que muda produto, arquitetura, escopo ou prazo vira uma linha nova em **Registro de decisões** do PRD (D-07, D-08…), com data e motivo.
- Ideias novas que não são do dia vão para **Perguntas em aberto** ou **Fora do escopo** no PRD. Elas não entram no código da sessão.
- Commits intermediários são bem-vindos (ver seção 4). O commit de fechamento é obrigatório.

## 3. Ao terminar: checklist de fechamento

- [ ] **Changelog:** adicionar a entrada da sessão no topo de `[Não lançado]` (modelo abaixo)
- [ ] **PRD:** atualizar o status dos requisitos tocados, a data no cabeçalho e as decisões novas
- [ ] **Plano:** se o roadmap mudou (dia trocado, item cortado), registrar no PRD como decisão e ajustar o [PLANO.md](PLANO.md)
- [ ] **Verificação:** rodar lint, typecheck e testes (quando existirem) e anotar no changelog o que não passou
- [ ] **Commit de fechamento** (seção 4)
- [ ] **Release:** ao fechar um marco, transformar `[Não lançado]` em versão (seção 5)

### Modelo de entrada no changelog

```markdown
### Sessão N · AAAA-MM-DD · Dia X: <objetivo em poucas palavras>

**Adicionado**
- O que passou a existir, do ponto de vista de quem usa (RF-xx)

**Alterado**
- O que mudou de comportamento (RF-xx, D-xx)

**Corrigido**
- Bugs resolvidos

**Removido**
- O que saiu

**Pendências**
- O que ficou incompleto, falhou nos testes ou depende de terceiros

**Próxima sessão:** o que vem a seguir, em uma ou duas frases.
```

Regras:
- Usar só as seções que tiverem conteúdo.
- Escrever para quem usa o produto ("a agenda mostra a semana"), não para quem lê o código ("refatorado o componente X"). Detalhe técnico vai na mensagem do commit.
- Citar os IDs do PRD (RF-xx, D-xx) para ligar as mudanças aos requisitos.
- Falha ou pendência é registrada do jeito que é. O changelog não esconde o que não funcionou.

## 4. Commits

Mensagens no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português:

```
<tipo>(<área>): <resumo no imperativo, até ~70 caracteres>

<corpo opcional: o porquê e os detalhes técnicos>

Refs: RF-05, RF-06
```

| Tipo | Quando usar |
|---|---|
| `feat` | funcionalidade nova |
| `fix` | correção de bug |
| `docs` | só documentação (PRD, changelog, guias) |
| `refactor` | mudança de código sem mudar comportamento |
| `test` | testes |
| `chore` | configuração, dependências, build |
| `db` | migrações e políticas RLS do Supabase |

Áreas sugeridas: `agenda`, `pacientes`, `evolucao`, `pacotes`, `financeiro`, `hoje`, `auth`, `onboarding`, `booking`, `whatsapp`, `prontuario`, `docs-pdf`, `billing`, `infra`.

**Commit de fechamento da sessão:** inclui o changelog e o PRD atualizados. Se o código já foi commitado antes, o fechamento é um `docs`:

```
docs(sessao): fecha sessão 3 (Dia 3: pacientes e agenda)

Refs: RF-05, RF-06
```

Nunca commitar segredos (`.env`, chaves do Supabase, da Meta ou do Asaas).

## 5. Versões e marcos

| Marco | Versão | Quando |
|---|---|---|
| Planejamento e documentação base | `0.0.0` | Sessão 0 (2026-11-22) |
| Alanna migra para a versão nova | `0.1.0` | Dia 5 (ou 6, se o WhatsApp subir para o dia 5) |
| Beta no ar | `0.2.0` | Dia 10 |
| Primeira profissional pagante | `0.3.0` | Semanas seguintes |
| Produto estável para venda aberta | `1.0.0` | A definir |

Ao fechar um marco:
1. Renomear `## [Não lançado]` para `## [0.x.0] - AAAA-MM-DD` e criar um `## [Não lançado]` vazio acima.
2. Commit `docs(release): 0.x.0`.
3. Criar a tag: `git tag -a v0.x.0 -m "0.x.0: <marco>"`.
