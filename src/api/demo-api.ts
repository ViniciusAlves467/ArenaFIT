/**
 * Implementação em memória da API, usada quando o Supabase não está configurado.
 * Usa o MESMO motor de pontuação do servidor, com uma população sintética de comparação,
 * para que a demonstração reflita fielmente as regras do TCC. Os dados somem ao recarregar.
 */
import { validateCheckinPayload } from '@shared/checkin-input.ts';
import {
  type BodyProfile,
  DEFAULT_PARAMS,
  extractMetrics,
  levelFromXp,
  type MetricContext,
  nextStreak,
  type PopulationSample,
  scoreCheckin,
} from '@shared/scoring/index.ts';

import { localDay } from '@/theme/format';

import { ACHIEVEMENTS, COSMETICS, EXERCISES, MUSCLE_LABEL } from './catalog';
import type {
  AchievementProgress,
  Api,
  Checkin,
  CheckinResult,
  CheckinSet,
  FeedItem,
  Group,
  PrivateProfile,
  Profile,
  PublicProfile,
  Session,
  WorkoutTemplate,
} from './types';

const ME = 'demo-me';
const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;
const daysAgo = (d: number, h = 18) => {
  const t = new Date(Date.now() - d * DAY);
  t.setHours(h, 0, 0, 0);
  return t;
};

// PRNG determinístico para a população sintética.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MUSCLE_RATIO: Record<string, number> = {
  chest: 0.85, back: 0.95, legs: 1.4, glutes: 1.3, shoulders: 0.55, biceps: 0.38, triceps: 0.45, core: 0.5,
};

function syntheticPopulation(key: string, sex: BodyProfile['sex']): PopulationSample[] {
  const rand = rng([...key, sex].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  const g = (mu: number, sd: number) => mu + sd * Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-9))) * Math.cos(2 * Math.PI * rand());
  return Array.from({ length: 60 }, () => {
    const body: BodyProfile = {
      sex,
      heightCm: g(sex === 'male' ? 176 : 164, 7),
      weightKg: g(sex === 'male' ? 79 : 63, 11),
      ageYears: Math.min(65, Math.max(16, g(28, 8))),
    };
    let metric: number;
    if (key.startsWith('strength:')) {
      const ex = EXERCISES.find((e) => `strength:${e.id}` === key);
      metric = body.weightKg * (MUSCLE_RATIO[ex?.muscle_group ?? 'chest'] ?? 0.6) * (sex === 'male' ? 1 : 0.6) * g(1, 0.2);
    } else if (key === 'run') metric = 300 / g(29, 5);
    else if (key === 'walk') metric = g(5.4, 0.7);
    else if (key === 'cycle') metric = g(21, 4);
    else metric = g(2.4, 0.5);
    return { body, metric: Math.max(0.1, metric) };
  });
}

const person = (id: string, name: string, accent: string, level: number, extra: Partial<PublicProfile> = {}): PublicProfile => ({
  id,
  username: name.toLowerCase().replace(/\s/g, ''),
  display_name: name,
  avatar: { symbol: name.slice(0, 2).toUpperCase(), accent },
  equipped_frame: null,
  equipped_title: null,
  equipped_emblem: null,
  level,
  ...extra,
});

const OTHERS: PublicProfile[] = [
  person('u-bruna', 'Bruna', '#FFB547', 9, { equipped_frame: 'frame_ember', equipped_title: 'title_iron', equipped_emblem: 'emblem_flame' }),
  person('u-caio', 'Caio', '#E5E5E5', 7, { equipped_frame: 'frame_steel', equipped_title: 'title_pacer' }),
  person('u-duda', 'Duda', '#F43F5E', 6, { equipped_emblem: 'emblem_target' }),
  person('u-enzo', 'Enzo', '#8A8F98', 4),
  person('u-fe', 'Fernanda', '#FF8A3D', 11, { equipped_frame: 'frame_gold', equipped_title: 'title_relentless', equipped_emblem: 'emblem_crown' }),
  person('u-gui', 'Gui', '#FF6A13', 3),
];

