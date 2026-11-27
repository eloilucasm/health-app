-- =============================================================================
-- Personalização por profissão (Fase 2): RF-41 a RF-48; D-41, D-42
--
-- O modelo da profissão (specialty_profiles) passa a definir:
--   termos, recursos padrão, tipos de atendimento, campos do paciente,
--   formulários de evolução e anamnese, com número de versão.
-- Cada alteração feita pelo painel gera uma nova versão e guarda a anterior
-- em specialty_profile_versions, para os registros antigos continuarem legíveis.
-- A profissional ajusta listas e liga/desliga recursos no próprio consultório.
-- =============================================================================

-- ---- Modelo da profissão -----------------------------------------------------
alter table public.specialty_profiles
  add column versao int not null default 1,
  add column termos jsonb not null default '{}'::jsonb,
  add column recursos_padrao jsonb not null default '{}'::jsonb,
  add column tipos_atendimento jsonb not null default '[]'::jsonb,
  add column patient_schema jsonb not null default '{"base": {}, "fields": []}'::jsonb;

create table public.specialty_profile_versions (
  profile_id text not null references public.specialty_profiles(id) on delete cascade,
  versao     int not null,
  modelo     jsonb not null,   -- cópia completa do modelo naquela versão
  motivo     text,
  criado_por uuid default auth.uid(),
  criado_em  timestamptz not null default now(),
  primary key (profile_id, versao)
);
alter table public.specialty_profile_versions enable row level security;
-- Modelos não são segredo: quem está logado lê (para exibir registros antigos).
create policy "versoes de modelo: leitura" on public.specialty_profile_versions
  for select to authenticated using (true);
revoke all on public.specialty_profile_versions from anon;

-- ---- Ajustes da profissional e dados novos -----------------------------------
alter table public.organizations
  add column recursos_profissao jsonb not null default '{}'::jsonb,   -- ex.: {"pacotes": false}
  add column tipos_atendimento jsonb;                                -- null = os da profissão

alter table public.patients
  add column dados_extra jsonb not null default '{}'::jsonb;

alter table public.appointments
  add column tipo_atendimento text check (tipo_atendimento is null or length(tipo_atendimento) <= 60);

-- ---- Termos e campos comuns ---------------------------------------------------
-- Termos são frases completas, para não errar concordância (a sessão / o atendimento).
create or replace function private.termos_modelo(
  p_atendimento text, p_atendimentos text, p_registro text, p_registros text,
  p_novo_registro text, p_registro_do_atendimento text, p_sem_registros text
) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'atendimento', p_atendimento, 'atendimentos', p_atendimentos,
    'registro', p_registro, 'registros', p_registros,
    'novo_registro', p_novo_registro, 'registro_do_atendimento', p_registro_do_atendimento,
    'sem_registros', p_sem_registros);
$$;

-- ---- Fisioterapia (modelo já existente, ganha termos e tipos) ------------------
update public.specialty_profiles set
  termos = private.termos_modelo('sessão', 'sessões', 'evolução', 'evoluções',
    'Nova evolução', 'Evolução desta sessão', 'Nenhuma evolução registrada.'),
  recursos_padrao = '{"pacotes": true}',
  tipos_atendimento = '[{"nome": "Avaliação", "duracao_min": 60}, {"nome": "Sessão", "duracao_min": 50}]',
  patient_schema = $j${
    "base": {"diagnostico": "Diagnóstico de encaminhamento", "medico": "Médico que encaminhou"},
    "fields": []
  }$j$
where id = 'fisioterapia';

