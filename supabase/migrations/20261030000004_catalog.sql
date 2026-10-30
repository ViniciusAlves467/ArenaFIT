-- =============================================================================
-- ArenaFit — catálogos iniciais (exercícios, cosméticos, conquistas)
-- =============================================================================

insert into public.exercises (id, name, muscle_group, equipment, sort) values
  ('bench_press_barbell',      'Supino reto (barra)',        'chest',     'barbell',  10),
  ('bench_press_dumbbell',     'Supino reto (halteres)',     'chest',     'dumbbell', 11),
  ('incline_bench_barbell',    'Supino inclinado (barra)',   'chest',     'barbell',  12),
  ('incline_bench_dumbbell',   'Supino inclinado (halteres)','chest',     'dumbbell', 13),
  ('chest_fly_dumbbell',       'Crucifixo (halteres)',       'chest',     'dumbbell', 14),
  ('chest_fly_machine',        'Crucifixo (máquina)',        'chest',     'machine',  15),
  ('lat_pulldown',             'Puxada frontal',             'back',      'machine',  20),
  ('barbell_row',              'Remada curvada (barra)',     'back',      'barbell',  21),
  ('seated_row_machine',       'Remada sentada (máquina)',   'back',      'machine',  22),
  ('deadlift',                 'Levantamento terra',         'back',      'barbell',  23),
  ('pull_up_weighted',         'Barra fixa (com carga)',     'back',      'bodyweight', 24),
  ('back_squat',               'Agachamento livre',          'legs',      'barbell',  30),
  ('leg_press_45',             'Leg press 45°',              'legs',      'machine',  31),
  ('leg_extension',            'Cadeira extensora',          'legs',      'machine',  32),
  ('leg_curl',                 'Mesa flexora',               'legs',      'machine',  33),
  ('calf_raise_machine',       'Panturrilha (máquina)',      'legs',      'machine',  34),
  ('hip_thrust',               'Elevação pélvica',           'glutes',    'barbell',  40),
  ('hip_abduction_machine',    'Cadeira abdutora',           'glutes',    'machine',  41),
  ('overhead_press_barbell',   'Desenvolvimento (barra)',    'shoulders', 'barbell',  50),
  ('overhead_press_dumbbell',  'Desenvolvimento (halteres)', 'shoulders', 'dumbbell', 51),
  ('lateral_raise',            'Elevação lateral',           'shoulders', 'dumbbell', 52),
  ('barbell_curl',             'Rosca direta (barra)',       'biceps',    'barbell',  60),
  ('dumbbell_curl',            'Rosca alternada (halteres)', 'biceps',    'dumbbell', 61),
  ('hammer_curl',              'Rosca martelo',              'biceps',    'dumbbell', 62),
  ('triceps_pushdown',         'Tríceps pulley',             'triceps',   'cable',    70),
  ('triceps_french',           'Tríceps francês',            'triceps',   'dumbbell', 71),
  ('dips_weighted',            'Paralelas (com carga)',      'triceps',   'bodyweight', 72),
  ('cable_crunch',             'Abdominal na polia',         'core',      'cable',    80);