interface MemberRow { group_id: string; user_id: string; role: 'owner' | 'admin' | 'member'; points: number; checkins_count: number }
interface CheckinRow extends Checkin { sets: CheckinSet[]; photo_url: string | null }
interface CheckinGroupRow { checkin_id: string; group_id: string; status: 'approved' | 'rejected'; points: number; approvals: number; rejections: number; created_at: string }
interface VoteRow { checkin_id: string; group_id: string; voter_id: string; vote: 'approve' | 'reject' }

function makeGroup(id: string, name: string, extra: Partial<Group>): Group {
  return {
    id,
    name,
    description: null,
    owner_id: ME,
    visibility: 'private',
    invite_code: id.slice(-6).toUpperCase().padEnd(6, 'X'),
    starts_on: localDay(daysAgo(20)),
    ends_on: localDay(new Date(Date.now() + 18 * DAY)),
    accent: '#FF6A13',
    max_members: 50,
    require_photo: true,
    require_location: true,
    created_at: daysAgo(20).toISOString(),
    ...extra,
  };
}

function createState() {
  const me: Profile = {
    id: ME,
    username: 'voce',
    display_name: 'Você',
    avatar: { symbol: 'VC', accent: '#FF6A13' },
    equipped_frame: 'frame_steel',
    equipped_title: 'title_steady',
    equipped_emblem: 'emblem_bolt',
    equipped_banner: 'banner_sunset',
    xp: 0,
    level: 1,
    coins: 640,
    current_streak: 0,
    best_streak: 0,
    last_checkin_day: null,
    first_activity_at: null,
    weekly_goal: 4,
    favorite_group_id: 'g-tcc',
    timezone: 'America/Sao_Paulo',
    onboarded_at: new Date().toISOString(),
  };
  const priv: PrivateProfile = {
    full_name: 'Usuário Demo',
    birth_date: '2001-05-12',
    sex: 'female',
    height_cm: 166,
    weight_kg: 63,
    terms_accepted_at: new Date().toISOString(),
  };

  const groups: Group[] = [
    makeGroup('g-tcc', 'Turma do TCC', { description: 'Desafio da turma até a banca. Foto + emoji do dia valem ponto.', invite_code: 'TCC26A' }),
    makeGroup('g-paulista', 'Corredores da Paulista', {
      owner_id: 'u-caio', visibility: 'public', accent: '#FFB547', require_location: false, invite_code: 'RUNSP1',
      description: 'Pace livre, constância obrigatória. Domingo é longão.', ends_on: null,
    }),
    makeGroup('g-30d', 'Desafio 30 dias', {
      owner_id: 'u-fe', visibility: 'public', invite_code: 'D30DIA', description: '30 dias, um check-in por dia. Descanso conta.',
      starts_on: localDay(daysAgo(5)), ends_on: localDay(new Date(Date.now() + 25 * DAY)),
    }),
    makeGroup('g-iron', 'Iron Club', {
      owner_id: 'u-bruna', visibility: 'public', invite_code: 'IRON01', description: 'Musculação, progressão de carga e zero desculpa.', ends_on: null,
    }),
  ];

  const members: MemberRow[] = [
    { group_id: 'g-tcc', user_id: ME, role: 'owner', points: 0, checkins_count: 0 },
    ...['u-bruna', 'u-caio', 'u-duda', 'u-enzo'].map((u) => ({ group_id: 'g-tcc', user_id: u, role: 'member' as const, points: 0, checkins_count: 0 })),
    { group_id: 'g-paulista', user_id: 'u-caio', role: 'owner', points: 0, checkins_count: 0 },
    { group_id: 'g-paulista', user_id: ME, role: 'member', points: 0, checkins_count: 0 },
    { group_id: 'g-paulista', user_id: 'u-gui', role: 'member', points: 0, checkins_count: 0 },
    { group_id: 'g-paulista', user_id: 'u-fe', role: 'member', points: 0, checkins_count: 0 },
    { group_id: 'g-30d', user_id: 'u-fe', role: 'owner', points: 0, checkins_count: 0 },
    { group_id: 'g-30d', user_id: 'u-duda', role: 'member', points: 0, checkins_count: 0 },
    { group_id: 'g-iron', user_id: 'u-bruna', role: 'owner', points: 0, checkins_count: 0 },
    { group_id: 'g-iron', user_id: 'u-enzo', role: 'member', points: 0, checkins_count: 0 },
  ];

  return {
    session: null as Session | null,
    me,
    priv,
    groups,
    members,
    checkins: [] as CheckinRow[],
    checkinGroups: [] as CheckinGroupRow[],
    votes: [] as VoteRow[],
    owned: new Set<string>(['frame_steel', 'title_steady', 'banner_sunset']),
    templates: [
      {
        id: 't-a', name: 'Treino A — Peito e tríceps', type: 'strength', variant: null, weekdays: [1, 4], group_ids: ['g-tcc'], position: 0,
        duration_min: null, distance_km: null,
        exercises: [
          { exerciseId: 'bench_press_barbell', sets: [{ loadKg: 30, reps: 10 }, { loadKg: 32.5, reps: 8 }, { loadKg: 32.5, reps: 8 }] },
          { exerciseId: 'incline_bench_dumbbell', sets: [{ loadKg: 12, reps: 10 }, { loadKg: 12, reps: 10 }] },
          { exerciseId: 'triceps_pushdown', sets: [{ loadKg: 20, reps: 12 }, { loadKg: 20, reps: 12 }] },
        ],
      },
      {
        id: 't-b', name: 'Treino B — Pernas', type: 'strength', variant: null, weekdays: [2, 5], group_ids: ['g-tcc'], position: 1,
        duration_min: null, distance_km: null,
        exercises: [
          { exerciseId: 'back_squat', sets: [{ loadKg: 40, reps: 10 }, { loadKg: 45, reps: 8 }] },
          { exerciseId: 'leg_press_45', sets: [{ loadKg: 100, reps: 12 }, { loadKg: 110, reps: 10 }] },
        ],
      },
      {
        id: 't-c', name: 'Rodagem de sábado', type: 'run', variant: null, weekdays: [6], group_ids: ['g-tcc', 'g-paulista'], position: 2,
        duration_min: 35, distance_km: 6, exercises: [],
      },
    ] as WorkoutTemplate[],
    completed: new Map<string, string>(),
    listeners: new Set<(s: Session | null) => void>(),
  };
}

