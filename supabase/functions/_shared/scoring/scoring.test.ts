import { describe, expect, it } from 'vitest';

import {
  blendComparison,
  bonusFromScore,
  combineScore,
  computeComparison,
  computeHistory,
  confidence,
  DEFAULT_PARAMS,
  equivalent5kMinutes,
  estimate1RM,
  levelFromXp,
  median,
  nextStreak,
  type PopulationSample,
  rewardsFromBonus,
  roundHalfUp,
  runningMetric,
  scoreCheckin,
  type BodyProfile,
  xpForLevel,
} from './index.ts';

const P = DEFAULT_PARAMS;
const body: BodyProfile = { sex: 'female', heightCm: 165, weightKg: 62, ageYears: 24 };
const now = new Date('2026-10-30T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe('Seção 3 — bônus B = 0,05 + 0,15·S', () => {
  it.each([
    [0, 0.05],
    [0.25, 0.0875],
    [0.5, 0.125],
    [0.75, 0.1625],
    [1, 0.2],
  ])('S=%s → B=%s', (S, B) => {
    expect(bonusFromScore(S, P)).toBeCloseTo(B, 10);
  });

  it('limita o bônus entre 5% e 20% mesmo com S fora de [0,1]', () => {
    expect(bonusFromScore(-3, P)).toBeCloseTo(0.05);
    expect(bonusFromScore(7, P)).toBeCloseTo(0.2);
  });
});

describe('Seção 8 — pontos e XP com arredondamento half-up', () => {
  it.each([
    [0, 53, 1050],
    [0.25, 54, 1088],
    [0.5, 56, 1125],
    [0.75, 58, 1163],
    [1, 60, 1200],
  ])('S=%s → %s pontos / %s XP', (S, points, xp) => {
    const r = rewardsFromBonus(bonusFromScore(S, P), P);
    expect(r.points).toBe(points);
    expect(r.xp).toBe(xp);
  });

  it('arredonda 0,5 para cima e abaixo de 0,5 para baixo', () => {
    expect(roundHalfUp(87.5)).toBe(88);
    expect(roundHalfUp(6.25)).toBe(6);
    expect(roundHalfUp(7.49)).toBe(7);
  });
});

describe('Seção 5 — cold start', () => {
  it('α = N/(N+K) reproduz a tabela 5.5', () => {
    expect(confidence(2, 30)).toBeCloseTo(0.0625, 4);
    expect(confidence(5, 30)).toBeCloseTo(0.1429, 4);
    expect(confidence(30, 30)).toBeCloseTo(0.5, 4);
    expect(confidence(100, 30)).toBeCloseTo(0.7692, 4);
    expect(confidence(300, 30)).toBeCloseTo(0.9091, 4);
  });

  it('exemplo 5.7: N=5, C_app=0,70, C_inicial=0,55 → C≈0,5714 e B≈13,57%', () => {
    const C = blendComparison(0.7, 0.55, confidence(5, 30));
    expect(C).toBeCloseTo(0.5714, 4);
    expect(bonusFromScore(C, P)).toBeCloseTo(0.1357, 4);
  });

  it('sem amostras e sem referência usa o fallback neutro 0,50 (12,5%)', () => {
    const c = computeComparison({ metric: 80, body, samples: [], reference: null, params: P });
    expect(c.C).toBe(0.5);
    expect(c.source).toBe('neutral');
    expect(rewardsFromBonus(bonusFromScore(c.C, P), P)).toMatchObject({ points: 56, xp: 1125 });
  });

  it('sem amostras usa a referência inicial quando existe', () => {
    const reference = { probs: [0.1, 0.5, 0.9], values: [40, 60, 80] };
    const c = computeComparison({ metric: 70, body, samples: [], reference, params: P });
    expect(c.C).toBeCloseTo(0.7);
    expect(c.source).toBe('reference');
  });

  it('a influência da base interna cresce continuamente com N (sem saltos)', () => {
    const reference = { probs: [0.1, 0.5, 0.9], values: [40, 60, 80] };
    const sample = (metric: number): PopulationSample => ({ metric, body });
    let prevAlpha = -1;
    for (const n of [0, 1, 2, 5, 10, 30, 100, 300]) {
      // a base interna é mais forte (todos com 100) → C_app = 0 para métrica 60
      const samples = Array.from({ length: n }, () => sample(100));
      const c = computeComparison({ metric: 60, body, samples, reference, params: P });
      expect(c.alpha).toBeGreaterThanOrEqual(prevAlpha);
      prevAlpha = c.alpha;
      expect(c.C).toBeCloseTo((1 - c.alpha) * 0.5, 6);
    }
    expect(prevAlpha).toBeCloseTo(300 / 330, 3);
  });

  it('amostras de outro sexo não entram na comparação', () => {
    const samples: PopulationSample[] = Array.from({ length: 50 }, () => ({
      metric: 999,
      body: { ...body, sex: 'male' },
    }));
    const c = computeComparison({ metric: 60, body, samples, reference: null, params: P });
    expect(c.n).toBe(0);
    expect(c.C).toBe(0.5);
  });

  it('amostras distantes no corpo pesam menos (Nₑff e α menores)', () => {
    const near = Array.from({ length: 30 }, () => ({ metric: 50, body }));
    const far = Array.from({ length: 30 }, () => ({
      metric: 50,
      body: { ...body, heightCm: 195, weightKg: 110, ageYears: 60 },
    }));
    const nearOnly = computeComparison({ metric: 60, body, samples: near, reference: null, params: P });
    const farOnly = computeComparison({ metric: 60, body, samples: far, reference: null, params: P });
    expect(nearOnly.alpha).toBeCloseTo(0.5, 6);
    expect(farOnly.alpha).toBeLessThan(0.01);

    // Limitação do Nₑff de Kish: 30 amostras igualmente distantes ainda contam como 30.
    const kish = computeComparison({ metric: 60, body, samples: far, reference: null, params: { ...P, confidenceSampleMode: 'kish' } });
    expect(kish.nEff).toBeCloseTo(30, 6);
    expect(kish.alpha).toBeCloseTo(0.5, 6);

    const mixed = computeComparison({ metric: 60, body, samples: [...near.slice(0, 5), ...far], reference: null, params: P });
    expect(mixed.nEff).toBeLessThan(mixed.n);
    expect(mixed.weightSum).toBeLessThanOrEqual(mixed.nEff);
  });
});

