-- =============================================================================
-- Segurança: Row Level Security, funções de acesso e proteções (Sessão 1, Dia 1)
-- RNF-01: uma organização nunca lê nem grava dados de outra.
-- RNF-05: prontuário só aceita inclusão (versões) e anulação única.
--
-- Modelo de acesso:
--   * Toda leitura/escrita exige vínculo (memberships) com a org da linha.
--   * Chaves estrangeiras compostas (org_id, id) já impedem vínculos entre orgs.
--   * Organização e primeiro vínculo nascem juntos via public.criar_organizacao().
--   * Prontuário e documentos: só owner e profissional (recepção não vê).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções de verificação de acesso (security definer: leem memberships sem
-- depender das políticas de memberships, evitando recursão).
-- -----------------------------------------------------------------------------
create or replace function private.is_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_role(p_org uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, text[]) to authenticated;
revoke execute on function private.is_member(uuid) from anon, public;
revoke execute on function private.has_role(uuid, text[]) from anon, public;

-- -----------------------------------------------------------------------------
-- Ligar RLS em tudo
-- -----------------------------------------------------------------------------
alter table public.specialty_profiles enable row level security;
alter table public.organizations      enable row level security;
alter table public.memberships        enable row level security;
alter table public.working_hours      enable row level security;
alter table public.patients           enable row level security;
alter table public.packages           enable row level security;
alter table public.appointments       enable row level security;
alter table public.clinical_records   enable row level security;
alter table public.transactions       enable row level security;
alter table public.documents          enable row level security;
alter table public.reminders          enable row level security;
alter table public.booking_settings   enable row level security;
alter table public.audit_log          enable row level security;

-- Visitante anônimo não acessa nenhuma tabela diretamente. A página pública de
-- agendamento (Dia 6) usará funções específicas.
revoke all on all tables in schema public from anon;

-- -----------------------------------------------------------------------------
-- Especialidades: leitura para quem está logado
-- -----------------------------------------------------------------------------
create policy "especialidades: leitura" on public.specialty_profiles
  for select to authenticated using (ativo);

-- -----------------------------------------------------------------------------
-- Organizações
-- -----------------------------------------------------------------------------
create policy "org: membros leem" on public.organizations
  for select to authenticated using ((select private.is_member(id)));
create policy "org: owner atualiza" on public.organizations
  for update to authenticated
  using ((select private.has_role(id, array['owner'])))
  with check ((select private.has_role(id, array['owner'])));
-- Sem insert/delete direto: criação via criar_organizacao().

-- Campos de cobrança só mudam pelo servidor (service_role), nunca pela profissional.
create or replace function private.proteger_campos_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plano     := old.plano;
    new.trial_ate := old.trial_ate;
    new.id        := old.id;
  end if;
  return new;
end;
$$;
create trigger organizations_proteger_campos before update on public.organizations
  for each row execute function private.proteger_campos_org();

-- -----------------------------------------------------------------------------
-- Vínculos: cada um vê os vínculos das suas orgs; alterações só via funções
-- -----------------------------------------------------------------------------
create policy "vinculos: membros leem" on public.memberships
  for select to authenticated using ((select private.is_member(org_id)));

-- -----------------------------------------------------------------------------
-- Tabelas operacionais: membro da org lê e grava
-- -----------------------------------------------------------------------------
-- working_hours
create policy "horarios: membros leem" on public.working_hours
  for select to authenticated using ((select private.is_member(org_id)));
create policy "horarios: owner insere" on public.working_hours
  for insert to authenticated with check ((select private.has_role(org_id, array['owner'])));
create policy "horarios: owner atualiza" on public.working_hours
  for update to authenticated
  using ((select private.has_role(org_id, array['owner'])))
  with check ((select private.has_role(org_id, array['owner'])));
create policy "horarios: owner apaga" on public.working_hours
  for delete to authenticated using ((select private.has_role(org_id, array['owner'])));

-- patients (sem delete: exclusão lógica por deleted_at)
create policy "pacientes: membros leem" on public.patients
  for select to authenticated using ((select private.is_member(org_id)));
create policy "pacientes: membros inserem" on public.patients
  for insert to authenticated with check ((select private.is_member(org_id)));
create policy "pacientes: membros atualizam" on public.patients
  for update to authenticated
  using ((select private.is_member(org_id)))
  with check ((select private.is_member(org_id)));

-- packages
create policy "pacotes: membros leem" on public.packages
  for select to authenticated using ((select private.is_member(org_id)));
create policy "pacotes: membros inserem" on public.packages
  for insert to authenticated with check ((select private.is_member(org_id)));
create policy "pacotes: membros atualizam" on public.packages
  for update to authenticated
  using ((select private.is_member(org_id)))
  with check ((select private.is_member(org_id)));
create policy "pacotes: membros apagam" on public.packages
  for delete to authenticated using ((select private.is_member(org_id)));

-- appointments
create policy "agenda: membros leem" on public.appointments
  for select to authenticated using ((select private.is_member(org_id)));
create policy "agenda: membros inserem" on public.appointments
  for insert to authenticated with check ((select private.is_member(org_id)));
create policy "agenda: membros atualizam" on public.appointments
  for update to authenticated
  using ((select private.is_member(org_id)))
  with check ((select private.is_member(org_id)));
create policy "agenda: membros apagam" on public.appointments
  for delete to authenticated using ((select private.is_member(org_id)));

-- transactions (financeiro: owner e profissional; recepção não vê)
create policy "financeiro: leem" on public.transactions
  for select to authenticated using ((select private.has_role(org_id, array['owner','profissional'])));
create policy "financeiro: inserem" on public.transactions
  for insert to authenticated with check ((select private.has_role(org_id, array['owner','profissional'])));