-- ---- Psicologia (registro documental, Res. CFP 001/2009; a validar, P-4) --------
update public.specialty_profiles set
  ativo = true,
  usa_pacotes = true,
  termos = private.termos_modelo('sessão', 'sessões', 'registro de sessão', 'registros de sessão',
    'Novo registro de sessão', 'Registro desta sessão', 'Nenhum registro de sessão.'),
  recursos_padrao = '{"pacotes": true}',
  tipos_atendimento = '[{"nome": "Primeira sessão", "duracao_min": 50}, {"nome": "Sessão", "duracao_min": 50}]',
  procedimentos = array['Acolhimento', 'Escuta', 'Psicoeducação', 'Reestruturação cognitiva', 'Técnicas de relaxamento',
    'Treino de habilidades', 'Ludoterapia', 'Orientação familiar', 'Aplicação de instrumento'],
  patient_schema = $j${
    "base": {"diagnostico": "Motivo da procura", "medico": "Quem encaminhou"},
    "fields": [
      {"key": "responsavel", "label": "Responsável legal (menores)", "type": "text"},
      {"key": "responsavelTelefone", "label": "Telefone do responsável", "type": "text"}
    ]
  }$j$,
  evolution_schema = $j${
    "version": 1,
    "fields": [
      {"key": "resumo", "label": "Resumo da sessão", "type": "textarea",
       "placeholder": "Temas trazidos, como a pessoa chegou, principais pontos"},
      {"key": "intervencoes", "label": "Intervenções e técnicas", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "evolucao", "label": "Evolução do trabalho", "type": "textarea",
       "placeholder": "Avanços, dificuldades, relação com os objetivos"},
      {"key": "encaminhamentos", "label": "Encaminhamentos e próximos passos", "type": "textarea"}
    ]
  }$j$,
  anamnesis_schema = $j${
    "version": 1,
    "fields": [
      {"key": "demanda", "label": "Demanda inicial", "type": "textarea"},
      {"key": "objetivos", "label": "Objetivos do acompanhamento", "type": "textarea"},
      {"key": "historico", "label": "Histórico", "type": "textarea"},
      {"key": "redeApoio", "label": "Rede de apoio", "type": "textarea"}
    ]
  }$j$
where id = 'psicologia';

-- ---- Fonoaudiologia -------------------------------------------------------------
update public.specialty_profiles set
  ativo = true,
  usa_pacotes = true,
  termos = private.termos_modelo('sessão', 'sessões', 'evolução', 'evoluções',
    'Nova evolução', 'Evolução desta sessão', 'Nenhuma evolução registrada.'),
  recursos_padrao = '{"pacotes": true}',
  tipos_atendimento = '[{"nome": "Avaliação", "duracao_min": 60}, {"nome": "Sessão", "duracao_min": 45}]',
  patient_schema = $j${
    "base": {"diagnostico": "Queixa ou motivo do encaminhamento", "medico": "Quem encaminhou"},
    "fields": [
      {"key": "responsavel", "label": "Responsável legal (menores)", "type": "text"},
      {"key": "responsavelTelefone", "label": "Telefone do responsável", "type": "text"},
      {"key": "escola", "label": "Escola (se criança)", "type": "text"}
    ]
  }$j$,
  evolution_schema = $j${
    "version": 1,
    "fields": [
      {"key": "objetivos", "label": "Objetivos da sessão", "type": "textarea"},
      {"key": "areas", "label": "Áreas trabalhadas", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "atividades", "label": "Atividades realizadas", "type": "textarea"},
      {"key": "desempenho", "label": "Desempenho", "type": "select",
       "options": ["Abaixo do esperado", "Dentro do esperado", "Acima do esperado"]},
      {"key": "orientacoes", "label": "Orientações à família", "type": "textarea"}
    ]
  }$j$,
  anamnesis_schema = $j${
    "version": 1,
    "fields": [
      {"key": "queixaPrincipal", "label": "Queixa principal", "type": "textarea"},
      {"key": "historico", "label": "Histórico de desenvolvimento", "type": "textarea"},
      {"key": "audicao", "label": "Audição e exames anteriores", "type": "textarea"},
      {"key": "objetivos", "label": "Objetivos terapêuticos", "type": "textarea"}
    ]
  }$j$
where id = 'fonoaudiologia';

