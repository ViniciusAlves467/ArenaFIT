import { type BodyProfile, type ComparisonResult, computeComparison, type PopulationSample, type ReferenceQuantiles } from './comparison.ts';
import { combineScore, computeHistory, type HistoryEntry, type HistoryResult } from './history.ts';
import { DEFAULT_PARAMS, type ScoringParams } from './params.ts';
import { bonusFromScore, rewardsFromBonus } from './rewards.ts';
import { type ActivityVariant, type CycleVariant, cyclingMetric, swimMetricKey, swimmingMetric, type SwimVariant, walkingMetric } from './endurance.ts';
import { runningMetric } from './running.ts';
import { mean, median } from './stats.ts';
import { type StrengthSet, strengthMetric } from './strength.ts';

export type ActivityType = 'strength' | 'run' | 'walk' | 'cycle' | 'swim' | 'rest';

export interface ExerciseLog {
  exerciseId: string;
  /** Grupo muscular primário — um único por exercício, para evitar contagem dupla (7.5). */
  muscleGroup: string;
  sets: StrengthSet[];
}

export interface ActivityLog {
  type: ActivityType;
  exercises?: ExerciseLog[];
  durationMin?: number;
  distanceKm?: number;
  /** Ciclismo: 'road' | 'indoor'. Natação: 'pool' | 'open_water'. */
  variant?: ActivityVariant;
  /** Ciclismo: ganho de elevação acumulado (m). */
  elevationM?: number;
}

export interface ExtractedMetric {
  /** Chave da distribuição: `strength:<exerciseId>`, `run`, `walk`, `cycle`, `swim_pool`, `swim_open`. */
  key: string;
  metric: number;
  exerciseId?: string;
  muscleGroup?: string;
}

/** Contexto estatístico de uma chave de métrica, carregado do banco pelo servidor. */
export interface MetricContext {
  samples: PopulationSample[];
  reference?: ReferenceQuantiles | null;
  history: HistoryEntry[];
}

export interface MetricBreakdown extends ExtractedMetric {
  comparison: ComparisonResult;
  history: HistoryResult;
  S: number;
}

export interface MuscleGroupBreakdown {
  muscleGroup: string;
  S: number;
  exerciseIds: string[];
}

export interface ScoreBreakdown {
  type: ActivityType;
  /** false para descanso ou quando não há métrica válida (sem bônus variável). */
  performanceEligible: boolean;
  S: number | null;
  bonus: number | null;
  points: number;
  xp: number;
  coins: number;
  metrics: MetricBreakdown[];
  muscleGroups: MuscleGroupBreakdown[];
  notes: string[];
  paramsVersion: string;
}

export const metricKeyForExercise = (exerciseId: string) => `strength:${exerciseId}`;

/** Passos 3–4 do algoritmo: identifica a modalidade e calcula a métrica bruta. */
export function extractMetrics(activity: ActivityLog, params: ScoringParams = DEFAULT_PARAMS): ExtractedMetric[] {
  switch (activity.type) {
    case 'rest':
      return [];
    case 'strength': {
      const out: ExtractedMetric[] = [];
      for (const ex of activity.exercises ?? []) {
        const metric = strengthMetric(ex.sets, params);
        if (metric === null) continue;
        out.push({ key: metricKeyForExercise(ex.exerciseId), metric, exerciseId: ex.exerciseId, muscleGroup: ex.muscleGroup });
      }
      return out;
    }
    case 'run': {
      const metric = runningMetric(activity.durationMin ?? 0, activity.distanceKm ?? 0, params);
      return metric === null ? [] : [{ key: 'run', metric }];
    }
    case 'walk': {
      const metric = walkingMetric(activity.durationMin ?? 0, activity.distanceKm ?? 0, params);
      return metric === null ? [] : [{ key: 'walk', metric }];
    }
    case 'cycle': {
      const variant = activity.variant as CycleVariant | undefined;
      const metric = cyclingMetric(activity.durationMin ?? 0, activity.distanceKm ?? 0, variant, activity.elevationM, params);
      return metric === null ? [] : [{ key: 'cycle', metric }];
    }
    case 'swim': {
      const metric = swimmingMetric(activity.durationMin ?? 0, activity.distanceKm ?? 0, params);
      return metric === null ? [] : [{ key: swimMetricKey(activity.variant as SwimVariant | undefined), metric }];
    }
  }
}

