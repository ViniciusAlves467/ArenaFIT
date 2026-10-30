import type { ScoringParams } from './params.ts';
import {
  clamp01,
  effectiveSampleSize,
  percentileFromQuantiles,
  weightedPercentile,
} from './stats.ts';

/**
 * 'unspecified' = "prefiro não informar". Regra proposta:
 * - a pessoa é comparada com a POPULAÇÃO GERAL (todos os sexos) do mesmo exercício, ponderada
 *   pela proximidade de altura, peso e idade — que já explica a maior parte da diferença de
 *   desempenho entre corpos;
 * - os registros dela entram apenas na população geral, nunca nas distribuições feminina ou
 *   masculina, para não deslocá-las;
 * - após 3 semanas, 65% do score vem do próprio histórico, então a escolha pesa cada vez menos.
 */
export type Sex = 'male' | 'female' | 'unspecified';

/** A amostra `s` pertence à população de comparação de quem tem o sexo `viewer`? */
export function inComparisonPool(viewer: Sex, sample: Sex): boolean {
  return viewer === 'unspecified' || viewer === sample;
}

/** Dados corporais usados apenas para formar a população de comparação (seção 4). */
export interface BodyProfile {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  ageYears: number;
}

/** Uma amostra da base interna: a melhor métrica recente de outro usuário no mesmo exercício. */
export interface PopulationSample {
  metric: number;
  body: BodyProfile;
}

/** Base inicial validada, descrita por quantis do mesmo exercício e sexo (seção 5.2). */
export interface ReferenceQuantiles {
  probs: number[];
  values: number[];
  source?: string;
}

export type ComparisonSource = 'app' | 'blend' | 'reference' | 'neutral';

export interface ComparisonResult {
  /** C = α·C_app + (1−α)·C_inicial */
  C: number;
  cApp: number | null;
  cInitial: number;
  /** true quando C_inicial veio do fallback neutro por falta de referência inicial. */
  initialIsNeutral: boolean;
  alpha: number;
  n: number;
  /** Nₑff de Kish. */
  nEff: number;
  /** Σw — soma dos pesos de similaridade. */
  weightSum: number;
  /** Valor efetivamente usado em α, conforme `confidenceSampleMode`. */
  nUsed: number;
  source: ComparisonSource;
}

/** Dᵢⱼ = √[(Δaltura/σ)² + (Δpeso/σ)² + (Δidade/σ)²] */
export function bodyDistance(a: BodyProfile, b: BodyProfile, sigma: ScoringParams['sigma']): number {
  const dh = (a.heightCm - b.heightCm) / sigma.heightCm;
  const dw = (a.weightKg - b.weightKg) / sigma.weightKg;
  const da = (a.ageYears - b.ageYears) / sigma.ageYears;
  return Math.sqrt(dh * dh + dw * dw + da * da);
}

/** wᵢⱼ = exp(−Dᵢⱼ² / 2) */
export function similarityWeight(distance: number): number {
  return Math.exp(-(distance * distance) / 2);
}

/** α = N / (N + K) — N pode ser N simples, Nₑff ou Σw (ver `confidenceSampleMode`). */
export function confidence(n: number, k: number): number {
  if (n <= 0) return 0;
  return n / (n + k);
}

/** C = α·C_app + (1−α)·C_inicial */
export function blendComparison(cApp: number, cInitial: number, alpha: number): number {
  return clamp01(alpha * cApp + (1 - alpha) * cInitial);
}

export interface ComparisonInput {
  metric: number;
  body: BodyProfile;
  /** Amostras da base interna (de outros usuários) para o mesmo exercício/modalidade. */
  samples: PopulationSample[];
  reference?: ReferenceQuantiles | null;
  params: ScoringParams;
}

/**
 * Comparação externa híbrida com a hierarquia de fallback da seção 5.6:
 * 1–3. base interna ponderada pela proximidade (a vizinhança "expande" naturalmente,
 *      pois amostras distantes recebem peso menor e reduzem Nₑff e α);
 * 4.   referência inicial do mesmo exercício domina enquanto α é pequeno;
 * 5.   sem referência confiável, C_inicial = 0,50 (fallback neutro).
 *
 * Usar o neutro no lugar de C_inicial (em vez de só no fim) evita saltos abruptos:
 * conforme a base cresce, C migra continuamente de 0,50 para C_app.
 */
export function computeComparison(input: ComparisonInput): ComparisonResult {
  const { metric, body, samples, reference, params } = input;

  const weighted = samples
    .filter((s) => inComparisonPool(body.sex, s.body.sex) && Number.isFinite(s.metric) && s.metric > 0)
    .map((s) => ({ value: s.metric, weight: similarityWeight(bodyDistance(body, s.body, params.sigma)) }));

  const n = weighted.length;
  const nEff = effectiveSampleSize(weighted.map((w) => w.weight));
  const weightSum = weighted.reduce((acc, w) => acc + w.weight, 0);
  const nUsed = params.confidenceSampleMode === 'count' ? n : params.confidenceSampleMode === 'kish' ? nEff : weightSum;
  const cApp = weightedPercentile(metric, weighted);

  const refPercentile = reference ? percentileFromQuantiles(metric, reference.probs, reference.values) : null;
  const initialIsNeutral = refPercentile === null;
  const cInitial = refPercentile ?? params.neutralComparison;

  const alpha = cApp === null ? 0 : confidence(nUsed, params.confidenceK);
  const C = cApp === null ? cInitial : blendComparison(cApp, cInitial, alpha);

  let source: ComparisonSource;
  if (cApp === null) source = initialIsNeutral ? 'neutral' : 'reference';
  else if (alpha >= 0.9) source = 'app';
  else source = 'blend';

  return { C, cApp, cInitial, initialIsNeutral, alpha, n, nEff, weightSum, nUsed, source };
}