describe('Seção 6 — histórico pessoal', () => {
  it('exemplo 6.3: C=0,40 e H=0,90 → S=0,725', () => {
    const S = combineScore(0.4, { eligible: true, H: 0.9, recordsInWindow: 6, daysActive: 30, reason: 'ok' }, P);
    expect(S).toBeCloseTo(0.725, 10);
  });

  it('nas primeiras 3 semanas usa 100% comparação', () => {
    const h = computeHistory({
      metric: 80,
      history: [10, 12, 14].map((d) => ({ metric: 60, performedAt: daysAgo(d) })),
      firstActivityAt: daysAgo(15),
      now,
      params: P,
    });
    expect(h.eligible).toBe(false);
    expect(h.reason).toBe('warmup');
    expect(combineScore(0.4, h, P)).toBe(0.4);
  });

  it('após 3 semanas com poucos registros do exercício mantém 100% comparação', () => {
    const h = computeHistory({
      metric: 80,
      history: [{ metric: 60, performedAt: daysAgo(3) }],
      firstActivityAt: daysAgo(60),
      now,
      params: P,
    });
    expect(h.reason).toBe('few-records');
  });

  it('ignora registros fora da janela de 6 semanas', () => {
    const h = computeHistory({
      metric: 80,
      history: [50, 60, 70].map((d) => ({ metric: 100, performedAt: daysAgo(d) })),
      firstActivityAt: daysAgo(90),
      now,
      params: P,
    });
    expect(h.recordsInWindow).toBe(0);
    expect(h.eligible).toBe(false);
  });

  it('usuário em forte evolução: histórico eleva o score mesmo abaixo da referência', () => {
    const h = computeHistory({
      metric: 80,
      history: [5, 10, 15, 20].map((d, i) => ({ metric: 60 + i, performedAt: daysAgo(d) })),
      firstActivityAt: daysAgo(40),
      now,
      params: P,
    });
    expect(h.H).toBe(1);
    expect(combineScore(0.2, h, P)).toBeGreaterThan(0.2);
  });
});

