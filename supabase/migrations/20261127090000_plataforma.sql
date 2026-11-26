-- =============================================================================
-- Fundação da plataforma (Fase 1): RF-21, RF-22, RF-23, RF-27, RF-29
--
-- Princípios (PRD D-27 a D-31):
--   * A plataforma nunca lê dados clínicos: o admin não ganha política em
--     nenhuma tabela de consultório; ele só usa funções admin_* que devolvem
--     conta, assinatura e uso (contagens), e exigem login em duas etapas (aal2).
--   * Recursos e limites vêm do plano (tem_recurso, limite_do_recurso,
--     consumir_cota), conferidos dentro do banco.
--   * Inadimplência e teste vencido viram modo somente leitura
--     (pode_escrever), aplicado nas políticas de escrita.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Administradores da plataforma
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  papel     text not null check (papel in ('admin', 'suporte')),
  criado_em timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- Cada pessoa só descobre o próprio papel (para a tela decidir o que mostrar).
create policy "admins: ve o proprio papel" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Admin de verdade = cadastrado E com login em duas etapas nesta sessão.
create or replace function private.is_platform_admin(p_papeis text[] default array['admin', 'suporte'])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and exists (
       select 1 from public.platform_admins a
       where a.user_id = (select auth.uid()) and a.papel = any (p_papeis)
     );
$$;

