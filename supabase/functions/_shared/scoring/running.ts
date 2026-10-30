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
