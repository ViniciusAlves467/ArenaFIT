/**
 * Espelho dos catálogos da migration 20261030000004_catalog.sql, usado pelo modo demo
 * e para rótulos no app. A fonte da verdade em produção é o banco.
 */
import type { Cosmetic, Exercise } from './types';

export const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Peito',
  back: 'Costas',
  legs: 'Pernas',
  glutes: 'Glúteos',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core',
};

export const EXERCISES: Exercise[] = [
  ['bench_press_barbell', 'Supino reto (barra)', 'chest', 'barbell'],
  ['bench_press_dumbbell', 'Supino reto (halteres)', 'chest', 'dumbbell'],
  ['incline_bench_barbell', 'Supino inclinado (barra)', 'chest', 'barbell'],
  ['incline_bench_dumbbell', 'Supino inclinado (halteres)', 'chest', 'dumbbell'],
  ['chest_fly_dumbbell', 'Crucifixo (halteres)', 'chest', 'dumbbell'],
  ['chest_fly_machine', 'Crucifixo (máquina)', 'chest', 'machine'],
  ['lat_pulldown', 'Puxada frontal', 'back', 'machine'],
  ['barbell_row', 'Remada curvada (barra)', 'back', 'barbell'],
  ['seated_row_machine', 'Remada sentada (máquina)', 'back', 'machine'],
  ['deadlift', 'Levantamento terra', 'back', 'barbell'],
  ['pull_up_weighted', 'Barra fixa (com carga)', 'back', 'bodyweight'],
  ['back_squat', 'Agachamento livre', 'legs', 'barbell'],
  ['leg_press_45', 'Leg press 45°', 'legs', 'machine'],
  ['leg_extension', 'Cadeira extensora', 'legs', 'machine'],
  ['leg_curl', 'Mesa flexora', 'legs', 'machine'],
  ['calf_raise_machine', 'Panturrilha (máquina)', 'legs', 'machine'],
  ['hip_thrust', 'Elevação pélvica', 'glutes', 'barbell'],
  ['hip_abduction_machine', 'Cadeira abdutora', 'glutes', 'machine'],
  ['overhead_press_barbell', 'Desenvolvimento (barra)', 'shoulders', 'barbell'],
  ['overhead_press_dumbbell', 'Desenvolvimento (halteres)', 'shoulders', 'dumbbell'],
  ['lateral_raise', 'Elevação lateral', 'shoulders', 'dumbbell'],
  ['barbell_curl', 'Rosca direta (barra)', 'biceps', 'barbell'],
  ['dumbbell_curl', 'Rosca alternada (halteres)', 'biceps', 'dumbbell'],
  ['hammer_curl', 'Rosca martelo', 'biceps', 'dumbbell'],
  ['triceps_pushdown', 'Tríceps pulley', 'triceps', 'cable'],
  ['triceps_french', 'Tríceps francês', 'triceps', 'dumbbell'],
  ['dips_weighted', 'Paralelas (com carga)', 'triceps', 'bodyweight'],
  ['cable_crunch', 'Abdominal na polia', 'core', 'cable'],
].map(([id, name, muscle_group, equipment]) => ({ id, name, muscle_group, equipment }));

