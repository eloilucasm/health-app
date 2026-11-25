-- A página pública precisa do fuso do consultório para mostrar os horários.
drop function public.agenda_publica(text);

create function public.agenda_publica(p_slug text)
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
  where o.slug = lower(p_slug) and o.plano <> 'cancelado';
$$;

revoke execute on function public.agenda_publica(text) from public;
grant execute on function public.agenda_publica(text) to anon, authenticated;