create table public.admin_audit_log (
  id        bigint generated always as identity primary key,
  admin_id  uuid not null default auth.uid(),
  acao      text not null,
  org_id    uuid references public.organizations(id) on delete set null,
  motivo    text,
  detalhes  jsonb,
  em        timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
-- Sem políticas: só as funções admin_* leem e gravam.

create or replace function private.registrar_admin(p_acao text, p_org uuid, p_motivo text, p_detalhes jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (acao, org_id, motivo, detalhes)
  values (p_acao, p_org, p_motivo, p_detalhes);
$$;

-- ---------------------------------------------------------------------------
-- Catálogo de recursos, planos e exceções
-- ---------------------------------------------------------------------------
create table public.recursos (
  id        text primary key,
  nome      text not null,
  descricao text,
  tipo      text not null check (tipo in ('booleano', 'cota_mensal')),
  ordem     int not null default 100
);

create table public.plans (
  id             text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  nome           text not null,
  descricao      text,
  preco_centavos int not null default 0 check (preco_centavos >= 0),
  intervalo      text not null default 'mensal' check (intervalo in ('mensal', 'anual')),
  ativo          boolean not null default true,
  publico        boolean not null default true,  -- aparece para a profissional escolher
  ordem          int not null default 100,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table public.plan_features (
  plan_id    text not null references public.plans(id) on delete cascade,
  recurso    text not null references public.recursos(id) on delete cascade,
  habilitado boolean not null default true,
  limite     int check (limite >= 0),           -- null = sem limite (cotas)
  primary key (plan_id, recurso)
);

create table public.org_feature_overrides (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  recurso    text not null references public.recursos(id) on delete cascade,
  habilitado boolean,                            -- null = segue o plano
  limite     int check (limite >= 0),            -- null = segue o plano
  motivo     text not null,
  criado_por uuid default auth.uid(),
  criado_em  timestamptz not null default now(),
  primary key (org_id, recurso)
);

-- ---------------------------------------------------------------------------
-- Assinaturas e uso
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  org_id                 uuid primary key references public.organizations(id) on delete cascade,
  plan_id                text not null references public.plans(id),
  status                 text not null default 'trial'
                           check (status in ('trial', 'active', 'past_due', 'canceled', 'suspended')),
  trial_ate              date,
  periodo_ate            date,
  inadimplente_desde     date,
  provedor               text,
  provedor_cliente_id    text,
  provedor_assinatura_id text,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create table public.usage_counters (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  metrica    text not null references public.recursos(id) on delete cascade,
  periodo    text not null check (periodo ~ '^\d{4}-\d{2}$'),
  quantidade int not null default 0 check (quantidade >= 0),
  primary key (org_id, metrica, periodo)
);

create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.recursos              enable row level security;
alter table public.plans                 enable row level security;
alter table public.plan_features         enable row level security;
alter table public.org_feature_overrides enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.usage_counters        enable row level security;

-- Catálogo e planos não são segredo: qualquer pessoa logada lê.
create policy "recursos: leitura" on public.recursos for select to authenticated using (true);
create policy "planos: leitura" on public.plans for select to authenticated using (true);
create policy "planos: recursos leitura" on public.plan_features for select to authenticated using (true);
-- Assinatura, exceções e uso: só os membros do consultório leem; ninguém grava
-- direto (admin pelas funções; provedor de cobrança pela chave de serviço).
create policy "assinatura: membros leem" on public.subscriptions
  for select to authenticated using ((select private.is_member(org_id)));
create policy "excecoes: membros leem" on public.org_feature_overrides
  for select to authenticated using ((select private.is_member(org_id)));
create policy "uso: membros leem" on public.usage_counters
  for select to authenticated using ((select private.is_member(org_id)));

revoke all on public.platform_admins, public.admin_audit_log, public.recursos, public.plans,
  public.plan_features, public.org_feature_overrides, public.subscriptions, public.usage_counters
  from anon;

-- ---------------------------------------------------------------------------
-- Dados iniciais (editáveis pelo admin; preços são hipótese, PRD P-2)
-- ---------------------------------------------------------------------------
insert into public.recursos (id, nome, descricao, tipo, ordem) values
  ('agendamento_online', 'Agendamento online', 'Página pública para o paciente marcar horário', 'booleano', 10),
  ('agendamentos_online_mes', 'Agendamentos online por mês', 'Pedidos recebidos pela página pública', 'cota_mensal', 11),
  ('whatsapp_lembretes', 'Lembretes por WhatsApp por mês', 'Mensagens enviadas pelo número da profissional', 'cota_mensal', 20),
  ('google_agenda', 'Google Agenda', 'Sincronização dos atendimentos', 'booleano', 30),
  ('documentos_pdf', 'Documentos em PDF', 'Atestado, declaração e recibo', 'booleano', 40),
  ('api', 'API e webhooks', 'Integração com outros sistemas', 'booleano', 50);

insert into public.plans (id, nome, descricao, preco_centavos, intervalo, publico, ordem) values
  ('teste', 'Teste grátis', '14 dias com todos os recursos', 0, 'mensal', false, 0),
  ('essencial', 'Essencial', 'Agenda, pacientes, prontuário e financeiro', 5900, 'mensal', true, 10),
  ('completo', 'Completo', 'Tudo do Essencial, mais integrações e API', 8900, 'mensal', true, 20);

insert into public.plan_features (plan_id, recurso, habilitado, limite) values
  ('teste', 'agendamento_online', true, null),
  ('teste', 'agendamentos_online_mes', true, 50),
  ('teste', 'whatsapp_lembretes', true, 50),
  ('teste', 'google_agenda', true, null),
  ('teste', 'documentos_pdf', true, null),
  ('teste', 'api', true, null),
  ('essencial', 'agendamento_online', true, null),
  ('essencial', 'agendamentos_online_mes', true, 100),
  ('essencial', 'whatsapp_lembretes', true, 300),
  ('essencial', 'google_agenda', true, null),
  ('essencial', 'documentos_pdf', true, null),
  ('essencial', 'api', false, null),
  ('completo', 'agendamento_online', true, null),
  ('completo', 'agendamentos_online_mes', true, null),
  ('completo', 'whatsapp_lembretes', true, 1000),
  ('completo', 'google_agenda', true, null),
  ('completo', 'documentos_pdf', true, null),
  ('completo', 'api', true, null);

-- Consultórios existentes: assinatura de teste com a data que já tinham.
insert into public.subscriptions (org_id, plan_id, status, trial_ate)
select o.id, 'teste',
       case o.plano when 'cancelado' then 'canceled' when 'solo' then 'active' else 'trial' end,
       coalesce(o.trial_ate, current_date + 14)
from public.organizations o;

-- ---------------------------------------------------------------------------
-- Situação, recursos e cotas
-- ---------------------------------------------------------------------------
-- teste | teste_vencido | ativa | atrasada | bloqueada | suspensa | cancelada | sem_assinatura
create or replace function private.situacao(p_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when s.status = 'suspended' then 'suspensa'
      when s.status = 'canceled' then 'cancelada'
      when s.status = 'trial' and coalesce(s.trial_ate, current_date) >= current_date then 'teste'
      when s.status = 'trial' then 'teste_vencido'
      when s.status = 'active' then 'ativa'
      when s.status = 'past_due' and coalesce(s.inadimplente_desde, current_date) + 7 >= current_date then 'atrasada'
      else 'bloqueada'
    end
    from public.subscriptions s where s.org_id = p_org
  ), 'sem_assinatura');
$$;

-- Grava só quem está em dia (ou dentro da tolerância de 7 dias, D-36).
create or replace function private.pode_escrever(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.situacao(p_org) in ('teste', 'ativa', 'atrasada');
$$;

create or replace function private.tem_recurso(p_org uuid, p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select o.habilitado from public.org_feature_overrides o
      where o.org_id = p_org and o.recurso = p_recurso and o.habilitado is not null),
    (select f.habilitado from public.plan_features f
      join public.subscriptions s on s.plan_id = f.plan_id
      where s.org_id = p_org and f.recurso = p_recurso),
    false
  );
$$;

-- null = sem limite.
create or replace function private.limite_do_recurso(p_org uuid, p_recurso text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select o.limite from public.org_feature_overrides o
      where o.org_id = p_org and o.recurso = p_recurso and o.limite is not null),
    (select f.limite from public.plan_features f
      join public.subscriptions s on s.plan_id = f.plan_id
      where s.org_id = p_org and f.recurso = p_recurso)
  );
$$;

-- Conta um uso do mês (no fuso do consultório). Devolve false sem contar se passar do limite.
create or replace function private.consumir_cota(p_org uuid, p_recurso text, p_quantidade int default 1)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_periodo text := to_char(now() at time zone
    coalesce((select timezone from public.organizations where id = p_org), 'America/Sao_Paulo'), 'YYYY-MM');
  v_limite int;
  v_atual int;
begin
  if not private.tem_recurso(p_org, p_recurso) then
    return false;
  end if;
  v_limite := private.limite_do_recurso(p_org, p_recurso);

  insert into public.usage_counters (org_id, metrica, periodo, quantidade)
  values (p_org, p_recurso, v_periodo, 0)
  on conflict (org_id, metrica, periodo) do nothing;

  select quantidade into v_atual from public.usage_counters
  where org_id = p_org and metrica = p_recurso and periodo = v_periodo
  for update;

  if v_limite is not null and v_atual + p_quantidade > v_limite then
    return false;
  end if;

  update public.usage_counters set quantidade = quantidade + p_quantidade
  where org_id = p_org and metrica = p_recurso and periodo = v_periodo;
  return true;
end;
$$;

revoke execute on function private.is_platform_admin(text[]), private.registrar_admin(text, uuid, text, jsonb),
  private.situacao(uuid), private.pode_escrever(uuid), private.tem_recurso(uuid, text),
  private.limite_do_recurso(uuid, text), private.consumir_cota(uuid, text, int)
  from public, anon;
grant execute on function private.is_platform_admin(text[]), private.situacao(uuid), private.pode_escrever(uuid),
  private.tem_recurso(uuid, text), private.limite_do_recurso(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Modo somente leitura nas políticas de escrita
-- (a auditoria continua gravando: exportar dados é sempre permitido)
-- ---------------------------------------------------------------------------
alter policy "org: owner atualiza" on public.organizations
  using ((select private.has_role(id, array['owner'])) and (select private.pode_escrever(id)))
  with check ((select private.has_role(id, array['owner'])) and (select private.pode_escrever(id)));

alter policy "horarios: owner insere" on public.working_hours
  with check ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)));