type C = [string, Cosmetic['kind'], string, number, number, Cosmetic['rarity'], Record<string, any>];
export const COSMETICS: Cosmetic[] = (
  [
    ['frame_none', 'frame', 'Sem moldura', 0, 1, 'common', { style: 'none' }],
    ['frame_steel', 'frame', 'Aço', 150, 1, 'common', { style: 'solid', color: '#8A8F98' }],
    ['frame_ember', 'frame', 'Brasa', 400, 3, 'rare', { style: 'glow', color: '#FF6A13' }],
    ['frame_carbon', 'frame', 'Carbono', 600, 5, 'epic', { style: 'dashed', color: '#5A5A5A' }],
    ['frame_gold', 'frame', 'Pódio', 1200, 10, 'legendary', { style: 'double', color: '#E8B04B' }],
    ['title_rookie', 'title', 'Estreante', 0, 1, 'common', {}],
    ['title_steady', 'title', 'Constante', 200, 2, 'common', {}],
    ['title_early', 'title', 'Madrugador', 250, 3, 'rare', {}],
    ['title_iron', 'title', 'Mão de Ferro', 350, 4, 'rare', {}],
    ['title_pacer', 'title', 'Ritmista', 350, 4, 'rare', {}],
    ['title_relentless', 'title', 'Implacável', 800, 8, 'epic', {}],
    ['title_legend', 'title', 'Lenda da Arena', 2000, 15, 'legendary', {}],
    ['emblem_bolt', 'emblem', 'Raio', 0, 1, 'common', { icon: 'zap' }],
    ['emblem_target', 'emblem', 'Alvo', 120, 1, 'common', { icon: 'crosshair' }],
    ['emblem_shield', 'emblem', 'Escudo', 220, 2, 'rare', { icon: 'shield' }],
    ['emblem_flame', 'emblem', 'Chama', 300, 3, 'rare', { icon: 'flame' }],
    ['emblem_mountain', 'emblem', 'Cume', 500, 6, 'epic', { icon: 'mountain' }],
    ['emblem_crown', 'emblem', 'Coroa', 1000, 12, 'legendary', { icon: 'crown' }],
    ['banner_graphite', 'banner', 'Grafite', 0, 1, 'common', { from: '#1A1A1A', to: '#0D0D0D' }],
    ['banner_sunset', 'banner', 'Pôr do sol', 300, 2, 'rare', { from: '#FF6A13', to: '#7A1F00' }],
    ['banner_volcanic', 'banner', 'Vulcânico', 550, 5, 'epic', { from: '#3B0A00', to: '#FF3D00' }],
    ['banner_aurora', 'banner', 'Aurora âmbar', 900, 9, 'legendary', { from: '#FFB547', to: '#FF3D00' }],
  ] as C[]
).map(([id, kind, name, price, min_level, rarity, data]) => ({ id, kind, name, description: null, price, min_level, rarity, data }));

export const ACHIEVEMENTS = [
  { id: 'first_checkin', name: 'Primeiro passo', description: 'Registre seu primeiro check-in.', icon: 'flag', metric: 'checkins', target: 1, xp_reward: 200, coin_reward: 50 },
  { id: 'checkins_10', name: 'Ritmo', description: 'Complete 10 check-ins.', icon: 'activity', metric: 'checkins', target: 10, xp_reward: 500, coin_reward: 100 },
  { id: 'checkins_50', name: 'Rotina de atleta', description: 'Complete 50 check-ins.', icon: 'trending-up', metric: 'checkins', target: 50, xp_reward: 1500, coin_reward: 250 },
  { id: 'checkins_100', name: 'Centurião', description: 'Complete 100 check-ins.', icon: 'award', metric: 'checkins', target: 100, xp_reward: 3000, coin_reward: 500 },
  { id: 'streak_7', name: 'Semana cheia', description: 'Mantenha uma sequência de 7 dias.', icon: 'flame', metric: 'streak', target: 7, xp_reward: 700, coin_reward: 150 },
  { id: 'streak_30', name: 'Mês invicto', description: 'Mantenha uma sequência de 30 dias.', icon: 'flame', metric: 'streak', target: 30, xp_reward: 2500, coin_reward: 400 },
  { id: 'strength_25', name: 'Ferro', description: 'Registre 25 treinos de musculação.', icon: 'dumbbell', metric: 'strength_checkins', target: 25, xp_reward: 1200, coin_reward: 200 },
  { id: 'run_50km', name: 'Fôlego', description: 'Acumule 50 km de corrida.', icon: 'wind', metric: 'run_km', target: 50, xp_reward: 1200, coin_reward: 200 },
  { id: 'groups_3', name: 'Em equipe', description: 'Participe de 3 grupos.', icon: 'users', metric: 'groups_joined', target: 3, xp_reward: 400, coin_reward: 100 },
  { id: 'level_10', name: 'Veterano', description: 'Alcance o nível 10.', icon: 'shield', metric: 'level', target: 10, xp_reward: 2000, coin_reward: 300 },
] as const;

export const cosmeticById = (id: string | null | undefined) => (id ? COSMETICS.find((c) => c.id === id) : undefined);
