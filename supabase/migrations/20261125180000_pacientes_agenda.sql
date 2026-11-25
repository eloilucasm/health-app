-- =============================================================================
-- Pacientes e agenda (Sessão 3, Dia 3): RF-05, RF-06
-- =============================================================================

-- Atendimento com registro de prontuário não pode ser excluído (só cancelado).
-- Antes, "on delete set null" tentava alterar o prontuário imutável e falhava
-- com uma mensagem que não explicava o motivo.
alter table public.clinical_records
  drop constraint clinical_records_org_id_appointment_id_fkey,
  add constraint clinical_records_org_id_appointment_id_fkey
    foreign key (org_id, appointment_id) references public.appointments (org_id, id) on delete restrict;

-- Arquivar paciente (exclusão lógica) e cancelar os atendimentos futuros, juntos.
-- security invoker: as políticas RLS continuam valendo.
create or replace function public.arquivar_paciente(p_paciente uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.patients set deleted_at = now() where id = p_paciente and deleted_at is null;
  if not found then
    raise exception 'Paciente não encontrado.' using errcode = 'P0001';
  end if;

  update public.appointments set status = 'cancelado'
  where patient_id = p_paciente and inicio > now() and status in ('agendado', 'confirmado');
end;
$$;

revoke execute on function public.arquivar_paciente(uuid) from anon, public;
grant execute on function public.arquivar_paciente(uuid) to authenticated;