-- ---- Nutrição ---------------------------------------------------------------------
update public.specialty_profiles set
  ativo = true,
  usa_pacotes = false,
  termos = private.termos_modelo('consulta', 'consultas', 'acompanhamento', 'acompanhamentos',
    'Novo acompanhamento', 'Acompanhamento desta consulta', 'Nenhum acompanhamento registrado.'),
  recursos_padrao = '{"pacotes": false}',
  tipos_atendimento = '[{"nome": "Primeira consulta", "duracao_min": 60}, {"nome": "Retorno", "duracao_min": 40}]',
  procedimentos = array['Plano alimentar', 'Reeducação alimentar', 'Orientação de suplementação',
    'Avaliação de exames', 'Bioimpedância', 'Recordatório alimentar'],
  patient_schema = $j${
    "base": {"diagnostico": "Motivo da consulta", "medico": "Quem encaminhou"},
    "fields": [
      {"key": "objetivo", "label": "Objetivo", "type": "select",
       "options": ["Emagrecimento", "Ganho de massa", "Controle de doença", "Esportivo", "Gestação", "Outro"]},
      {"key": "restricoes", "label": "Alergias e restrições alimentares", "type": "text"}
    ]
  }$j$,
  evolution_schema = $j${
    "version": 1,
    "fields": [
      {"key": "medidas", "label": "Medidas", "type": "section"},
      {"key": "peso", "label": "Peso", "type": "number", "unit": "kg", "min": 1, "max": 400, "step": 0.1, "chart": true},
      {"key": "altura", "label": "Altura", "type": "number", "unit": "cm", "min": 30, "max": 250},
      {"key": "imc", "label": "IMC", "type": "computed", "formula": "imc", "inputs": ["peso", "altura"], "unit": "kg/m²"},
      {"key": "cintura", "label": "Circunferência da cintura", "type": "number", "unit": "cm", "min": 20, "max": 250},
      {"key": "quadril", "label": "Circunferência do quadril", "type": "number", "unit": "cm", "min": 20, "max": 250},
      {"key": "gordura", "label": "Gordura corporal", "type": "number", "unit": "%", "min": 1, "max": 80, "step": 0.1},
      {"key": "condutaSecao", "label": "Conduta", "type": "section"},
      {"key": "condutas", "label": "Condutas", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "plano", "label": "Plano alimentar e orientações", "type": "textarea"},
      {"key": "obs", "label": "Observações", "type": "textarea"}
    ]
  }$j$,
  anamnesis_schema = $j${
    "version": 1,
    "fields": [
      {"key": "historico", "label": "Histórico de saúde e doenças", "type": "textarea"},
      {"key": "medicamentos", "label": "Medicamentos e suplementos", "type": "textarea"},
      {"key": "habitos", "label": "Hábitos alimentares e rotina", "type": "textarea"},
      {"key": "atividadeFisica", "label": "Atividade física", "type": "textarea"}
    ]
  }$j$
where id = 'nutricao';

