-- =============================================================================
-- Esquema base do Consultório no Bolso (Sessão 1, Dia 1)
-- Referências: docs/PLANO.md §3 (modelo de dados), docs/PRD.md (RF-01..RF-20, RNF-01..07)
--
-- Convenções:
--   * Toda tabela de dados de cliente tem org_id (multi-tenant, RNF-01).
--   * Dinheiro em centavos inteiros (bigint), nunca float (RNF-04).
--   * Datas com fuso: timestamptz; a organização guarda seu timezone (RNF-07).
--   * Domínios fechados como CHECK em text (mais fácil de evoluir que enum).
--   * legacy_id: id do protótipo (backup JSON), para importação idempotente (RF-11).
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Especialidades (dados de referência, globais)
-- -----------------------------------------------------------------------------
create table public.specialty_profiles (
  id               text primary key,                 -- 'fisioterapia', 'fonoaudiologia'…
  nome             text not null,
  conselho         text not null,                    -- 'CREFITO', 'CRFa'…
  evolution_schema jsonb not null default '{"version":1,"fields":[]}'::jsonb,
  anamnesis_schema jsonb not null default '{"version":1,"fields":[]}'::jsonb,
  procedimentos    text[] not null default '{}',
  doc_templates    jsonb not null default '{}'::jsonb,
  usa_pacotes      boolean not null default true,
  ativo            boolean not null default true,
  ordem            int not null default 100
);

-- -----------------------------------------------------------------------------
-- Organizações e vínculos
-- -----------------------------------------------------------------------------
create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique
                           check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  nome                   text not null check (length(trim(nome)) between 2 and 120),
  specialty_profile_id   text not null references public.specialty_profiles(id),
  conselho               text,
  registro               text,
  endereco               text,
  telefone               text,
  instagram              text,
  logo_url               text,
  tema                   jsonb not null default '{}'::jsonb,   -- { "cor": "#CA556C" }
  procedimentos          text[],                               -- null = usa os da especialidade
  saldo_inicial_centavos bigint not null default 0,
  timezone               text not null default 'America/Sao_Paulo',
  plano                  text not null default 'trial'
                           check (plano in ('trial', 'solo', 'cancelado')),
  trial_ate              date default (current_date + 14),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.memberships (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner'
               check (role in ('owner', 'profissional', 'recepcao')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- -----------------------------------------------------------------------------
-- Horários de atendimento (substitui os dias fixos [1,3,5] do protótipo, RF-03)
-- -----------------------------------------------------------------------------
create table public.working_hours (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),   -- 0 = domingo
  inicio       time not null,
  fim          time not null,
  duracao_min  smallint not null default 50 check (duracao_min between 10 and 240),
  local        text not null default 'consultorio'
                 check (local in ('consultorio', 'domicilio', 'online')),
  created_at   timestamptz not null default now(),
  check (fim > inicio)
);
create index working_hours_org_idx on public.working_hours (org_id, weekday);

-- -----------------------------------------------------------------------------
-- Pacientes (RF-05). Nunca apagados fisicamente: deleted_at (RNF-05).
-- -----------------------------------------------------------------------------
create table public.patients (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  nome                  text not null check (length(trim(nome)) between 1 and 160),
  telefone              text,
  email                 text,
  nascimento            date,
  cpf                   text,
  convenio              text,
  diagnostico           text,
  medico_encaminhador   text,
  obs                   text,
  consentimento_lgpd_em timestamptz,
  legacy_id             text,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, legacy_id)
);
create index patients_org_nome_idx on public.patients (org_id, nome) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- Pacotes de sessões (RF-08)
-- -----------------------------------------------------------------------------
create table public.packages (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  patient_id      uuid not null,
  total           smallint not null check (total between 1 and 200),
  usadas_antes    smallint not null default 0 check (usadas_antes >= 0),
  valor_centavos  bigint check (valor_centavos >= 0),
  inicio          date,
  ativo           boolean not null default true,
  obs             text,
  legacy_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, legacy_id),
  foreign key (org_id, patient_id) references public.patients (org_id, id) on delete restrict
);
create index packages_org_patient_idx on public.packages (org_id, patient_id);

-- -----------------------------------------------------------------------------
-- Agenda (RF-06, RF-13)
-- -----------------------------------------------------------------------------
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  patient_id        uuid,
  descricao_avulsa  text,                         -- atendimento sem cadastro ("Massagem")
  inicio            timestamptz not null,
  fim               timestamptz,
  local             text not null default 'consultorio'
                      check (local in ('consultorio', 'domicilio', 'online')),
  status            text not null default 'agendado'
                      check (status in ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado')),
  package_id        uuid,
  origem            text not null default 'manual' check (origem in ('manual', 'online', 'importado')),
  obs               text,
  legacy_id         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, legacy_id),
  foreign key (org_id, patient_id) references public.patients (org_id, id) on delete restrict,
  foreign key (org_id, package_id) references public.packages (org_id, id) on delete set null (package_id),
  check (patient_id is not null or coalesce(length(trim(descricao_avulsa)), 0) > 0),
  check (fim is null or fim > inicio)
);
create index appointments_org_inicio_idx on public.appointments (org_id, inicio);
create index appointments_patient_idx on public.appointments (patient_id, inicio);
create index appointments_package_idx on public.appointments (package_id) where package_id is not null;