const state = createState();

function addCheckin(row: Omit<CheckinRow, 'id' | 'day'> & { id?: string }, groupIds: string[]) {
  const id = row.id ?? `c-${Math.random().toString(36).slice(2, 10)}`;
  const day = localDay(new Date(row.performed_at));
  const full: CheckinRow = { ...row, id, day };
  state.checkins.unshift(full);
  const groups: { group_id: string; points: number }[] = [];
  for (const gid of groupIds) {
    const member = state.members.find((m) => m.group_id === gid && m.user_id === row.user_id);
    if (!member) continue;
    const already = state.checkinGroups.some((cg) => {
      if (cg.group_id !== gid || cg.status !== 'approved' || cg.points <= 0) return false;
      const c = state.checkins.find((x) => x.id === cg.checkin_id);
      return c?.user_id === row.user_id && c.day === day;
    });
    const points = already ? 0 : row.points;
    state.checkinGroups.unshift({ checkin_id: id, group_id: gid, status: 'approved', points, approvals: 0, rejections: 0, created_at: row.performed_at });
    member.points += points;
    member.checkins_count += 1;
    groups.push({ group_id: gid, points });
  }
  return { id, day, groups };
}

const SAMPLE_TITLES: Record<string, string[]> = {
  run: ['Rodagem leve', 'Intervalado', 'Longão', 'Corrida no parque'],
  walk: ['Caminhada', 'Caminhada com o cachorro'],
  cycle: ['Pedal urbano', 'Bike na ciclovia'],
  rest: ['Descanso ativo', 'Alongamento'],
};