export interface ScoreInput {
  activity: ActivityLog;
  body: BodyProfile;
  now: Date;
  firstActivityAt: Date | null;
  context: Record<string, MetricContext | undefined>;
  params?: ScoringParams;
}

/** Algoritmo conceitual completo (seção 12), com todos os componentes registrados para auditoria. */
export function scoreCheckin(input: ScoreInput): ScoreBreakdown {
  const params = input.params ?? DEFAULT_PARAMS;
  const paramsVersion = `K${params.confidenceK}-W${params.historyWindowDays}-M${params.minHistoryRecords}-${params.confidenceSampleMode}`;
  const notes: string[] = [];

  if (input.activity.type === 'rest') {
    return {
      type: 'rest',
      performanceEligible: false,
      S: null,
      bonus: null,
      points: params.rest.points,
      xp: params.rest.xp,
      coins: params.coinsPerRest,
      metrics: [],
      muscleGroups: [],
      notes: ['Descanso/recuperação: sem bônus de desempenho, apenas recompensa base.'],
      paramsVersion,
    };
  }

  const metrics: MetricBreakdown[] = extractMetrics(input.activity, params).map((m) => {
    const ctx = input.context[m.key] ?? { samples: [], history: [], reference: null };
    const comparison = computeComparison({ metric: m.metric, body: input.body, samples: ctx.samples, reference: ctx.reference, params });
    const history = computeHistory({ metric: m.metric, history: ctx.history, firstActivityAt: input.firstActivityAt, now: input.now, params });
    return { ...m, comparison, history, S: combineScore(comparison.C, history, params) };
  });

  let S: number;
  let muscleGroups: MuscleGroupBreakdown[] = [];

  if (metrics.length === 0) {
    S = params.neutralComparison;
    notes.push(
      input.activity.type === 'cycle' && input.activity.variant === 'indoor'
        ? 'Bike indoor não é comparável entre aparelhos: aplicado bônus neutro (12,5%).'
        : 'Nenhuma métrica válida para comparação: aplicado fallback neutro (C = 0,50).',
    );
  } else if (input.activity.type === 'strength') {
    // S_músculo = mediana(Sₑ) ; S_treino = média(S_músculo)
    const byGroup = new Map<string, MetricBreakdown[]>();
    for (const m of metrics) {
      const g = m.muscleGroup ?? 'outros';
      byGroup.set(g, [...(byGroup.get(g) ?? []), m]);
    }
    muscleGroups = [...byGroup.entries()].map(([muscleGroup, items]) => ({
      muscleGroup,
      S: median(items.map((i) => i.S)),
      exerciseIds: items.map((i) => i.exerciseId ?? i.key),
    }));
    S = mean(muscleGroups.map((g) => g.S));
  } else {
    S = metrics[0].S;
  }

  if (metrics.some((m) => m.comparison.source === 'neutral')) {
    notes.push('Sem referência confiável para ao menos uma métrica: comparação parte do neutro 0,50.');
  }
  if (metrics.some((m) => m.history.reason === 'warmup')) {
    notes.push('Período inicial (3 semanas): score 100% comparação externa.');
  }

  const bonus = bonusFromScore(S, params);
  const rewards = rewardsFromBonus(bonus, params);

  return {
    type: input.activity.type,
    performanceEligible: metrics.length > 0,
    S,
    bonus,
    points: rewards.points,
    xp: rewards.xp,
    coins: params.coinsPerWorkout,
    metrics,
    muscleGroups,
    notes,
    paramsVersion,
  };
}
