import type { ScoringParams } from './params.ts';

/** T₅ = T × (5 / D)^1,06 — tempo equivalente de 5 km (seção 10.1). */
export function equivalent5kMinutes(timeMin: number, distanceKm: number, exponent: number): number {
  return timeMin * Math.pow(5 / distanceKm, exponent);
}

/** M_corrida = 300 / T₅ — quanto maior, melhor. */
export function runningMetricFromT5(t5Min: number): number {
  return 300 / t5Min;
}

export type RunEligibility = 'ok' | 'invalid' | 'distance-out-of-range' | 'implausible-pace';

export function runEligibility(timeMin: number, distanceKm: number, params: ScoringParams): RunEligibility {
  if (!(timeMin > 0) || !(distanceKm > 0)) return 'invalid';
  if (distanceKm < params.running.minKm || distanceKm > params.running.maxKm) return 'distance-out-of-range';
  const pace = timeMin / distanceKm;
  if (pace < params.running.minPaceMinPerKm || pace > params.running.maxPaceMinPerKm) return 'implausible-pace';
  return 'ok';
}

/** Métrica de corrida contínua, ou null quando fora das faixas testadas (seção 10.4). */
export function runningMetric(timeMin: number, distanceKm: number, params: ScoringParams): number | null {
  if (runEligibility(timeMin, distanceKm, params) !== 'ok') return null;
  return runningMetricFromT5(equivalent5kMinutes(timeMin, distanceKm, params.running.exponent));
}

/**
 * Caminhada, ciclismo e natação ainda não têm modelo próprio no estudo.
 * Proposta provisória: velocidade média (km/h) dentro do mesmo pipeline de comparação,
 * com faixas de plausibilidade por modalidade. Sem referência inicial, cai no neutro.
 */
export const ENDURANCE_SPEED_RANGES: Record<'walk' | 'cycle' | 'swim', { min: number; max: number; minKm: number }> = {
  walk: { min: 2, max: 9, minKm: 0.5 },
  cycle: { min: 5, max: 60, minKm: 2 },
  swim: { min: 0.5, max: 7, minKm: 0.1 },
};

export function enduranceMetric(
  kind: 'walk' | 'cycle' | 'swim',
  timeMin: number,
  distanceKm: number,
): number | null {
  if (!(timeMin > 0) || !(distanceKm > 0)) return null;
  const range = ENDURANCE_SPEED_RANGES[kind];
  if (distanceKm < range.minKm) return null;
  const speed = distanceKm / (timeMin / 60);
  if (speed < range.min || speed > range.max) return null;
  return speed;
}