function scoreFor(userId: string, activity: Parameters<typeof extractMetrics>[0], at: Date, body: BodyProfile) {
  const metrics = extractMetrics(activity, DEFAULT_PARAMS);
  const context: Record<string, MetricContext> = {};
  for (const m of metrics) {
    const history = state.checkins
      .filter((c) => c.user_id === userId && new Date(c.performed_at) < at)
      .flatMap((c) => (c.breakdown.metrics ?? []).filter((x) => x.key === m.key).map((x) => ({ metric: x.metric, performedAt: new Date(c.performed_at) })));
    context[m.key] = { samples: syntheticPopulation(m.key, body.sex), reference: null, history };
  }
  const first = state.checkins.filter((c) => c.user_id === userId && c.type !== 'rest').at(-1);
  return scoreCheckin({ activity, body, now: at, firstActivityAt: first ? new Date(first.performed_at) : null, context });
}

// Histórico sintético: os outros membros e o próprio usuário já treinaram nas últimas semanas.
(function seedHistory() {
  const rand = rng(42);
  const bodies: Record<string, BodyProfile> = {
    [ME]: { sex: 'female', heightCm: 166, weightKg: 63, ageYears: 25 },
    'u-bruna': { sex: 'female', heightCm: 168, weightKg: 64, ageYears: 26 },
    'u-caio': { sex: 'male', heightCm: 180, weightKg: 76, ageYears: 29 },
    'u-duda': { sex: 'female', heightCm: 160, weightKg: 57, ageYears: 23 },
    'u-enzo': { sex: 'male', heightCm: 174, weightKg: 82, ageYears: 31 },
    'u-fe': { sex: 'female', heightCm: 171, weightKg: 66, ageYears: 27 },
    'u-gui': { sex: 'male', heightCm: 177, weightKg: 70, ageYears: 22 },
  };
  const style: Record<string, ('strength' | 'run' | 'walk' | 'cycle' | 'rest')[]> = {
    [ME]: ['strength', 'strength', 'run', 'rest'],
    'u-bruna': ['strength', 'strength', 'strength', 'rest'],
    'u-caio': ['run', 'run', 'cycle', 'rest'],
    'u-duda': ['strength', 'walk', 'rest'],
    'u-enzo': ['strength', 'run'],
    'u-fe': ['run', 'strength', 'cycle', 'rest'],
    'u-gui': ['run', 'walk'],
  };
  const activeRate: Record<string, number> = { [ME]: 0.7, 'u-bruna': 0.8, 'u-caio': 0.65, 'u-duda': 0.5, 'u-enzo': 0.4, 'u-fe': 0.85, 'u-gui': 0.35 };
  const picks = (ids: string[]) => ids[Math.floor(rand() * ids.length)];
  const strengthIds = ['bench_press_barbell', 'incline_bench_dumbbell', 'lat_pulldown', 'barbell_row', 'back_squat', 'leg_press_45', 'overhead_press_dumbbell', 'barbell_curl', 'triceps_pushdown'];

  const events: { user: string; day: number }[] = [];
  for (const user of Object.keys(bodies)) {
    for (let d = 26; d >= 1; d--) if (rand() < activeRate[user]) events.push({ user, day: d });
  }
  events.sort((a, b) => b.day - a.day);

  for (const { user, day } of events) {
    const body = bodies[user];
    const type = style[user][Math.floor(rand() * style[user].length)];
    const at = daysAgo(day, 6 + Math.floor(rand() * 15));
    const progress = 1 + (26 - day) * 0.006;
    let activity: Parameters<typeof extractMetrics>[0];
    let sets: CheckinSet[] = [];
    if (type === 'strength') {
      const chosen = [...new Set([picks(strengthIds), picks(strengthIds), picks(strengthIds)])];
      sets = chosen.flatMap((ex, i) => {
        const base = body.weightKg * (body.sex === 'male' ? 0.9 : 0.5) * (ex.includes('squat') || ex.includes('press_45') ? 1.4 : ex.includes('curl') || ex.includes('triceps') ? 0.4 : 0.8);
        const load = Math.round((base * progress * (0.9 + rand() * 0.2)) / 2.5) * 2.5;
        return [1, 2, 3].map((p) => ({ exercise_id: ex, position: p + i * 3, load_kg: load, reps: 8 + Math.floor(rand() * 5) }));
      });
      activity = {
        type,
        exercises: chosen.map((ex) => ({
          exerciseId: ex,
          muscleGroup: EXERCISES.find((e) => e.id === ex)!.muscle_group,
          sets: sets.filter((s) => s.exercise_id === ex).map((s) => ({ loadKg: s.load_kg, reps: s.reps })),
        })),
      };
    } else if (type === 'rest') {
      activity = { type };
    } else {
      const km = type === 'cycle' ? 15 + rand() * 20 : type === 'walk' ? 3 + rand() * 4 : 4 + rand() * 7;
      const speed = type === 'cycle' ? 20 : type === 'walk' ? 5.5 : (60 / (6.2 - (body.sex === 'male' ? 0.6 : 0))) * progress;
      activity = { type, distanceKm: Math.round(km * 10) / 10, durationMin: Math.round((km / speed) * 60 * (0.95 + rand() * 0.1)) };
    }
    const b = scoreFor(user, activity, at, body);
    // Cada grupo recebe o que combina com ele (corrida só cardio, Iron Club só musculação).
    const fits = (gid: string) => (gid === 'g-paulista' ? type !== 'strength' : gid === 'g-iron' ? type === 'strength' : true);
    const groupIds = state.members.filter((m) => m.user_id === user && fits(m.group_id)).map((m) => m.group_id);
    const muscles = [...new Set(sets.map((x) => EXERCISES.find((e) => e.id === x.exercise_id)?.muscle_group))].map((m) => MUSCLE_LABEL[m ?? '']);
    const titles = type === 'strength' ? [muscles.slice(0, 2).join(' e ')] : (SAMPLE_TITLES[type] ?? ['Treino']);
    addCheckin(
      {
        user_id: user,
        type,
        title: titles[Math.floor(rand() * titles.length)],
        notes: null,
        performed_at: at.toISOString(),
        duration_min: activity.durationMin ?? (type === 'strength' ? 50 + Math.floor(rand() * 30) : null),
        distance_km: activity.distanceKm ?? null,
        variant: activity.variant ?? null,
        elevation_m: null,
        photo_path: null,
        photo_url: null,
        emoji: '✌️',
        has_location: true,
        points: b.points,
        xp: b.xp,
        coins: b.coins,
        bonus: b.bonus,
        breakdown: b,
        sets,
      },
      groupIds,
    );
    if (user === ME) applyRewards(b.xp, b.coins, at, type);
  }
})();