-- ---- Odontologia (formato SOAP; odontograma fora desta etapa) ----------------------
update public.specialty_profiles set
  ativo = true,
  usa_pacotes = false,
  termos = private.termos_modelo('consulta', 'consultas', 'evolução clínica', 'evoluções clínicas',
    'Nova evolução clínica', 'Evolução desta consulta', 'Nenhuma evolução clínica registrada.'),
  recursos_padrao = '{"pacotes": false}',
  tipos_atendimento = '[{"nome": "Consulta", "duracao_min": 60}, {"nome": "Retorno", "duracao_min": 30}, {"nome": "Urgência", "duracao_min": 30}]',
  procedimentos = array['Profilaxia', 'Raspagem', 'Restauração', 'Endodontia', 'Extração', 'Aplicação de flúor',
    'Clareamento', 'Moldagem', 'Instalação de prótese', 'Radiografia'],
  patient_schema = $j${
    "base": {"diagnostico": "Motivo da primeira consulta", "medico": null},
    "fields": [
      {"key": "alergias", "label": "Alergias (inclusive a anestésicos)", "type": "text"},
      {"key": "medicamentos", "label": "Medicamentos em uso", "type": "text"}
    ]
  }$j$,
  evolution_schema = $j${
    "version": 1,
    "fields": [
      {"key": "subjetivo", "label": "Queixa (S)", "type": "textarea"},
      {"key": "objetivo", "label": "Exame clínico (O)", "type": "textarea"},
      {"key": "avaliacao", "label": "Avaliação e diagnóstico (A)", "type": "textarea"},
      {"key": "plano", "label": "Plano de tratamento (P)", "type": "textarea"},
      {"key": "procedimentos", "label": "Procedimentos realizados", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "dentes", "label": "Dentes ou regiões envolvidos", "type": "text", "placeholder": "Ex.: 36, 37; arcada superior"}
    ]
  }$j$,
  anamnesis_schema = $j${
    "version": 1,
    "fields": [
      {"key": "historico", "label": "Histórico médico e odontológico", "type": "textarea"},
      {"key": "habitos", "label": "Hábitos (fumo, bruxismo, higiene)", "type": "textarea"}
    ]
  }$j$
where id = 'odontologia';

-- ---- Medicina (formato SOAP; receita digital fora desta etapa) ---------------------
update public.specialty_profiles set
  ativo = true,
  usa_pacotes = false,
  termos = private.termos_modelo('consulta', 'consultas', 'evolução médica', 'evoluções médicas',
    'Nova evolução médica', 'Evolução desta consulta', 'Nenhuma evolução médica registrada.'),
  recursos_padrao = '{"pacotes": false}',
  tipos_atendimento = '[{"nome": "Consulta", "duracao_min": 30}, {"nome": "Retorno", "duracao_min": 20}]',
  procedimentos = array['Exame físico', 'Solicitação de exames', 'Prescrição', 'Atestado', 'Encaminhamento',
    'Orientações'],
  patient_schema = $j${
    "base": {"diagnostico": "Motivo da primeira consulta", "medico": "Quem encaminhou"},
    "fields": [
      {"key": "alergias", "label": "Alergias", "type": "text"},
      {"key": "medicamentos", "label": "Medicamentos em uso", "type": "text"},
      {"key": "comorbidades", "label": "Doenças preexistentes", "type": "text"}
    ]
  }$j$,
  evolution_schema = $j${
    "version": 1,
    "fields": [
      {"key": "subjetivo", "label": "Subjetivo (S)", "type": "textarea", "placeholder": "Queixa e história"},
      {"key": "objetivo", "label": "Objetivo (O)", "type": "textarea", "placeholder": "Exame físico e sinais"},
      {"key": "avaliacao", "label": "Avaliação (A)", "type": "textarea", "placeholder": "Hipóteses diagnósticas"},
      {"key": "cid", "label": "CID-10", "type": "text", "placeholder": "Ex.: M54.5"},
      {"key": "plano", "label": "Plano (P)", "type": "textarea", "placeholder": "Conduta, exames, orientações"},
      {"key": "condutas", "label": "Condutas", "type": "chips", "optionsFrom": "procedimentos"}
    ]
  }$j$,
  anamnesis_schema = $j${
    "version": 1,
    "fields": [
      {"key": "historico", "label": "História patológica pregressa", "type": "textarea"},
      {"key": "familiar", "label": "História familiar", "type": "textarea"},
      {"key": "habitos", "label": "Hábitos de vida", "type": "textarea"}
    ]
  }$j$
where id = 'medicina';

drop function private.termos_modelo(text, text, text, text, text, text, text);

