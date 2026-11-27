-- Desligar uma profissão no cadastro não pode tirar o modelo de quem já a usa:
-- a profissional sempre lê a profissão do próprio consultório.
create policy "especialidades: profissao do proprio consultorio" on public.specialty_profiles
  for select to authenticated
  using (exists (
    select 1 from public.organizations o
    where o.specialty_profile_id = specialty_profiles.id and (select private.is_member(o.id))
  ));
