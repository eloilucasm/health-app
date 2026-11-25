-- =============================================================================
-- Onboarding e ajustes do consultório (Sessão 2, Dia 2): RF-02, RF-03
-- =============================================================================

-- Endereços que colidem com rotas do app não podem ser usados em /{slug}.
alter table public.organizations
  add constraint organizations_slug_reservado check (
    slug not in ('login', 'auth', 'onboarding', 'config', 'agenda', 'pacientes', 'pacotes',
                 'financeiro', 'hoje', 'api', 'admin', 'app', 'icons', 'termos', 'privacidade')
  );

-- A cor vai para o CSS das páginas (inclusive a pública): só hexadecimal.
alter table public.organizations
  add constraint organizations_tema_cor check (
    tema ->> 'cor' is null or tema ->> 'cor' ~ '^#[0-9a-fA-F]{6}$'
  );

-- Troca todos os horários de uma vez, numa única transação.
-- security invoker: as políticas RLS de working_hours continuam valendo.
create or replace function public.salvar_horarios(p_org uuid, p_horarios jsonb, p_duracao smallint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.has_role(p_org, array['owner']) then
    raise exception 'Sem permissão para alterar os horários.' using errcode = '42501';
  end if;

  delete from public.working_hours where org_id = p_org;

  insert into public.working_hours (org_id, weekday, inicio, fim, duracao_min, local)
  select p_org, h.weekday, h.inicio, h.fim, p_duracao, h.local
  from jsonb_to_recordset(p_horarios) as h(weekday smallint, inicio time, fim time, local text);
end;
$$;

revoke execute on function public.salvar_horarios(uuid, jsonb, smallint) from anon, public;
grant execute on function public.salvar_horarios(uuid, jsonb, smallint) to authenticated;