-- Versão 1 de cada modelo no histórico.
insert into public.specialty_profile_versions (profile_id, versao, modelo, motivo, criado_por)
select id, versao,
       jsonb_build_object('termos', termos, 'recursos_padrao', recursos_padrao, 'tipos_atendimento', tipos_atendimento,
         'patient_schema', patient_schema, 'evolution_schema', evolution_schema,
         'anamnesis_schema', anamnesis_schema, 'procedimentos', to_jsonb(procedimentos)),
       'Modelo inicial', null
from public.specialty_profiles;

-- ---- Edição dos modelos pelo painel (só admin, com motivo, gera versão) -----------
create or replace function public.admin_salvar_profissao(p_id text, p_modelo jsonb, p_motivo text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_versao int;
begin
  perform private.exigir_admin(array['admin']);
  v_motivo := private.exigir_motivo(p_motivo);

  -- Formato mínimo; a validação detalhada é feita no app (src/domain/profissao.ts).
  if jsonb_typeof(p_modelo -> 'termos') <> 'object'
     or jsonb_typeof(p_modelo -> 'recursos_padrao') <> 'object'
     or jsonb_typeof(p_modelo -> 'tipos_atendimento') <> 'array'
     or jsonb_array_length(p_modelo -> 'tipos_atendimento') = 0
     or jsonb_typeof(p_modelo -> 'patient_schema' -> 'fields') <> 'array'
     or jsonb_typeof(p_modelo -> 'evolution_schema' -> 'fields') <> 'array'
     or jsonb_typeof(p_modelo -> 'anamnesis_schema' -> 'fields') <> 'array'
     or jsonb_typeof(p_modelo -> 'procedimentos') <> 'array' then
    raise exception 'Modelo em formato inválido.' using errcode = 'P0001';
  end if;

  update public.specialty_profiles s set
    versao = s.versao + 1,
    nome = coalesce(nullif(trim(p_modelo ->> 'nome'), ''), s.nome),
    ativo = coalesce((p_modelo ->> 'ativo')::boolean, s.ativo),
    termos = p_modelo -> 'termos',
    recursos_padrao = p_modelo -> 'recursos_padrao',
    usa_pacotes = coalesce((p_modelo -> 'recursos_padrao' ->> 'pacotes')::boolean, s.usa_pacotes),
    tipos_atendimento = p_modelo -> 'tipos_atendimento',
    patient_schema = p_modelo -> 'patient_schema',
    evolution_schema = jsonb_set(p_modelo -> 'evolution_schema', '{version}', to_jsonb(s.versao + 1)),
    anamnesis_schema = jsonb_set(p_modelo -> 'anamnesis_schema', '{version}', to_jsonb(s.versao + 1)),
    procedimentos = array(select jsonb_array_elements_text(p_modelo -> 'procedimentos'))
  where s.id = p_id
  returning s.versao into v_versao;
  if v_versao is null then
    raise exception 'Profissão não encontrada.' using errcode = 'P0001';
  end if;

  insert into public.specialty_profile_versions (profile_id, versao, modelo, motivo)
  select s.id, s.versao,
         jsonb_build_object('termos', s.termos, 'recursos_padrao', s.recursos_padrao,
           'tipos_atendimento', s.tipos_atendimento, 'patient_schema', s.patient_schema,
           'evolution_schema', s.evolution_schema, 'anamnesis_schema', s.anamnesis_schema,
           'procedimentos', to_jsonb(s.procedimentos)),
         v_motivo
  from public.specialty_profiles s where s.id = p_id;

  perform private.registrar_admin('salvar_profissao', null, v_motivo,
    jsonb_build_object('profissao', p_id, 'versao', v_versao));
  return v_versao;
end;
$$;

revoke execute on function public.admin_salvar_profissao(text, jsonb, text) from public, anon;
grant execute on function public.admin_salvar_profissao(text, jsonb, text) to authenticated;

-- O painel lista também as profissões desligadas (a política padrão só mostra as ativas).
create policy "especialidades: equipe da plataforma le todas" on public.specialty_profiles
  for select to authenticated using ((select private.is_platform_admin()));
