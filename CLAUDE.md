# Consultório no Bolso

SaaS para profissionais de saúde autônomas (agenda, pacientes, evolução, pacotes, financeiro), nascido do protótipo da fisioterapeuta Alanna Viana (`index.html`). Idioma do produto, da documentação e dos commits: português do Brasil.

## Documentos de referência
- [docs/PLANO.md](docs/PLANO.md): plano aprovado, arquitetura e roadmap de 10 dias
- [docs/PRD.md](docs/PRD.md): requisitos (RF/RNF) com status, decisões (D-xx) e perguntas em aberto
- [CHANGELOG.md](CHANGELOG.md): uma entrada por sessão
- [docs/GUIA-DE-SESSAO.md](docs/GUIA-DE-SESSAO.md): ritual de início e de fechamento de sessão

## Regras de toda sessão
- **Ao começar:** ler a última entrada do CHANGELOG (linha "Próxima sessão") e os RFs do dia no PRD.
- **Ao terminar:** seguir o checklist de fechamento do guia: atualizar CHANGELOG e PRD, depois fazer o commit de fechamento (Conventional Commits em português, com `Refs: RF-xx`).
- Escopo congelado: ideia nova vai para o PRD (perguntas em aberto ou fora do escopo), não para o código.
- Decisão de produto ou arquitetura vira linha nova no Registro de decisões do PRD.

## Convenções técnicas (ver PLANO.md §3)
- Next.js (App Router) + TypeScript + Tailwind + Supabase (região São Paulo), deploy na Vercel.
- Toda tabela tem `org_id` e Row Level Security; nunca expor dados entre organizações.
- Dinheiro em centavos inteiros. Datas no fuso da organização.
- Prontuário (`clinical_records`) só aceita inclusão: nada de UPDATE ou DELETE físico.
- Nunca commitar `.env` nem chaves (Supabase, Meta, Asaas).
