-- =============================================================================
-- Agendamento online (Sessão 6, Dia 6): RF-13
--
-- O visitante (anon) não lê nenhuma tabela. Só chama três funções
-- security definer, que devolvem o mínimo:
--   * agenda_publica:   perfil público do consultório, se o agendamento estiver ligado;
--   * horarios_livres:  só os horários (sem nada sobre outros atendimentos);
--   * agendar_online:   confere o horário de novo, com trava, e grava.
-- =============================================================================

alter table public.appointments
  add column contato_telefone text check (contato_telefone is null or contato_telefone ~ '^\d{10,13}$'),
  add column consentimento_em timestamptz,
  add column consentimento_versao text;

create index appointments_online_idx on public.appointments (org_id, created_at) where origem = 'online';

-- ---- Perfil público ----------------------------------------------------------

create or replace function public.agenda_publica(p_slug text)
returns table (
  nome text, especialidade text, conselho text, registro text, endereco text,
  telefone text, instagram text, cor text, mensagem text, janela_dias int
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.nome, s.nome, o.conselho, o.registro, o.endereco,
         o.telefone, o.instagram, o.tema ->> 'cor', b.mensagem, b.janela_dias
  from public.organizations o
  join public.booking_settings b on b.org_id = o.id and b.ativo
  join public.specialty_profiles s on s.id = o.specialty_profile_id
  where o.slug = lower(p_slug) and o.plano <> 'cancelado';
$$;

-- ---- Horários livres -----------------------------------------------------------

-- Grade de cada período (início + n × duração) menos o que já está ocupado,
-- dentro da janela e respeitando a antecedência mínima. Máximo de 62 dias por consulta.
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
    where o.slug = lower(p_slug) and o.plano <> 'cancelado'
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

-- ---- Agendar -------------------------------------------------------------------

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
  where o.slug = lower(p_slug) and o.plano <> 'cancelado';
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

  -- Uma reserva por vez por consultório: o horário não pode ser tomado entre a conferência e a gravação.
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

revoke execute on function public.agenda_publica(text) from public;
revoke execute on function public.horarios_livres(text, date, date) from public;
revoke execute on function public.agendar_online(text, timestamptz, text, text, boolean, text) from public;
grant execute on function public.agenda_publica(text) to anon, authenticated;
grant execute on function public.horarios_livres(text, date, date) to anon, authenticated;
grant execute on function public.agendar_online(text, timestamptz, text, text, boolean, text) to anon, authenticated;