alter policy "horarios: owner atualiza" on public.working_hours
  using ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)))
  with check ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)));
alter policy "horarios: owner apaga" on public.working_hours
  using ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)));

alter policy "pacientes: membros inserem" on public.patients
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "pacientes: membros atualizam" on public.patients
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)))
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));

alter policy "pacotes: membros inserem" on public.packages
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "pacotes: membros atualizam" on public.packages
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)))
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "pacotes: membros apagam" on public.packages
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));

alter policy "agenda: membros inserem" on public.appointments
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "agenda: membros atualizam" on public.appointments
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)))
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "agenda: membros apagam" on public.appointments
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));

alter policy "financeiro: inserem" on public.transactions
  with check ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));
alter policy "financeiro: atualizam" on public.transactions
  using ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)))
  with check ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));
alter policy "financeiro: apagam" on public.transactions
  using ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));

alter policy "lembretes: membros inserem" on public.reminders
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));
alter policy "lembretes: membros atualizam" on public.reminders
  using ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)))
  with check ((select private.is_member(org_id)) and (select private.pode_escrever(org_id)));

alter policy "agendamento online: owner insere" on public.booking_settings
  with check ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)));
alter policy "agendamento online: owner atualiza" on public.booking_settings
  using ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)))
  with check ((select private.has_role(org_id, array['owner'])) and (select private.pode_escrever(org_id)));

