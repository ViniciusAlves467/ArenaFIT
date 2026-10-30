/**
 * Contrato e validação do payload de check-in (cliente → Edge Function `submit-checkin`).
 * Código puro: roda no app (validação antecipada) e no servidor (validação definitiva).
 */
import type { ActivityType } from './scoring/index.ts';

export const ACTIVITY_TYPES: ActivityType[] = ['strength', 'run', 'walk', 'cycle', 'swim', 'rest'];
export const CARDIO_TYPES: ActivityType[] = ['run', 'walk', 'cycle', 'swim'];

export interface CheckinSetInput {
  loadKg: number;
  reps: number;
}

export interface CheckinExerciseInput {
  exerciseId: string;
  sets: CheckinSetInput[];
}

export interface CheckinPayload {
  type: ActivityType;
  title?: string;
  notes?: string;
  /** ISO 8601. Padrão: agora. Aceito até 36 h no passado. */
  performedAt?: string;
  durationMin?: number;
  distanceKm?: number;
  exercises?: CheckinExerciseInput[];
  /** Caminho no bucket `checkin-photos`, sempre `<user_id>/<arquivo>`. */
  photoPath?: string;
  /** Emoji do dia mostrado na foto. */
  emoji?: string;
  location?: { lat: number; lng: number; accuracyM?: number };
  groupIds?: string[];
}

export type ValidationResult = { ok: true; value: CheckinPayload } | { ok: false; errors: string[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const between = (x: unknown, min: number, max: number) => isNum(x) && x >= min && x <= max;

export const LIMITS = {
  maxExercises: 20,
  maxSetsPerExercise: 20,
  maxLoadKg: 500,
  maxReps: 100,
  maxGroups: 10,
  maxPastHours: 36,
} as const;

export function validateCheckinPayload(raw: unknown, opts: { userId: string; now?: Date }): ValidationResult {
  const errors: string[] = [];
  const now = opts.now ?? new Date();
  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: ['Payload inválido'] };
  const p = raw as Record<string, unknown>;

  const type = p.type as ActivityType;
  if (!ACTIVITY_TYPES.includes(type)) errors.push('Tipo de atividade inválido');

  if (p.title !== undefined && (typeof p.title !== 'string' || p.title.length > 60)) errors.push('Título deve ter até 60 caracteres');
  if (p.notes !== undefined && (typeof p.notes !== 'string' || p.notes.length > 500)) errors.push('Observações devem ter até 500 caracteres');

  let performedAt: string | undefined;
  if (p.performedAt !== undefined) {
    const t = typeof p.performedAt === 'string' ? Date.parse(p.performedAt) : NaN;
    if (Number.isNaN(t)) errors.push('Data do treino inválida');
    else if (t > now.getTime() + 5 * 60_000) errors.push('Data do treino no futuro');
    else if (t < now.getTime() - LIMITS.maxPastHours * 3_600_000) errors.push('Check-in só pode ser registrado até 36 h depois do treino');
    else performedAt = new Date(t).toISOString();
  }

  const exercises: CheckinExerciseInput[] = [];
  if (type === 'strength') {
    if (!Array.isArray(p.exercises) || p.exercises.length === 0) errors.push('Adicione ao menos um exercício');
    else if (p.exercises.length > LIMITS.maxExercises) errors.push(`Máximo de ${LIMITS.maxExercises} exercícios`);
    else {
      p.exercises.forEach((ex: any, i: number) => {
        if (typeof ex?.exerciseId !== 'string' || !ex.exerciseId) errors.push(`Exercício ${i + 1}: selecione o exercício`);
        if (!Array.isArray(ex?.sets) || ex.sets.length === 0 || ex.sets.length > LIMITS.maxSetsPerExercise) {
          errors.push(`Exercício ${i + 1}: informe de 1 a ${LIMITS.maxSetsPerExercise} séries`);
          return;
        }
        const sets: CheckinSetInput[] = [];
        ex.sets.forEach((s: any, j: number) => {
          if (!between(s?.loadKg, 0, LIMITS.maxLoadKg)) errors.push(`Exercício ${i + 1}, série ${j + 1}: carga inválida`);
          if (!Number.isInteger(s?.reps) || !between(s?.reps, 1, LIMITS.maxReps)) errors.push(`Exercício ${i + 1}, série ${j + 1}: repetições inválidas`);
          sets.push({ loadKg: s?.loadKg, reps: s?.reps });
        });
        exercises.push({ exerciseId: ex.exerciseId, sets });
      });
    }
  }

  if (CARDIO_TYPES.includes(type)) {
    if (!between(p.durationMin, 1, 1440)) errors.push('Informe a duração (1 a 1440 min)');
    if (!between(p.distanceKm, 0.01, 500)) errors.push('Informe a distância (km)');
  } else if (p.durationMin !== undefined && !between(p.durationMin, 1, 1440)) {
    errors.push('Duração inválida');
  }

  if (p.photoPath !== undefined) {
    if (typeof p.photoPath !== 'string' || !p.photoPath.startsWith(`${opts.userId}/`) || p.photoPath.includes('..')) {
      errors.push('Foto inválida');
    }
  }
  if (p.emoji !== undefined && (typeof p.emoji !== 'string' || p.emoji.length > 16)) errors.push('Emoji inválido');

  let location: CheckinPayload['location'];
  if (p.location !== undefined && p.location !== null) {
    const l = p.location as Record<string, unknown>;
    if (!between(l.lat, -90, 90) || !between(l.lng, -180, 180)) errors.push('Localização inválida');
    else location = { lat: l.lat as number, lng: l.lng as number, accuracyM: isNum(l.accuracyM) ? l.accuracyM : undefined };
  }

  let groupIds: string[] = [];
  if (p.groupIds !== undefined) {
    if (!Array.isArray(p.groupIds) || p.groupIds.length > LIMITS.maxGroups || !p.groupIds.every((g) => typeof g === 'string' && UUID_RE.test(g))) {
      errors.push('Grupos inválidos');
    } else groupIds = [...new Set(p.groupIds as string[])];
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      type,
      title: (p.title as string | undefined)?.trim() || undefined,
      notes: (p.notes as string | undefined)?.trim() || undefined,
      performedAt,
      durationMin: isNum(p.durationMin) ? p.durationMin : undefined,
      distanceKm: isNum(p.distanceKm) ? p.distanceKm : undefined,
      exercises: type === 'strength' ? exercises : undefined,
      photoPath: p.photoPath as string | undefined,
      emoji: p.emoji as string | undefined,
      location,
      groupIds,
    },
  };
}

export interface GroupRequirements {
  id: string;
  name: string;
  require_photo: boolean;
  require_location: boolean;
}

/** Regras de validação do grupo (estudo 2.1.2.3): foto com o emoji do dia + GPS. */
export function checkGroupRequirements(payload: CheckinPayload, groups: GroupRequirements[], dailyEmoji: string): string[] {
  const errors: string[] = [];
  for (const g of groups) {
    if (g.require_photo && !payload.photoPath) errors.push(`"${g.name}" exige foto no check-in`);
    if (g.require_photo && payload.emoji !== dailyEmoji) errors.push(`"${g.name}" exige o emoji do dia (${dailyEmoji}) na foto`);
    if (g.require_location && !payload.location) errors.push(`"${g.name}" exige localização`);
  }
  return [...new Set(errors)];
}