function applyRewards(xp: number, coins: number, at: Date, type: string) {
  const day = localDay(at);
  const streak = nextStreak(state.me.current_streak, state.me.last_checkin_day, day);
  state.me.xp += xp;
  state.me.coins += coins;
  state.me.current_streak = streak;
  state.me.best_streak = Math.max(state.me.best_streak, streak);
  state.me.last_checkin_day = state.me.last_checkin_day && state.me.last_checkin_day > day ? state.me.last_checkin_day : day;
  if (type !== 'rest' && !state.me.first_activity_at) state.me.first_activity_at = at.toISOString();
  state.me.level = levelFromXp(state.me.xp);
}

function achievementProgress(): AchievementProgress[] {
  const mine = state.checkins.filter((c) => c.user_id === ME);
  const value = (metric: string) => {
    switch (metric) {
      case 'checkins': return mine.length;
      case 'strength_checkins': return mine.filter((c) => c.type === 'strength').length;
      case 'run_km': return mine.filter((c) => c.type === 'run').reduce((a, c) => a + (c.distance_km ?? 0), 0);
      case 'streak': return state.me.best_streak;
      case 'groups_joined': return state.members.filter((m) => m.user_id === ME).length;
      case 'level': return state.me.level;
      default: return 0;
    }
  };
  return ACHIEVEMENTS.map((a) => {
    const progress = Math.min(value(a.metric), a.target);
    return { ...a, progress, completed_at: progress >= a.target ? (state.completed.get(a.id) ?? new Date().toISOString()) : null };
  });
}