alter policy "prontuario: inserem" on public.clinical_records
  with check ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));
alter policy "prontuario: anulam" on public.clinical_records
  using ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)))
  with check ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));

alter policy "documentos: inserem" on public.documents
  with check ((select private.has_role(org_id, array['owner','profissional'])) and (select private.pode_escrever(org_id)));

-- ---------------------------------------------------------------------------
-- Colunas antigas de plano saem da organização (agora em subscriptions)
-- ---------------------------------------------------------------------------
create or replace function private.proteger_campos_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.id := old.id;
  end if;
  return new;
end;
$$;

-- Funções públicas que usavam organizations.plano passam a usar a situação e o recurso.
create or replace function public.agenda_publica(p_slug text)
returns table (
  nome text, especialidade text, conselho text, registro text, endereco text,
  telefone text, instagram text, cor text, mensagem text, janela_dias int, fuso text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.nome, s.nome, o.conselho, o.registro, o.endereco,
         o.telefone, o.instagram, o.tema ->> 'cor', b.mensagem, b.janela_dias, o.timezone
  from public.organizations o
  join public.booking_settings b on b.org_id = o.id and b.ativo
  join public.specialty_profiles s on s.id = o.specialty_profile_id
  where o.slug = lower(p_slug)
    and private.pode_escrever(o.id)
    and private.tem_recurso(o.id, 'agendamento_online');
$$;

create or replace function public.horarios_livres(p_slug text, p_de date, p_ate date)
returns table (inicio timestamptz, local text)
language sql
stable
security definer
set search_path = ''
as $$
  with org as (
    select o.id, o.timezone, b.janela_dias, b.antecedencia_min,
           (now() at time zone o.timezone)::date as hoje
    from public.organizations o
    join public.booking_settings b on b.org_id = o.id and b.ativo
    where o.slug = lower(p_slug)
      and private.pode_escrever(o.id)
      and private.tem_recurso(o.id, 'agendamento_online')
  ),
  dias as (
    select org.*, d::date as dia
    from org,
         generate_series(
           greatest(p_de, org.hoje),
           least(p_ate, org.hoje + org.janela_dias, greatest(p_de, org.hoje) + 61),
           interval '1 day'
         ) as d
  ),
  grade as (
    select dias.id, wh.local, wh.duracao_min,
           ((dias.dia + wh.inicio + n * make_interval(mins => wh.duracao_min)) at time zone dias.timezone) as inicio,
           dias.antecedencia_min
    from dias
    join public.working_hours wh on wh.org_id = dias.id and wh.weekday = extract(dow from dias.dia)
    cross join lateral generate_series(
      0, floor(extract(epoch from (wh.fim - wh.inicio)) / 60 / wh.duracao_min)::int - 1
    ) as n
  )
  select g.inicio, g.local
  from grade g
  where g.inicio >= now() + make_interval(mins => g.antecedencia_min)
    and not exists (
      select 1 from public.appointments a
      where a.org_id = g.id
        and a.status <> 'cancelado'
        and a.inicio < g.inicio + make_interval(mins => g.duracao_min)
        and coalesce(a.fim, a.inicio + make_interval(mins => g.duracao_min)) > g.inicio
    )
  order by g.inicio;
$$;

create or replace function public.agendar_online(
  p_slug text,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_consentimento boolean,
  p_obs text default null
)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_fuso text;
  v_local text;
  v_duracao int;
  v_nome text := left(trim(coalesce(p_nome, '')), 120);
  v_telefone text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_dia date;
begin
  select o.id, o.timezone into v_org, v_fuso
  from public.organizations o
  join public.booking_settings b on b.org_id = o.id and b.ativo
  where o.slug = lower(p_slug)
    and private.pode_escrever(o.id)
    and private.tem_recurso(o.id, 'agendamento_online');
  if v_org is null then
    raise exception 'Agendamento online indisponível.' using errcode = 'P0001';
  end if;

  if not coalesce(p_consentimento, false) then
    raise exception 'É preciso autorizar o uso dos dados para agendar.' using errcode = 'P0001';
  end if;
  if length(v_nome) < 2 then
    raise exception 'Informe seu nome.' using errcode = 'P0001';
  end if;
  if length(v_telefone) not between 10 and 13 then
    raise exception 'Informe um WhatsApp com DDD.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_org::text, 0));

  if (select count(*) from public.appointments
      where org_id = v_org and origem = 'online' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitos pedidos agora. Tente de novo mais tarde ou fale com o consultório.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.appointments
      where org_id = v_org and origem = 'online' and contato_telefone = v_telefone
        and inicio > now() and status in ('agendado', 'confirmado')) >= 2 then
    raise exception 'Você já tem horários marcados. Para outro, fale com o consultório.' using errcode = 'P0001';
  end if;

  v_dia := (p_inicio at time zone v_fuso)::date;
  select h.local into v_local from public.horarios_livres(p_slug, v_dia, v_dia) h where h.inicio = p_inicio;
  if v_local is null then
    raise exception 'Esse horário não está mais disponível. Escolha outro.' using errcode = 'P0001';
  end if;

  -- Cota do plano por último: só conta pedido que de fato vai ser gravado.
  if not private.consumir_cota(v_org, 'agendamentos_online_mes') then
    raise exception 'O consultório não está recebendo pedidos online agora. Fale direto com ele.' using errcode = 'P0001';
  end if;

  select wh.duracao_min into v_duracao from public.working_hours wh where wh.org_id = v_org limit 1;

  insert into public.appointments
    (org_id, descricao_avulsa, inicio, fim, local, status, origem, obs,
     contato_telefone, consentimento_em, consentimento_versao)
  values
    (v_org, v_nome, p_inicio, p_inicio + make_interval(mins => coalesce(v_duracao, 50)), v_local, 'agendado', 'online',
     nullif(left(trim(coalesce(p_obs, '')), 300), ''), v_telefone, now(), 'v1');

  return p_inicio;
end;
$$;

alter table public.organizations drop column plano, drop column trial_ate;

-- Novo consultório nasce com o teste grátis de 14 dias.
create or replace function public.criar_organizacao(
  p_nome text,
  p_slug text,
  p_especialidade text,
  p_conselho text default null,
  p_registro text default null,
  p_telefone text default null,
  p_endereco text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'É preciso estar logado.' using errcode = '42501';
  end if;

  if exists (select 1 from public.memberships where user_id = v_uid and role = 'owner') then
    raise exception 'Você já tem um consultório cadastrado.' using errcode = 'P0001';
  end if;

  insert into public.organizations (nome, slug, specialty_profile_id, conselho, registro, telefone, endereco)
  values (
    trim(p_nome),
    lower(trim(p_slug)),
    p_especialidade,
    coalesce(p_conselho, (select conselho from public.specialty_profiles where id = p_especialidade)),
    p_registro,
    p_telefone,
    p_endereco
  )
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.booking_settings (org_id) values (v_org);
  insert into public.subscriptions (org_id, plan_id, status, trial_ate) values (v_org, 'teste', 'trial', current_date + 14);

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- Para a profissional: situação e recursos do próprio consultório
-- ---------------------------------------------------------------------------
create or replace function public.minha_assinatura(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_periodo text;
begin
  if not private.is_member(p_org) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  v_periodo := to_char(now() at time zone
    coalesce((select timezone from public.organizations where id = p_org), 'America/Sao_Paulo'), 'YYYY-MM');

  return (
    select jsonb_build_object(
      'situacao', private.situacao(p_org),
      'pode_escrever', private.pode_escrever(p_org),
      'plano', p.nome,
      'plano_id', p.id,
      'trial_ate', s.trial_ate,
      'periodo_ate', s.periodo_ate,
      'inadimplente_desde', s.inadimplente_desde,
      'recursos', (
        select coalesce(jsonb_object_agg(r.id, jsonb_build_object(
          'habilitado', private.tem_recurso(p_org, r.id),
          'limite', private.limite_do_recurso(p_org, r.id),
          'usado', coalesce((select u.quantidade from public.usage_counters u
                             where u.org_id = p_org and u.metrica = r.id and u.periodo = v_periodo), 0)
        )), '{}'::jsonb)
        from public.recursos r
      )
    )
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.org_id = p_org
  );
end;
$$;

revoke execute on function public.minha_assinatura(uuid) from public, anon;
grant execute on function public.minha_assinatura(uuid) to authenticated;