-- -----------------------------------------------------------------------------
-- Prontuário: evoluções e anamneses (RF-07, RF-16). Somente inclusão (RNF-05):
--   * editar = inserir nova versão com o mesmo grupo_id e versao + 1;
--   * anular = preencher anulado_em/anulado_por/anulado_motivo uma única vez.
--   Triggers na migração de segurança garantem isso.
-- -----------------------------------------------------------------------------
create table public.clinical_records (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  patient_id      uuid not null,
  appointment_id  uuid,
  tipo            text not null check (tipo in ('evolucao', 'anamnese')),
  data            date not null,
  grupo_id        uuid not null default gen_random_uuid(),   -- todas as versões do mesmo registro
  versao          int not null default 1 check (versao >= 1),
  schema_version  int not null default 1,
  conteudo        jsonb not null default '{}'::jsonb,
  autor_id        uuid references auth.users(id) on delete set null default auth.uid(),
  anulado_em      timestamptz,
  anulado_por     uuid references auth.users(id) on delete set null,
  anulado_motivo  text,
  legacy_id       text,
  created_at      timestamptz not null default now(),
  unique (grupo_id, versao),
  unique (org_id, legacy_id),
  foreign key (org_id, patient_id) references public.patients (org_id, id) on delete restrict,
  foreign key (org_id, appointment_id) references public.appointments (org_id, id) on delete set null (appointment_id)
);
create index clinical_records_patient_idx on public.clinical_records (org_id, patient_id, data desc);

-- Visão com só a versão mais recente de cada registro, sem os anulados.
-- A anulação é marcada na versão mais recente do grupo.
create view public.clinical_records_atuais
with (security_invoker = true) as
select *
from (
  select distinct on (grupo_id) *
  from public.clinical_records
  order by grupo_id, versao desc
) ultimas
where anulado_em is null;

-- -----------------------------------------------------------------------------
-- Financeiro (RF-10)
-- -----------------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada', 'saida')),
  valor_centavos  bigint not null check (valor_centavos > 0),
  data            date not null,
  forma           text check (forma in ('pix', 'credito', 'debito', 'dinheiro', 'boleto', 'outro')),
  status          text not null default 'recebido' check (status in ('recebido', 'pendente')),
  descricao       text,
  patient_id      uuid,
  appointment_id  uuid,
  package_id      uuid,
  obs             text,
  legacy_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, legacy_id),
  foreign key (org_id, patient_id) references public.patients (org_id, id) on delete set null (patient_id),
  foreign key (org_id, appointment_id) references public.appointments (org_id, id) on delete set null (appointment_id),
  foreign key (org_id, package_id) references public.packages (org_id, id) on delete set null (package_id),
  check (tipo = 'entrada' or status = 'recebido')
);
create index transactions_org_data_idx on public.transactions (org_id, data);

-- -----------------------------------------------------------------------------
-- Documentos emitidos em PDF (RF-17)
-- -----------------------------------------------------------------------------
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete restrict,
  patient_id  uuid not null,
  tipo        text not null check (tipo in ('atestado', 'declaracao', 'recibo', 'relatorio')),
  conteudo    jsonb not null default '{}'::jsonb,
  pdf_path    text,
  emitido_por uuid references auth.users(id) on delete set null default auth.uid(),
  emitido_em  timestamptz not null default now(),
  foreign key (org_id, patient_id) references public.patients (org_id, id) on delete restrict
);
create index documents_patient_idx on public.documents (org_id, patient_id);

-- -----------------------------------------------------------------------------
-- Lembretes (RF-14, RF-15)
-- -----------------------------------------------------------------------------
create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  appointment_id  uuid not null,
  canal           text not null default 'whatsapp_api' check (canal in ('whatsapp_api', 'whatsapp_link')),
  agendado_para   timestamptz not null,
  enviado_em      timestamptz,
  status          text not null default 'pendente'
                    check (status in ('pendente', 'enviado', 'falhou', 'respondido', 'cancelado')),
  resposta        text check (resposta in ('confirmar', 'remarcar')),
  provider_msg_id text,
  erro            text,
  created_at      timestamptz not null default now(),
  unique (appointment_id, canal),
  foreign key (org_id, appointment_id) references public.appointments (org_id, id) on delete cascade
);
create index reminders_fila_idx on public.reminders (agendado_para) where status = 'pendente';

-- -----------------------------------------------------------------------------
-- Agendamento online (RF-13)
-- -----------------------------------------------------------------------------
create table public.booking_settings (
  org_id            uuid primary key references public.organizations(id) on delete cascade,
  ativo             boolean not null default false,
  antecedencia_min  int not null default 120 check (antecedencia_min >= 0),
  janela_dias       int not null default 30 check (janela_dias between 1 and 120),
  servicos          jsonb not null default '[]'::jsonb,   -- [{ "nome": "Avaliação", "duracao_min": 60 }]
  mensagem          text,
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Trilha de auditoria (RF-18). Somente inclusão.
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  user_id      uuid default auth.uid(),
  acao         text not null,          -- 'ver', 'criar', 'anular', 'exportar', 'importar'…
  entidade     text not null,          -- 'clinical_records', 'patients'…
  entidade_id  text,
  detalhes     jsonb,
  ip           inet,
  em           timestamptz not null default now()
);
create index audit_log_org_em_idx on public.audit_log (org_id, em desc);

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger patients_updated_at before update on public.patients
  for each row execute function private.set_updated_at();
create trigger packages_updated_at before update on public.packages
  for each row execute function private.set_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function private.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function private.set_updated_at();
create trigger booking_settings_updated_at before update on public.booking_settings
  for each row execute function private.set_updated_at();
