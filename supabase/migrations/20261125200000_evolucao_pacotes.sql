-- =============================================================================
-- Evolução das sessões e pacotes (Sessão 4, Dia 4): RF-07, RF-08
-- =============================================================================

-- ---- Integridade ------------------------------------------------------------

-- O pacote de um atendimento tem de ser do mesmo paciente.
alter table public.packages add constraint packages_org_patient_id_key unique (org_id, patient_id, id);

alter table public.appointments
  drop constraint appointments_org_id_package_id_fkey,
  add constraint appointments_pacote_do_paciente
    foreign key (org_id, patient_id, package_id) references public.packages (org_id, patient_id, id)
    on delete set null (package_id),
  add constraint appointments_pacote_exige_paciente check (package_id is null or patient_id is not null);

-- Evolução ligada a um atendimento tem de ser do paciente daquele atendimento.
-- security definer: a verificação não pode depender do que o papel consegue ler.
create or replace function private.prontuario_atendimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id = new.appointment_id and a.org_id = new.org_id and a.patient_id = new.patient_id
  ) then
    raise exception 'O atendimento não é deste paciente.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger clinical_records_atendimento
  before insert on public.clinical_records
  for each row execute function private.prontuario_atendimento();

-- E o atendimento não pode trocar de paciente depois de ter registro.
create or replace function private.atendimento_com_prontuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.patient_id is distinct from old.patient_id
     and exists (select 1 from public.clinical_records r where r.appointment_id = old.id) then
    raise exception 'Este atendimento tem registro no prontuário: o paciente não pode ser trocado.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger appointments_com_prontuario
  before update of patient_id on public.appointments
  for each row execute function private.atendimento_com_prontuario();

-- ---- Uso dos pacotes ---------------------------------------------------------

-- Conta no banco, para não depender do limite de linhas de uma consulta.
create view public.pacotes_com_uso
with (security_invoker = true) as
select p.*,
       (select count(*) from public.appointments a
         where a.package_id = p.id and a.status = 'realizado')::int as realizadas
from public.packages p;

revoke all on public.pacotes_com_uso from anon;

-- Cria o pacote e vincula a ele os próximos atendimentos em aberto do paciente,
-- só até o número de sessões que restam.
create or replace function public.criar_pacote(
  p_org uuid,
  p_paciente uuid,
  p_total smallint,
  p_usadas_antes smallint,
  p_valor_centavos bigint,
  p_inicio date,
  p_obs text,
  p_desde timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.packages (org_id, patient_id, total, usadas_antes, valor_centavos, inicio, obs)
  values (p_org, p_paciente, p_total, p_usadas_antes, p_valor_centavos, p_inicio, p_obs)
  returning id into v_id;

  update public.appointments set package_id = v_id
  where id in (
    select a.id from public.appointments a
    where a.org_id = p_org and a.patient_id = p_paciente and a.package_id is null
      and a.status in ('agendado', 'confirmado') and a.inicio >= p_desde
    order by a.inicio
    limit greatest(p_total - p_usadas_antes, 0)
  );

  return v_id;
end;
$$;
revoke execute on function public.criar_pacote(uuid, uuid, smallint, smallint, bigint, date, text, timestamptz) from anon, public;
grant execute on function public.criar_pacote(uuid, uuid, smallint, smallint, bigint, date, text, timestamptz) to authenticated;

-- ---- Salvar evolução ----------------------------------------------------------

-- Nova evolução (p_grupo nulo) ou nova versão de uma existente. Na primeira
-- versão, marca o atendimento como realizado, na mesma transação.
create or replace function public.salvar_evolucao(
  p_org uuid,
  p_paciente uuid,
  p_atendimento uuid,
  p_data date,
  p_conteudo jsonb,
  p_schema_version int,
  p_grupo uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_anterior public.clinical_records;
  v_grupo uuid := coalesce(p_grupo, gen_random_uuid());
  v_versao int := 1;
  v_atendimento uuid := p_atendimento;
begin
  if p_grupo is not null then
    select * into v_anterior from public.clinical_records
    where org_id = p_org and grupo_id = p_grupo and tipo = 'evolucao'
    order by versao desc limit 1;
    if not found or v_anterior.patient_id <> p_paciente then
      raise exception 'Evolução não encontrada.' using errcode = 'P0001';
    end if;
    v_versao := v_anterior.versao + 1;
    v_atendimento := v_anterior.appointment_id;
  end if;

  insert into public.clinical_records
    (org_id, patient_id, appointment_id, tipo, data, grupo_id, versao, schema_version, conteudo)
  values
    (p_org, p_paciente, v_atendimento, 'evolucao', p_data, v_grupo, v_versao, p_schema_version, p_conteudo);

  if p_grupo is null and v_atendimento is not null then
    update public.appointments set status = 'realizado' where org_id = p_org and id = v_atendimento;
  end if;

  return v_grupo;
end;
$$;
revoke execute on function public.salvar_evolucao(uuid, uuid, uuid, date, jsonb, int, uuid) from anon, public;
grant execute on function public.salvar_evolucao(uuid, uuid, uuid, date, jsonb, int, uuid) to authenticated;
