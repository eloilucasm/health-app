-- Ajustes da Fase 1 encontrados nos testes:
-- 1) O gatilho private.set_updated_at grava em "updated_at"; as tabelas novas usavam
--    "atualizado_em", e qualquer alteração em planos e assinaturas falhava.
-- 2) A consulta ao detalhe do cliente passa a ser registrada antes de montar o
--    histórico, para aparecer nele.

alter table public.plans rename column atualizado_em to updated_at;
alter table public.subscriptions rename column atualizado_em to updated_at;

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
  perform private.registrar_admin('ver_cliente', p_org, null, null);
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
    'historico', (select coalesce(jsonb_agg(h order by h.em desc, h.id desc), '[]'::jsonb) from (
                    select l.id, l.acao, l.motivo, l.detalhes, l.em, u.email as admin
                    from public.admin_audit_log l left join auth.users u on u.id = l.admin_id
                    where l.org_id = o.id order by l.em desc, l.id desc limit 20) h)
  ) into v
  from public.organizations o
  join public.specialty_profiles sp on sp.id = o.specialty_profile_id
  where o.id = p_org;

  return v;
end;
$$;
