-- =============================================================================
-- Financeiro e importação do backup (Sessão 5, Dia 5): RF-10, RF-11
-- =============================================================================

-- Totais por mês, calculados no banco (saldo acumulado não depende de limite de linhas).
create view public.financeiro_mensal
with (security_invoker = true) as
select org_id, to_char(data, 'YYYY-MM') as mes, tipo, status, sum(valor_centavos)::bigint as total
from public.transactions
group by org_id, to_char(data, 'YYYY-MM'), tipo, status;

revoke all on public.financeiro_mensal from anon;

-- Importa um backup já validado e normalizado pelo app (src/domain/importacao.ts).
-- Tudo numa transação; repetir a importação não duplica (org_id, legacy_id).
-- security invoker: as políticas RLS continuam valendo.
create or replace function public.importar_backup(p_org uuid, p_dados jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fuso text;
  v_duracao int;
  n_pacientes int;
  n_pacotes int;
  n_atendimentos int;
  n_evolucoes int;
  n_lancamentos int;
begin
  if not private.has_role(p_org, array['owner']) then
    raise exception 'Só a dona do consultório pode importar.' using errcode = '42501';
  end if;

  select timezone into v_fuso from public.organizations where id = p_org;
  select coalesce(max(duracao_min), 50) into v_duracao from public.working_hours where org_id = p_org;

  insert into public.patients
    (org_id, legacy_id, nome, telefone, nascimento, convenio, diagnostico, medico_encaminhador, obs)
  select p_org, x."legacyId", x.nome, x.telefone, x.nascimento, x.convenio, x.diagnostico, x.medico, x.obs
  from jsonb_to_recordset(p_dados -> 'pacientes') as x(
    "legacyId" text, nome text, telefone text, nascimento date, convenio text,
    diagnostico text, medico text, obs text)
  on conflict (org_id, legacy_id) do nothing;
  get diagnostics n_pacientes = row_count;

  insert into public.packages
    (org_id, legacy_id, patient_id, total, usadas_antes, valor_centavos, inicio, ativo, obs)
  select p_org, x."legacyId", p.id, x.total, x."usadasAntes", x."valorCentavos", x.inicio, x.ativo, x.obs
  from jsonb_to_recordset(p_dados -> 'pacotes') as x(
    "legacyId" text, paciente text, total smallint, "usadasAntes" smallint,
    "valorCentavos" bigint, inicio date, ativo boolean, obs text)
  join public.patients p on p.org_id = p_org and p.legacy_id = x.paciente
  on conflict (org_id, legacy_id) do nothing;
  get diagnostics n_pacotes = row_count;

  insert into public.appointments
    (org_id, legacy_id, patient_id, descricao_avulsa, inicio, fim, local, status, package_id, origem, obs)
  select p_org, x."legacyId", p.id, x.descricao,
         (x.data + x.hora) at time zone v_fuso,
         ((x.data + x.hora) at time zone v_fuso) + make_interval(mins => v_duracao),
         x.local, x.status, k.id, 'importado', x.obs
  from jsonb_to_recordset(p_dados -> 'atendimentos') as x(
    "legacyId" text, paciente text, descricao text, data date, hora time,
    local text, status text, pacote text, obs text)
  left join public.patients p on p.org_id = p_org and p.legacy_id = x.paciente
  left join public.packages k on k.org_id = p_org and k.legacy_id = x.pacote and k.patient_id = p.id
  on conflict (org_id, legacy_id) do nothing;
  get diagnostics n_atendimentos = row_count;

  insert into public.clinical_records
    (org_id, legacy_id, patient_id, appointment_id, tipo, data, schema_version, conteudo)
  select p_org, x."legacyId", p.id, a.id, 'evolucao', x.data, 1, x.conteudo
  from jsonb_to_recordset(p_dados -> 'evolucoes') as x(
    "legacyId" text, paciente text, atendimento text, data date, conteudo jsonb)
  join public.patients p on p.org_id = p_org and p.legacy_id = x.paciente
  left join public.appointments a on a.org_id = p_org and a.legacy_id = x.atendimento and a.patient_id = p.id
  -- Evita erro do gatilho de versão ao repetir a importação.
  where not exists (
    select 1 from public.clinical_records r where r.org_id = p_org and r.legacy_id = x."legacyId");
  get diagnostics n_evolucoes = row_count;

  insert into public.transactions
    (org_id, legacy_id, tipo, valor_centavos, data, forma, status, descricao, patient_id, obs)
  select p_org, x."legacyId", x.tipo, x."valorCentavos", x.data, x.forma, x.status, x.descricao, p.id, x.obs
  from jsonb_to_recordset(p_dados -> 'lancamentos') as x(
    "legacyId" text, tipo text, "valorCentavos" bigint, data date, forma text,
    status text, descricao text, paciente text, obs text)
  left join public.patients p on p.org_id = p_org and p.legacy_id = x.paciente
  on conflict (org_id, legacy_id) do nothing;
  get diagnostics n_lancamentos = row_count;

  if p_dados ->> 'saldoInicialCentavos' is not null then
    update public.organizations
    set saldo_inicial_centavos = (p_dados ->> 'saldoInicialCentavos')::bigint
    where id = p_org;
  end if;

  insert into public.audit_log (org_id, acao, entidade, detalhes)
  values (p_org, 'importar', 'backup', jsonb_build_object('pacientes', n_pacientes, 'atendimentos', n_atendimentos));

  return jsonb_build_object(
    'pacientes', n_pacientes, 'pacotes', n_pacotes, 'atendimentos', n_atendimentos,
    'evolucoes', n_evolucoes, 'lancamentos', n_lancamentos);
end;
$$;

revoke execute on function public.importar_backup(uuid, jsonb) from anon, public;
grant execute on function public.importar_backup(uuid, jsonb) to authenticated;
