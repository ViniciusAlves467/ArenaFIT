export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Arredondamento definido no projeto: parte decimal ≥ 0,5 sobe, < 0,5 desce.
 * O epsilon absorve erros de ponto flutuante (ex.: 87,49999999 → 88).
 */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median() de lista vazia');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: number[]): number {
  if (values.length === 0) throw new Error('mean() de lista vazia');
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export interface WeightedValue {
  value: number;
  weight: number;
}

/**
 * Percentil ponderado por "mid-rank": amostras abaixo contam inteiras e empates contam
 * pela metade. Assim um desempenho igual a toda a amostra fica em 0,50, e não em 0 ou 1.
 */
export function weightedPercentile(value: number, samples: WeightedValue[]): number | null {
  let below = 0;
  let equal = 0;
  let total = 0;
  for (const s of samples) {
    if (!(s.weight > 0) || !Number.isFinite(s.value)) continue;
    total += s.weight;
    if (s.value < value) below += s.weight;
    else if (s.value === value) equal += s.weight;
  }
  if (total === 0) return null;
  return clamp01((below + equal / 2) / total);
}

/** Nₑff = (Σw)² / Σ(w²). */
export function effectiveSampleSize(weights: number[]): number {
  let sum = 0;
  let sumSq = 0;
  for (const w of weights) {
    if (!(w > 0)) continue;
    sum += w;
    sumSq += w * w;
  }
  return sumSq === 0 ? 0 : (sum * sum) / sumSq;
}

/**
 * Posição de `value` numa distribuição descrita por quantis (probabilidades crescentes
 * e valores crescentes), com interpolação linear e saturação nas pontas.
 */
export function percentileFromQuantiles(value: number, probs: number[], values: number[]): number | null {
  if (probs.length < 2 || probs.length !== values.length) return null;
  if (value <= values[0]) return clamp01(probs[0]);
  const last = values.length - 1;
  if (value >= values[last]) return clamp01(probs[last]);
  for (let i = 1; i <= last; i++) {
    if (value <= values[i]) {
      const span = values[i] - values[i - 1];
      const t = span === 0 ? 0.5 : (value - values[i - 1]) / span;
      return clamp01(probs[i - 1] + t * (probs[i] - probs[i - 1]));
    }
  }
  return clamp01(probs[last]);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS;
}