-- Cosméticos com estética esportiva/minimalista (molduras, títulos, emblemas, banners).
insert into public.cosmetics (id, kind, name, description, price, min_level, rarity, data, sort) values
  ('frame_none',     'frame',  'Sem moldura',   null,                                  0,  1, 'common',    '{"style":"none"}', 0),
  ('frame_steel',    'frame',  'Aço',           'Anel metálico discreto.',           150,  1, 'common',    '{"style":"solid","color":"#8A8F98"}', 1),
  ('frame_ember',    'frame',  'Brasa',         'Anel laranja com brilho.',          400,  3, 'rare',      '{"style":"glow","color":"#FF6A13"}', 2),
  ('frame_carbon',   'frame',  'Carbono',       'Trama escura de fibra.',            600,  5, 'epic',      '{"style":"dashed","color":"#3A3A3A"}', 3),
  ('frame_gold',     'frame',  'Pódio',         'Para quem vive no topo do ranking.',1200, 10, 'legendary', '{"style":"double","color":"#E8B04B"}', 4),

  ('title_rookie',   'title',  'Estreante',     null,                                  0,  1, 'common',    '{}', 10),
  ('title_steady',   'title',  'Constante',     null,                                200,  2, 'common',    '{}', 11),
  ('title_early',    'title',  'Madrugador',    null,                                250,  3, 'rare',      '{}', 12),
  ('title_iron',     'title',  'Mão de Ferro',  null,                                350,  4, 'rare',      '{}', 13),
  ('title_pacer',    'title',  'Ritmista',      null,                                350,  4, 'rare',      '{}', 14),
  ('title_relentless','title', 'Implacável',    null,                                800,  8, 'epic',      '{}', 15),
  ('title_legend',   'title',  'Lenda da Arena',null,                               2000, 15, 'legendary', '{}', 16),

  ('emblem_bolt',    'emblem', 'Raio',          null,                                  0,  1, 'common',    '{"icon":"zap"}', 20),
  ('emblem_target',  'emblem', 'Alvo',          null,                                120,  1, 'common',    '{"icon":"crosshair"}', 21),
  ('emblem_shield',  'emblem', 'Escudo',        null,                                220,  2, 'rare',      '{"icon":"shield"}', 22),
  ('emblem_flame',   'emblem', 'Chama',         null,                                300,  3, 'rare',      '{"icon":"flame"}', 23),
  ('emblem_mountain','emblem', 'Cume',          null,                                500,  6, 'epic',      '{"icon":"mountain"}', 24),
  ('emblem_crown',   'emblem', 'Coroa',         null,                               1000, 12, 'legendary', '{"icon":"crown"}', 25),

  ('banner_graphite','banner', 'Grafite',       null,                                  0,  1, 'common',    '{"from":"#1A1A1A","to":"#0D0D0D"}', 30),
  ('banner_sunset',  'banner', 'Pôr do sol',    null,                                300,  2, 'rare',      '{"from":"#FF6A13","to":"#7A1F00"}', 31),
  ('banner_volcanic','banner', 'Vulcânico',     null,                                550,  5, 'epic',      '{"from":"#3B0A00","to":"#FF3D00"}', 32),
  ('banner_aurora',  'banner', 'Aurora âmbar',  null,                                900,  9, 'legendary', '{"from":"#FFB547","to":"#FF3D00"}', 33);

insert into public.achievements (id, name, description, icon, metric, target, xp_reward, coin_reward, sort) values
  ('first_checkin',  'Primeiro passo',   'Registre seu primeiro check-in.',          'flag',        'checkins',          1,   200,  50, 1),
  ('checkins_10',    'Ritmo',            'Complete 10 check-ins.',                   'activity',    'checkins',         10,   500, 100, 2),
  ('checkins_50',    'Rotina de atleta', 'Complete 50 check-ins.',                   'trending-up', 'checkins',         50,  1500, 250, 3),
  ('checkins_100',   'Centurião',        'Complete 100 check-ins.',                  'award',       'checkins',        100,  3000, 500, 4),
  ('streak_7',       'Semana cheia',     'Mantenha uma sequência de 7 dias.',        'flame',       'streak',            7,   700, 150, 10),
  ('streak_30',      'Mês invicto',      'Mantenha uma sequência de 30 dias.',       'flame',       'streak',           30,  2500, 400, 11),
  ('strength_25',    'Ferro',            'Registre 25 treinos de musculação.',       'dumbbell',    'strength_checkins', 25, 1200, 200, 20),
  ('run_50km',       'Fôlego',           'Acumule 50 km de corrida.',                'wind',        'run_km',           50,  1200, 200, 21),
  ('groups_3',       'Em equipe',        'Participe de 3 grupos.',                   'users',       'groups_joined',     3,   400, 100, 30),
  ('level_10',       'Veterano',         'Alcance o nível 10.',                      'shield',      'level',            10,  2000, 300, 40);
