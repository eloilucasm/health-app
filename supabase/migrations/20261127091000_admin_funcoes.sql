-- =============================================================================
-- Funções do painel administrativo (Fase 1): RF-21, RF-22, RF-23
--
-- Regras:
--   * Toda função exige private.is_platform_admin() (cadastro + aal2).
--     Leitura: admin ou suporte. Alteração: só admin, com motivo, e auditada.
--   * Só devolvem conta, assinatura e uso em números. Nunca nome de paciente,
--     agenda, evolução, valores financeiros ou qualquer conteúdo clínico (D-27).
-- =============================================================================

create or replace function private.exigir_admin(p_papeis text[] default array['admin', 'suporte'])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin(p_papeis) then
    raise exception 'Acesso restrito à administração da plataforma.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.exigir_motivo(p_motivo text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Informe o motivo (pelo menos 5 letras).' using errcode = 'P0001';
  end if;
  return left(trim(p_motivo), 300);
end;
$$;

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create or replace function public.admin_listar_clientes(
  p_busca text default null,
  p_situacao text default null,
  p_plano text default null,
  p_limite int default 50,
  p_deslocamento int default 0
)
returns table (
  org_id uuid, nome text, slug text, especialidade text, dona_email text,
  plano text, situacao text, trial_ate date, criado_em timestamptz, ultimo_acesso timestamptz,
  atendimentos_30d int, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin();
  return query
  with base as (
    select o.id, o.nome, o.slug, sp.nome as especialidade, u.email::text as dona_email,
           s.plan_id, private.situacao(o.id) as situacao, s.trial_ate, o.created_at, u.last_sign_in_at
    from public.organizations o
    join public.specialty_profiles sp on sp.id = o.specialty_profile_id
    left join public.subscriptions s on s.org_id = o.id
    left join public.memberships m on m.org_id = o.id and m.role = 'owner'
    left join auth.users u on u.id = m.user_id
  ),
  filtrado as (
    select * from base b
    where (p_busca is null or b.nome ilike '%' || p_busca || '%' or b.slug ilike '%' || p_busca || '%'
           or b.dona_email ilike '%' || p_busca || '%')
      and (p_situacao is null or b.situacao = p_situacao)
      and (p_plano is null or b.plan_id = p_plano)
  )
  select f.id, f.nome, f.slug, f.especialidade, f.dona_email, f.plan_id, f.situacao, f.trial_ate,
         f.created_at, f.last_sign_in_at,
         (select count(*)::int from public.appointments a
           where a.org_id = f.id and a.inicio > now() - interval '30 days' and a.inicio <= now()),
         count(*) over ()
  from filtrado f
  order by f.created_at desc
  limit least(greatest(p_limite, 1), 200) offset greatest(p_deslocamento, 0);
end;
$$;

create or replace function public.admin_detalhe_cliente(p_org uuid)
returns jsonb
language plpgsql
volatile -- grava a consulta na auditoria
security definer
set search_path = ''
as $$
declare
  v jsonb;
  v_periodo text;
begin
  perform private.exigir_admin();
  if not exists (select 1 from public.organizations where id = p_org) then
    raise exception 'Cliente não encontrado.' using errcode = 'P0001';
  end if;
  v_periodo := to_char(now() at time zone
    (select timezone from public.organizations where id = p_org), 'YYYY-MM');

  select jsonb_build_object(
    'org', jsonb_build_object(
      'id', o.id, 'nome', o.nome, 'slug', o.slug, 'especialidade', sp.nome,
      'conselho', o.conselho, 'registro', o.registro, 'telefone', o.telefone,
      'timezone', o.timezone, 'criado_em', o.created_at),
    'dona', (select jsonb_build_object('email', u.email, 'ultimo_acesso', u.last_sign_in_at, 'criada_em', u.created_at)
             from public.memberships m join auth.users u on u.id = m.user_id
             where m.org_id = o.id and m.role = 'owner' limit 1),
    'assinatura', (select jsonb_build_object(
                     'plano_id', s.plan_id, 'status', s.status, 'situacao', private.situacao(o.id),
                     'trial_ate', s.trial_ate, 'periodo_ate', s.periodo_ate,
                     'inadimplente_desde', s.inadimplente_desde, 'provedor', s.provedor)
                   from public.subscriptions s where s.org_id = o.id),
    -- Uso só em contagens (D-27).
    'uso', jsonb_build_object(
      'pacientes_ativos', (select count(*) from public.patients p where p.org_id = o.id and p.deleted_at is null),
      'atendimentos_30d', (select count(*) from public.appointments a
                            where a.org_id = o.id and a.inicio > now() - interval '30 days' and a.inicio <= now()),
      'evolucoes_30d', (select count(*) from public.clinical_records r
                         where r.org_id = o.id and r.created_at > now() - interval '30 days'),
      'agendamento_online_ligado', (select b.ativo from public.booking_settings b where b.org_id = o.id),
      'cotas_do_mes', (select coalesce(jsonb_object_agg(u.metrica, u.quantidade), '{}'::jsonb)
                        from public.usage_counters u where u.org_id = o.id and u.periodo = v_periodo)),
    'recursos', (select jsonb_agg(jsonb_build_object(
                   'id', r.id, 'nome', r.nome, 'tipo', r.tipo,
                   'habilitado', private.tem_recurso(o.id, r.id),
                   'limite', private.limite_do_recurso(o.id, r.id),
                   'excecao', (select jsonb_build_object('habilitado', x.habilitado, 'limite', x.limite, 'motivo', x.motivo)
                               from public.org_feature_overrides x where x.org_id = o.id and x.recurso = r.id))
                   order by r.ordem)
                 from public.recursos r),
    'historico', (select coalesce(jsonb_agg(h order by h.em desc), '[]'::jsonb) from (
                    select l.acao, l.motivo, l.detalhes, l.em, u.email as admin
                    from public.admin_audit_log l left join auth.users u on u.id = l.admin_id
                    where l.org_id = o.id order by l.em desc limit 20) h)
  ) into v
  from public.organizations o
  join public.specialty_profiles sp on sp.id = o.specialty_profile_id
  where o.id = p_org;

  perform private.registrar_admin('ver_cliente', p_org, null, null);
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ações sobre a assinatura (só admin, com motivo, auditadas)
-- ---------------------------------------------------------------------------
create or replace function public.admin_estender_teste(p_org uuid, p_dias int, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
begin
  perform private.exigir_admin(array['admin']);
  v_motivo := private.exigir_motivo(p_motivo);
  if p_dias not between 1 and 90 then
    raise exception 'Estenda entre 1 e 90 dias.' using errcode = 'P0001';
  end if;
  update public.subscriptions
  set status = 'trial', trial_ate = greatest(coalesce(trial_ate, current_date), current_date) + p_dias
  where org_id = p_org and status in ('trial');
  if not found then
    raise exception 'Só é possível estender quem está em teste.' using errcode = 'P0001';
  end if;
  perform private.registrar_admin('estender_teste', p_org, v_motivo, jsonb_build_object('dias', p_dias));
end;
$$;

create or replace function public.admin_trocar_plano(p_org uuid, p_plano text, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_anterior text;
begin
  perform private.exigir_admin(array['admin']);
  v_motivo := private.exigir_motivo(p_motivo);
  if not exists (select 1 from public.plans where id = p_plano and ativo) then
    raise exception 'Plano inexistente ou inativo.' using errcode = 'P0001';
  end if;
  select plan_id into v_anterior from public.subscriptions where org_id = p_org for update;
  if not found then
    raise exception 'Cliente sem assinatura.' using errcode = 'P0001';
  end if;
  update public.subscriptions set plan_id = p_plano where org_id = p_org;
  perform private.registrar_admin('trocar_plano', p_org, v_motivo,
    jsonb_build_object('de', v_anterior, 'para', p_plano));
end;
$$;

create or replace function public.admin_definir_status(p_org uuid, p_status text, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_anterior text;
begin
  perform private.exigir_admin(array['admin']);
  v_motivo := private.exigir_motivo(p_motivo);
  if p_status not in ('active', 'suspended', 'canceled', 'trial') then
    raise exception 'Situação inválida.' using errcode = 'P0001';
  end if;
  select status into v_anterior from public.subscriptions where org_id = p_org for update;
  if not found then
    raise exception 'Cliente sem assinatura.' using errcode = 'P0001';
  end if;
  update public.subscriptions
  set status = p_status,
      inadimplente_desde = case when p_status = 'active' then null else inadimplente_desde end,
      trial_ate = case when p_status = 'trial' then greatest(coalesce(trial_ate, current_date), current_date + 7) else trial_ate end
  where org_id = p_org;
  perform private.registrar_admin('definir_status', p_org, v_motivo,
    jsonb_build_object('de', v_anterior, 'para', p_status));
end;
$$;

-- ---------------------------------------------------------------------------
-- Planos, recursos e exceções
-- ---------------------------------------------------------------------------
-- p_recursos: [{ "recurso": "api", "habilitado": true, "limite": null }, ...]
create or replace function public.admin_salvar_plano(
  p_id text, p_nome text, p_descricao text, p_preco_centavos int, p_intervalo text,
  p_ativo boolean, p_publico boolean, p_ordem int, p_recursos jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin(array['admin']);
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe o nome do plano.' using errcode = 'P0001';
  end if;

  insert into public.plans as p (id, nome, descricao, preco_centavos, intervalo, ativo, publico, ordem)
  values (p_id, trim(p_nome), nullif(trim(coalesce(p_descricao, '')), ''), p_preco_centavos, p_intervalo,
          p_ativo, p_publico, coalesce(p_ordem, 100))
  on conflict (id) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco_centavos = excluded.preco_centavos,
    intervalo = excluded.intervalo, ativo = excluded.ativo, publico = excluded.publico, ordem = excluded.ordem;

  insert into public.plan_features (plan_id, recurso, habilitado, limite)
  select p_id, x.recurso, coalesce(x.habilitado, false), x.limite
  from jsonb_to_recordset(coalesce(p_recursos, '[]'::jsonb)) as x(recurso text, habilitado boolean, limite int)
  on conflict (plan_id, recurso) do update set habilitado = excluded.habilitado, limite = excluded.limite;

  perform private.registrar_admin('salvar_plano', null, null,
    jsonb_build_object('plano', p_id, 'preco_centavos', p_preco_centavos, 'recursos', p_recursos));
end;
$$;

create or replace function public.admin_definir_excecao(
  p_org uuid, p_recurso text, p_habilitado boolean, p_limite int, p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
begin
  perform private.exigir_admin(array['admin']);
  v_motivo := private.exigir_motivo(p_motivo);
  if p_habilitado is null and p_limite is null then
    delete from public.org_feature_overrides where org_id = p_org and recurso = p_recurso;
  else
    insert into public.org_feature_overrides (org_id, recurso, habilitado, limite, motivo)
    values (p_org, p_recurso, p_habilitado, p_limite, v_motivo)
    on conflict (org_id, recurso) do update
      set habilitado = excluded.habilitado, limite = excluded.limite, motivo = excluded.motivo,
          criado_por = auth.uid(), criado_em = now();
  end if;
  perform private.registrar_admin('definir_excecao', p_org, v_motivo,
    jsonb_build_object('recurso', p_recurso, 'habilitado', p_habilitado, 'limite', p_limite));
end;
$$;

-- Todas as funções do admin: nada para visitantes; o próprio corpo confere o papel.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_listar_clientes(text, text, text, int, int)',
    'public.admin_detalhe_cliente(uuid)',
    'public.admin_estender_teste(uuid, int, text)',
    'public.admin_trocar_plano(uuid, text, text)',
    'public.admin_definir_status(uuid, text, text)',
    'public.admin_salvar_plano(text, text, text, int, text, boolean, boolean, int, jsonb)',
    'public.admin_definir_excecao(uuid, text, boolean, int, text)',
    'private.exigir_admin(text[])',
    'private.exigir_motivo(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