create policy "financeiro: atualizam" on public.transactions
  for update to authenticated
  using ((select private.has_role(org_id, array['owner','profissional'])))
  with check ((select private.has_role(org_id, array['owner','profissional'])));
create policy "financeiro: apagam" on public.transactions
  for delete to authenticated using ((select private.has_role(org_id, array['owner','profissional'])));

-- reminders (envio e atualização de status são feitos pelo servidor; aqui só leitura e
-- inserção pelo plano B de link do WhatsApp)
create policy "lembretes: membros leem" on public.reminders
  for select to authenticated using ((select private.is_member(org_id)));
create policy "lembretes: membros inserem" on public.reminders
  for insert to authenticated with check ((select private.is_member(org_id)));
create policy "lembretes: membros atualizam" on public.reminders
  for update to authenticated
  using ((select private.is_member(org_id)))
  with check ((select private.is_member(org_id)));

-- booking_settings
create policy "agendamento online: membros leem" on public.booking_settings
  for select to authenticated using ((select private.is_member(org_id)));
create policy "agendamento online: owner insere" on public.booking_settings
  for insert to authenticated with check ((select private.has_role(org_id, array['owner'])));
create policy "agendamento online: owner atualiza" on public.booking_settings
  for update to authenticated
  using ((select private.has_role(org_id, array['owner'])))
  with check ((select private.has_role(org_id, array['owner'])));

-- -----------------------------------------------------------------------------
-- Prontuário e documentos: owner e profissional; sem delete
-- -----------------------------------------------------------------------------
create policy "prontuario: leem" on public.clinical_records
  for select to authenticated using ((select private.has_role(org_id, array['owner','profissional'])));
create policy "prontuario: inserem" on public.clinical_records
  for insert to authenticated with check ((select private.has_role(org_id, array['owner','profissional'])));
create policy "prontuario: anulam" on public.clinical_records
  for update to authenticated
  using ((select private.has_role(org_id, array['owner','profissional'])))
  with check ((select private.has_role(org_id, array['owner','profissional'])));

create policy "documentos: leem" on public.documents
  for select to authenticated using ((select private.has_role(org_id, array['owner','profissional'])));
create policy "documentos: inserem" on public.documents
  for insert to authenticated with check ((select private.has_role(org_id, array['owner','profissional'])));

-- Prontuário imutável: UPDATE só pode preencher a anulação uma vez; DELETE nunca.
create or replace function private.prontuario_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Registros de prontuário não podem ser apagados; use a anulação.'
      using errcode = 'P0001';
  end if;

  if old.anulado_em is not null then
    raise exception 'Este registro de prontuário já foi anulado.' using errcode = 'P0001';
  end if;

  if new.anulado_em is null
     or (to_jsonb(new) - array['anulado_em','anulado_por','anulado_motivo'])
        is distinct from (to_jsonb(old) - array['anulado_em','anulado_por','anulado_motivo']) then
    raise exception 'Registros de prontuário não podem ser editados; crie uma nova versão.'
      using errcode = 'P0001';
  end if;

  new.anulado_por := (select auth.uid());
  return new;
end;
$$;
create trigger clinical_records_imutavel
  before update or delete on public.clinical_records
  for each row execute function private.prontuario_imutavel();

-- Nova versão precisa continuar o mesmo grupo, na mesma org e para o mesmo paciente.
create or replace function private.prontuario_versao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_anterior public.clinical_records;
begin
  new.autor_id := coalesce((select auth.uid()), new.autor_id);
  new.anulado_em := null;
  new.anulado_por := null;
  new.anulado_motivo := null;

  if new.versao > 1 then
    select * into v_anterior
    from public.clinical_records
    where grupo_id = new.grupo_id and versao = new.versao - 1;

    if not found
       or v_anterior.org_id <> new.org_id
       or v_anterior.patient_id <> new.patient_id
       or v_anterior.tipo <> new.tipo then
      raise exception 'Versão de prontuário inválida.' using errcode = 'P0001';
    end if;
    if v_anterior.anulado_em is not null then
      raise exception 'Não é possível versionar um registro anulado.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger clinical_records_versao
  before insert on public.clinical_records
  for each row execute function private.prontuario_versao();

-- -----------------------------------------------------------------------------
-- Auditoria: somente inclusão; leitura pelo owner
-- -----------------------------------------------------------------------------
create policy "auditoria: owner le" on public.audit_log
  for select to authenticated using ((select private.has_role(org_id, array['owner'])));
create policy "auditoria: membros registram" on public.audit_log
  for insert to authenticated
  with check ((select private.is_member(org_id)) and user_id = (select auth.uid()));

-- Pacientes: impedir DELETE físico mesmo para quem contorna as políticas.
create or replace function private.bloquear_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Exclusão física não permitida em %; use exclusão lógica.', tg_table_name
    using errcode = 'P0001';
end;
$$;
create trigger patients_sem_delete before delete on public.patients
  for each row execute function private.bloquear_delete();
create trigger audit_log_sem_delete before delete or update on public.audit_log
  for each row execute function private.bloquear_delete();
create trigger documents_sem_delete before delete on public.documents
  for each row execute function private.bloquear_delete();

-- -----------------------------------------------------------------------------
-- Criação da organização (onboarding, RF-02): org + vínculo owner + agendamento
-- online desligado, numa única transação.
-- -----------------------------------------------------------------------------
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

  -- MVP: uma organização por profissional (como owner).
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

  return v_org;
end;
$$;

revoke execute on function public.criar_organizacao(text, text, text, text, text, text, text) from anon, public;
grant execute on function public.criar_organizacao(text, text, text, text, text, text, text) to authenticated;
