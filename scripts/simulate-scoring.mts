/**
 * Simulação do modelo de pontuação (Estudo de Cálculo de Pontuação — seção 14).
 *
 * ATENÇÃO: base SIMULADA. Serve apenas para testar o comportamento das fórmulas,
 * nunca como referência real de capacidade física (seção 5.2).
 *
 * Uso: npm run simulate  (node scripts/simulate-scoring.mts)
 */
import {
  type BodyProfile,
  bonusFromScore,
  computeComparison,
  DEFAULT_PARAMS,
  estimate1RM,
  type PopulationSample,
  type ReferenceQuantiles,
  type ScoringParams,
  scoreCheckin,
} from '../supabase/functions/_shared/scoring/index.ts';

// PRNG determinístico (mulberry32) para que os resultados sejam reproduzíveis no TCC.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const gauss = (mu: number, sd: number) => {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function randomBody(sex: BodyProfile['sex']): BodyProfile {
  const male = sex === 'male';
  return {
    sex,
    heightCm: gauss(male ? 175 : 163, 7),
    weightKg: gauss(male ? 80 : 64, 12),
    ageYears: Math.max(16, Math.min(70, gauss(32, 10))),
  };
}

/** 1RM sintético de supino: proporcional ao peso corporal, menor com a idade, com ruído. */
function syntheticBench1RM(b: BodyProfile): number {
  const ratio = b.sex === 'male' ? 1.0 : 0.55;
  const ageFactor = 1 - Math.max(0, b.ageYears - 35) * 0.008;
  return Math.max(15, b.weightKg * ratio * ageFactor * gauss(1, 0.18));
}

function population(n: number, sex: BodyProfile['sex']): PopulationSample[] {
  return Array.from({ length: n }, () => {
    const body = randomBody(sex);
    return { body, metric: syntheticBench1RM(body) };
  });
}

function quantiles(values: number[], probs: number[]): ReferenceQuantiles {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    probs,
    values: probs.map((p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]),
    source: 'simulada',
  };
}

const fmt = (x: number, d = 4) => x.toFixed(d).replace('.', ',');
const pct = (x: number) => `${(x * 100).toFixed(2).replace('.', ',')}%`;

const probs = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
// Referência inicial "deslocada" de propósito (população um pouco mais fraca), para
// tornar visível a transição C_inicial → C_app conforme a base cresce.
const reference = quantiles(
  population(2000, 'female').map((s) => s.metric * 0.9),
  probs,
);

const user: BodyProfile = { sex: 'female', heightCm: 165, weightKg: 62, ageYears: 24 };
const userMetric = estimate1RM(32.5, 8);
const appBase = population(400, 'female');

// ---------------------------------------------------------------------------
console.log('\n## 14.1 — Experimento de cold start (mesma usuária, desempenho constante)\n');
console.log(`Usuária: 165 cm, 62 kg, 24 anos · supino 32,5 kg × 8 → 1RM estimado ${fmt(userMetric, 1)} kg\n`);
for (const mode of ['count', 'kish', 'weightSum'] as const) {
  const params: ScoringParams = { ...DEFAULT_PARAMS, confidenceSampleMode: mode };
  console.log(`### Modo de confiança: ${mode}\n`);
  console.log('| N | N usado em α | α | C_app | C_inicial | C | Bônus |');
  console.log('|---|---|---|---|---|---|---|');
  for (const n of [0, 1, 2, 5, 10, 30, 100, 300]) {
    const c = computeComparison({ metric: userMetric, body: user, samples: appBase.slice(0, n), reference, params });
    console.log(
      `| ${n} | ${fmt(c.nUsed, 2)} | ${fmt(c.alpha)} | ${c.cApp === null ? '—' : fmt(c.cApp)} | ${fmt(c.cInitial)} | ${fmt(c.C)} | ${pct(bonusFromScore(c.C, params))} |`,
    );
  }
  console.log('');
}

// ---------------------------------------------------------------------------
console.log('## Distribuição final dos bônus (5.000 usuárias simuladas, base interna de 400)\n');
const buckets = new Map<string, number>();
const N_USERS = 5000;
let minB = 1;
let maxB = 0;
for (let i = 0; i < N_USERS; i++) {
  const body = randomBody('female');
  const metric = syntheticBench1RM(body);
  const load = metric / (1 + 8 / 30);
  const r = scoreCheckin({
    body,
    now: new Date(),
    firstActivityAt: new Date(),
    activity: { type: 'strength', exercises: [{ exerciseId: 'bench', muscleGroup: 'chest', sets: [{ loadKg: load, reps: 8 }] }] },
    context: { 'strength:bench': { samples: appBase, reference, history: [] } },
  });
  const b = r.bonus ?? 0;
  minB = Math.min(minB, b);
  maxB = Math.max(maxB, b);
  const lo = Math.min(19, Math.floor(b * 100));
  const key = `${lo}–${lo + 1}%`;
  buckets.set(key, (buckets.get(key) ?? 0) + 1);
}
console.log('| Faixa de bônus | Usuárias | % |');
console.log('|---|---|---|');
for (const [k, v] of [...buckets.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
  console.log(`| ${k} | ${v} | ${pct(v / N_USERS)} |`);
}
console.log(`\nBônus mínimo observado: ${pct(minB)} · máximo: ${pct(maxB)}`);
console.log('Critério (seção 14): a maioria NÃO deve se concentrar artificialmente em 5% ou 20%.\n');