function profileOf(id: string): PublicProfile {
  if (id === ME) return state.me;
  return OTHERS.find((o) => o.id === id)!;
}

function emitAuth() {
  state.listeners.forEach((l) => l(state.session));
}

const todayEmoji = () => ['✌️', '👍', '🤘', '👊', '🤙', '👌', '🖐️', '☝️', '🤞', '💪'][new Date().getDate() % 10];

export const demoApi: Api = {
  mode: 'demo',

  auth: {
    async getSession() {
      return state.session;
    },
    onChange(cb) {
      state.listeners.add(cb);
      return () => state.listeners.delete(cb);
    },
    async signInWithPassword(email) {
      await wait(400);
      state.session = { userId: ME, email };
      emitAuth();
    },
    async signUp(email, _password, fullName) {
      await wait(400);
      state.priv.full_name = fullName;
      state.me.display_name = fullName.split(' ')[0];
      state.me.username = null;
      state.me.onboarded_at = null;
      state.session = { userId: ME, email };
      emitAuth();
      return { needsConfirmation: false };
    },
    async signInWithGoogle() {
      await demoApi.auth.signInWithPassword('demo@arenafit.app', '');
    },
    async exchangeCode() {},
    async signOut() {
      state.session = null;
      emitAuth();
    },
  },

  async getMe() {
    await wait(120);
    return { email: state.session?.email ?? null, profile: { ...state.me }, private: { ...state.priv } };
  },
  async updateProfile(patch) {
    await wait();
    if (patch.username && !/^[a-z0-9_.]{3,20}$/.test(patch.username)) throw new Error('Nome de usuário inválido');
    Object.assign(state.me, patch);
  },
  async updatePrivate(patch) {
    await wait();
    Object.assign(state.priv, patch);
  },

  async listMyGroups() {
    await wait();
    return state.members
      .filter((m) => m.user_id === ME)
      .map((m) => {
        const g = state.groups.find((x) => x.id === m.group_id)!;
        const ranking = state.members.filter((x) => x.group_id === g.id).sort((a, b) => b.points - a.points);
        return { ...g, member_count: ranking.length, my_points: m.points, my_rank: ranking.findIndex((r) => r.user_id === ME) + 1, my_role: m.role };
      });
  },
  async listPublicGroups(search) {
    await wait();
    return state.groups
      .filter((g) => g.visibility === 'public' && (!search || g.name.toLowerCase().includes(search.toLowerCase())))
      .map((g) => ({
        ...g,
        member_count: state.members.filter((m) => m.group_id === g.id).length,
        is_member: state.members.some((m) => m.group_id === g.id && m.user_id === ME),
      }));
  },
  async getGroup(id) {
    await wait(80);
    const g = state.groups.find((x) => x.id === id);
    if (!g) throw new Error('Grupo não encontrado');
    return g;
  },
  async getRanking(groupId) {
    await wait();
    return state.members
      .filter((m) => m.group_id === groupId)
      .sort((a, b) => b.points - a.points || b.checkins_count - a.checkins_count)
      .map((m) => ({ user_id: m.user_id, points: m.points, checkins_count: m.checkins_count, role: m.role, profile: profileOf(m.user_id) }));
  },
  async getFeed(groupId) {
    await wait();
    return state.checkinGroups
      .filter((cg) => cg.group_id === groupId)
      .slice(0, 40)
      .map((cg): FeedItem => {
        const c = state.checkins.find((x) => x.id === cg.checkin_id)!;
        const mine = state.votes.find((v) => v.checkin_id === cg.checkin_id && v.group_id === groupId && v.voter_id === ME);
        return { ...cg, my_vote: mine?.vote ?? null, photo_url: c.photo_url, checkin: { ...c, profile: profileOf(c.user_id) } };
      });
  },
  async createGroup(input) {
    await wait();
    const g = makeGroup(`g-${Math.random().toString(36).slice(2, 8)}`, input.name, {
      ...input,
      description: input.description ?? null,
      starts_on: localDay(),
      created_at: new Date().toISOString(),
      invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });
    state.groups.push(g);
    state.members.push({ group_id: g.id, user_id: ME, role: 'owner', points: 0, checkins_count: 0 });
    return g;
  },
  async joinGroup(by) {
    await wait();
    const g = by.code
      ? state.groups.find((x) => x.invite_code === by.code!.trim().toUpperCase())
      : state.groups.find((x) => x.id === by.id && x.visibility === 'public');
    if (!g) throw new Error('Grupo não encontrado');
    if (!state.members.some((m) => m.group_id === g.id && m.user_id === ME)) {
      state.members.push({ group_id: g.id, user_id: ME, role: 'member', points: 0, checkins_count: 0 });
    }
    return g;
  },
  async leaveGroup(groupId) {
    await wait();
    const m = state.members.find((x) => x.group_id === groupId && x.user_id === ME);
    if (m?.role === 'owner') throw new Error('O dono não pode sair do grupo');
    state.members = state.members.filter((x) => x !== m);
    if (state.me.favorite_group_id === groupId) state.me.favorite_group_id = null;
  },
  async vote(checkinId, groupId, vote) {
    await wait(100);
    const cg = state.checkinGroups.find((x) => x.checkin_id === checkinId && x.group_id === groupId);
    const c = state.checkins.find((x) => x.id === checkinId);
    if (!cg || !c) return;
    if (c.user_id === ME) throw new Error('Você não pode votar no próprio check-in');
    state.votes = state.votes.filter((v) => !(v.checkin_id === checkinId && v.group_id === groupId && v.voter_id === ME));
    if (vote) state.votes.push({ checkin_id: checkinId, group_id: groupId, voter_id: ME, vote });
    const votes = state.votes.filter((v) => v.checkin_id === checkinId && v.group_id === groupId);
    const approvals = votes.filter((v) => v.vote === 'approve').length;
    const rejections = votes.filter((v) => v.vote === 'reject').length;
    const others = state.members.filter((m) => m.group_id === groupId).length - 1;
    const needed = Math.min(3, Math.max(1, Math.ceil(others / 2)));
    const status = rejections >= needed && rejections > approvals ? 'rejected' : 'approved';
    if (status !== cg.status) {
      const member = state.members.find((m) => m.group_id === groupId && m.user_id === c.user_id);
      if (member) {
        member.points += status === 'rejected' ? -cg.points : cg.points;
        member.checkins_count += status === 'rejected' ? -1 : 1;
      }
    }
    Object.assign(cg, { status, approvals, rejections });
  },

  async getDailyEmoji() {
    return todayEmoji();
  },
  async listExercises() {
    return EXERCISES;
  },
  async uploadCheckinPhoto(localUri) {
    await wait(300);
    return `${ME}/${Date.now()}.jpg#${localUri}`;
  },
  async submitCheckin(raw): Promise<CheckinResult> {
    await wait(600);
    const now = new Date();
    const parsed = validateCheckinPayload(raw, { userId: ME, now });
    if (!parsed.ok) throw new Error(parsed.errors[0]);
    const p = parsed.value;
    for (const gid of p.groupIds ?? []) {
      const g = state.groups.find((x) => x.id === gid);
      if (!g) continue;
      if (g.require_photo && !p.photoPath) throw new Error(`"${g.name}" exige foto no check-in`);
      if (g.require_location && !p.location) throw new Error(`"${g.name}" exige localização`);
    }
    const at = p.performedAt ? new Date(p.performedAt) : now;
    const body: BodyProfile = {
      sex: state.priv.sex ?? 'female',
      heightCm: Number(state.priv.height_cm ?? 165),
      weightKg: Number(state.priv.weight_kg ?? 65),
      ageYears: state.priv.birth_date ? (at.getTime() - Date.parse(state.priv.birth_date)) / (365.25 * DAY) : 25,
    };
    const activity = {
      type: p.type,
      durationMin: p.durationMin,
      distanceKm: p.distanceKm,
      variant: p.variant,
      elevationM: p.elevationM,
      exercises: p.exercises?.map((e) => ({
        exerciseId: e.exerciseId,
        muscleGroup: EXERCISES.find((x) => x.id === e.exerciseId)?.muscle_group ?? 'core',
        sets: e.sets,
      })),
    };
    const breakdown = scoreFor(ME, activity, at, body);
    const sets: CheckinSet[] = (p.exercises ?? []).flatMap((e) =>
      e.sets.map((s, i) => ({ exercise_id: e.exerciseId, position: i + 1, load_kg: s.loadKg, reps: s.reps })),
    );
    const before = new Set(achievementProgress().filter((a) => a.completed_at).map((a) => a.id));
    const { id, groups } = addCheckin(
      {
        user_id: ME,
        type: p.type,
        title: p.title ?? null,
        notes: p.notes ?? null,
        performed_at: at.toISOString(),
        duration_min: p.durationMin ?? null,
        distance_km: p.distanceKm ?? null,
        variant: p.variant ?? null,
        elevation_m: p.elevationM ?? null,
        photo_path: p.photoPath ?? null,
        photo_url: p.photoPath?.split('#')[1] ?? null,
        emoji: p.emoji ?? null,
        has_location: !!p.location,
        points: breakdown.points,
        xp: breakdown.xp,
        coins: breakdown.coins,
        bonus: breakdown.bonus,
        breakdown,
        sets,
      },
      p.groupIds ?? [],
    );
    applyRewards(breakdown.xp, breakdown.coins, at, p.type);
    const unlocked = achievementProgress()
      .filter((a) => a.completed_at && !before.has(a.id))
      .map((a) => {
        state.completed.set(a.id, new Date().toISOString());
        state.me.xp += a.xp_reward;
        state.me.coins += a.coin_reward;
        return { id: a.id, name: a.name, icon: a.icon, xp: a.xp_reward, coins: a.coin_reward };
      });
    state.me.level = levelFromXp(state.me.xp);
    return {
      checkin_id: id,
      points: breakdown.points,
      xp: breakdown.xp,
      coins: breakdown.coins,
      groups,
      unlocked,
      profile: { xp: state.me.xp, level: state.me.level, coins: state.me.coins, current_streak: state.me.current_streak, best_streak: state.me.best_streak },
      breakdown,
    };
  },
  async listMyCheckins(limit = 30) {
    await wait();
    return state.checkins.filter((c) => c.user_id === ME).slice(0, limit);
  },

  async listTemplates() {
    await wait(100);
    return [...state.templates].sort((a, b) => a.position - b.position);
  },
  async saveTemplate({ id, ...input }) {
    await wait();
    const existing = id ? state.templates.find((t) => t.id === id) : undefined;
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    if (state.templates.length >= 20) throw new Error('Limite de 20 treinos fixos');
    const t: WorkoutTemplate = { ...input, id: `t-${Math.random().toString(36).slice(2, 8)}`, position: state.templates.length };
    state.templates.push(t);
    return t;
  },
  async deleteTemplate(id) {
    await wait();
    state.templates = state.templates.filter((t) => t.id !== id);
  },

  async listCosmetics() {
    return COSMETICS.filter((c) => c.kind !== 'accent');
  },
  async listOwnedCosmetics() {
    return [...state.owned];
  },
  async purchaseCosmetic(id) {
    await wait(300);
    const c = COSMETICS.find((x) => x.id === id);
    if (!c) throw new Error('Item não encontrado');
    if (state.owned.has(id)) throw new Error('Você já possui este item');
    if (state.me.level < c.min_level) throw new Error(`Requer nível ${c.min_level}`);
    if (state.me.coins < c.price) throw new Error('Moedas insuficientes');
    state.me.coins -= c.price;
    state.owned.add(id);
  },
  async listAchievements() {
    await wait();
    return achievementProgress();
  },

  async exportMyData() {
    return { profile: state.me, private: state.priv, checkins: state.checkins.filter((c) => c.user_id === ME) };
  },
  async deleteAccount() {
    await wait(400);
    state.session = null;
    emitAuth();
  },
};