describe('Seção 7 — musculação', () => {
  it('1RM de 60 kg × 8 reps ≈ 76 kg', () => {
    expect(estimate1RM(60, 8)).toBeCloseTo(76, 0);
  });

  it('exemplo 9: treino de peito → 57 pontos e 1147 XP', () => {
    const S_e = [0.65 * 0.8 + 0.35 * 0.65, 0.65 * 0.7 + 0.35 * 0.55, 0.65 * 0.65 + 0.35 * 0.6];
    const S_peito = median(S_e);
    expect(S_peito).toBeCloseTo(0.6475, 10);
    const r = rewardsFromBonus(bonusFromScore(S_peito, P), P);
    expect(r.points).toBe(57);
    expect(r.xp).toBe(1147);
  });

  it('quantidade de exercícios do mesmo músculo não gera vantagem automática', () => {
    const base = { body, now, firstActivityAt: daysAgo(2), context: {} };
    const sets = [{ loadKg: 40, reps: 10 }];
    const two = scoreCheckin({
      ...base,
      activity: {
        type: 'strength',
        exercises: ['a', 'b'].map((id) => ({ exerciseId: id, muscleGroup: 'chest', sets })),
      },
    });
    const eight = scoreCheckin({
      ...base,
      activity: {
        type: 'strength',
        exercises: 'abcdefgh'.split('').map((id) => ({ exerciseId: id, muscleGroup: 'chest', sets: [...sets, ...sets, ...sets] })),
      },
    });
    expect(eight.points).toBe(two.points);
    expect(eight.xp).toBe(two.xp);
  });

  it('séries inválidas (reps > 30, carga ≤ 0) não contam', () => {
    const r = scoreCheckin({
      body,
      now,
      firstActivityAt: null,
      context: {},
      activity: { type: 'strength', exercises: [{ exerciseId: 'x', muscleGroup: 'legs', sets: [{ loadKg: 0, reps: 10 }, { loadKg: 50, reps: 80 }] }] },
    });
    expect(r.performanceEligible).toBe(false);
    expect(r.points).toBe(56); // fallback neutro
  });

  it('bônus cresce de forma monotônica com o desempenho', () => {
    const samples = [50, 60, 70, 80, 90].flatMap((m) => Array.from({ length: 20 }, () => ({ metric: m, body })));
    let prev = -1;
    for (const load of [30, 45, 55, 62, 70, 80]) {
      const r = scoreCheckin({
        body,
        now,
        firstActivityAt: daysAgo(1),
        context: { 'strength:bench': { samples, history: [] } },
        activity: { type: 'strength', exercises: [{ exerciseId: 'bench', muscleGroup: 'chest', sets: [{ loadKg: load, reps: 8 }] }] },
      });
      expect(r.bonus!).toBeGreaterThanOrEqual(prev);
      prev = r.bonus!;
    }
  });

  it('treino com vários grupos usa a média das medianas', () => {
    const ctx = (m: number) => ({ samples: Array.from({ length: 300 }, () => ({ metric: m, body })), history: [] });
    const r = scoreCheckin({
      body,
      now,
      firstActivityAt: daysAgo(1),
      context: { 'strength:bench': ctx(1), 'strength:squat': ctx(1000) },
      activity: {
        type: 'strength',
        exercises: [
          { exerciseId: 'bench', muscleGroup: 'chest', sets: [{ loadKg: 50, reps: 5 }] },
          { exerciseId: 'squat', muscleGroup: 'legs', sets: [{ loadKg: 50, reps: 5 }] },
        ],
      },
    });
    expect(r.muscleGroups).toHaveLength(2);
    expect(r.S).toBeCloseTo((r.muscleGroups[0].S + r.muscleGroups[1].S) / 2, 10);
  });
});

describe('Seção 10 — corrida', () => {
  it('T₅ de uma corrida de 5 km é o próprio tempo', () => {
    expect(equivalent5kMinutes(25, 5, 1.06)).toBeCloseTo(25, 10);
    expect(runningMetric(25, 5, P)).toBeCloseTo(12, 10);
  });

  it('10 km em 52 min equivale a ~25 min nos 5 km', () => {
    expect(equivalent5kMinutes(52, 10, 1.06)).toBeCloseTo(24.97, 1);
  });

  it('distâncias fora da faixa ou pace impossível ficam fora do bônus variável', () => {
    expect(runningMetric(3, 0.5, P)).toBeNull();
    expect(runningMetric(5, 5, P)).toBeNull(); // 1 min/km
  });
});

describe('Descanso, níveis e streak', () => {
  it('descanso não recebe bônus de desempenho', () => {
    const r = scoreCheckin({ body, now, firstActivityAt: null, context: {}, activity: { type: 'rest' } });
    expect(r.bonus).toBeNull();
    expect(r.points).toBe(P.rest.points);
    expect(r.xp).toBe(P.rest.xp);
  });

  it('curva de níveis é consistente', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2) - 1)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    for (let l = 1; l < 60; l++) expect(levelFromXp(xpForLevel(l))).toBe(l);
  });

  it('streak soma em dias consecutivos e reinicia após falha', () => {
    expect(nextStreak(0, null, '2026-10-30')).toBe(1);
    expect(nextStreak(4, '2026-10-29', '2026-10-30')).toBe(5);
    expect(nextStreak(4, '2026-10-30', '2026-10-30')).toBe(4);
    expect(nextStreak(4, '2026-10-27', '2026-10-30')).toBe(1);
  });
});
