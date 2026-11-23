-- =============================================================================
-- Dados de referência: perfis de especialidade (D-03)
-- Fisioterapia completa (vinda do protótipo); fono e psico como esboço;
-- nutrição, odontologia e medicina cadastradas mas inativas até depois do MVP.
--
-- Formato dos formulários (evolution_schema / anamnesis_schema):
--   { "version": 1, "fields": [ { "key", "label", "type", ...opções } ] }
--   type: text | textarea | scale | chips | number | date
--   scale: min, max, legend[]       chips: options[] ou optionsFrom = "procedimentos"
-- =============================================================================

insert into public.specialty_profiles
  (id, nome, conselho, ordem, ativo, usa_pacotes, procedimentos, evolution_schema, anamnesis_schema, doc_templates)
values
(
  'fisioterapia', 'Fisioterapia', 'CREFITO', 10, true, true,
  array['Terapia manual','Osteopatia','Dry needling','Ventosa','Kinesio tape','Liberação miofascial',
        'Exercícios terapêuticos','Alongamento','Eletroterapia','Orientações domiciliares'],
  $json${
    "version": 1,
    "fields": [
      {"key": "queixa", "label": "Queixa do dia", "type": "textarea",
       "placeholder": "Como chegou hoje, onde dói, o que mudou"},
      {"key": "dor", "label": "Escala de dor (EVA)", "type": "scale", "min": 0, "max": 10,
       "legend": ["Sem dor", "Moderada", "Pior dor"], "chart": true},
      {"key": "condutas", "label": "Condutas", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "condutasTexto", "label": "Detalhes das condutas", "type": "textarea",
       "placeholder": "Pontos tratados, parâmetros, exercícios"},
      {"key": "obs", "label": "Observações", "type": "textarea",
       "placeholder": "Resposta ao tratamento, orientações, plano para a próxima sessão"}
    ]
  }$json$::jsonb,
  $json${
    "version": 1,
    "fields": [
      {"key": "queixaPrincipal", "label": "Queixa principal", "type": "textarea"},
      {"key": "hda", "label": "História da doença atual", "type": "textarea"},
      {"key": "antecedentes", "label": "Antecedentes e cirurgias", "type": "textarea"},
      {"key": "medicamentos", "label": "Medicamentos em uso", "type": "textarea"},
      {"key": "exames", "label": "Exames de imagem", "type": "textarea"},
      {"key": "dorInicial", "label": "Dor na avaliação (EVA)", "type": "scale", "min": 0, "max": 10,
       "legend": ["Sem dor", "Moderada", "Pior dor"]},
      {"key": "objetivos", "label": "Objetivos do tratamento", "type": "textarea"}
    ]
  }$json$::jsonb,
  '{"atestado": true, "declaracao": true, "recibo": true}'::jsonb
),
(
  'fonoaudiologia', 'Fonoaudiologia', 'CRFa', 20, true, true,
  array['Terapia de linguagem','Motricidade orofacial','Voz','Audição','Disfagia','Fluência','Orientação familiar'],
  $json${
    "version": 1,
    "fields": [
      {"key": "objetivos", "label": "Objetivos da sessão", "type": "textarea"},
      {"key": "atividades", "label": "Áreas trabalhadas", "type": "chips", "optionsFrom": "procedimentos"},
      {"key": "desempenho", "label": "Desempenho e respostas", "type": "textarea"},
      {"key": "orientacoes", "label": "Orientações para casa", "type": "textarea"}
    ]
  }$json$::jsonb,
  $json${"version": 1, "fields": [
    {"key": "queixaPrincipal", "label": "Queixa principal", "type": "textarea"},
    {"key": "historico", "label": "Histórico de desenvolvimento", "type": "textarea"}
  ]}$json$::jsonb,
  '{"atestado": true, "declaracao": true, "recibo": true}'::jsonb
),
(
  'psicologia', 'Psicologia', 'CRP', 30, true, true,
  array[]::text[],
  $json${
    "version": 1,
    "fields": [
      {"key": "registro", "label": "Registro da sessão", "type": "textarea"},
      {"key": "encaminhamentos", "label": "Encaminhamentos", "type": "textarea"}
    ]
  }$json$::jsonb,
  $json${"version": 1, "fields": [
    {"key": "demanda", "label": "Demanda inicial", "type": "textarea"},
    {"key": "historico", "label": "Histórico", "type": "textarea"}
  ]}$json$::jsonb,
  '{"atestado": false, "declaracao": true, "recibo": true}'::jsonb
),
('nutricao',    'Nutrição',    'CRN', 40, false, true,  array[]::text[], '{"version":1,"fields":[]}', '{"version":1,"fields":[]}', '{}'),
('odontologia', 'Odontologia', 'CRO', 50, false, false, array[]::text[], '{"version":1,"fields":[]}', '{"version":1,"fields":[]}', '{}'),
('medicina',    'Medicina',    'CRM', 60, false, false, array[]::text[], '{"version":1,"fields":[]}', '{"version":1,"fields":[]}', '{}')
on conflict (id) do nothing;
