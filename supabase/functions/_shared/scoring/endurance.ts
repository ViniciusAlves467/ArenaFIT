import type { ScoringParams } from './params.ts';

/**
 * Modelos dedicados de ciclismo e natação — extensão do modelo de corrida (seção 10 do estudo).
 *
 * Mesma ideia da corrida: converter distâncias diferentes num tempo equivalente numa distância
 * de referência, com uma lei de potência T_ref = T × (D_ref / D)^e, e transformar em uma métrica
 * crescente (velocidade equivalente). Expoentes e faixas são hipóteses iniciais a validar.
 */

export type CycleVariant = 'road' | 'indoor';
export type SwimVariant = 'pool' | 'open_water';
export type ActivityVariant = CycleVariant | SwimVariant;

/** T_ref = T × (D_ref / D)^e */
export function equivalentTime(timeMin: number, distanceKm: number, refKm: number, exponent: number): number {
  return timeMin * Math.pow(refKm / distanceKm, exponent);
}

// ---------------------------------------------------------------------------
// Ciclismo
// ---------------------------------------------------------------------------

/**
 * Distância equivalente no plano: cada 100 m de subida acumulada valem `climbKmPer100m` km
 * (proposta: 1 km, regra prática de 10:1). Sem elevação informada, D_eq = D.
 */
export function cyclingEquivalentDistance(distanceKm: number, elevationM: number | undefined, params: ScoringParams): number {
  const climb = elevationM && elevationM > 0 ? (elevationM / 100) * params.cycling.climbKmPer100m : 0;
  return distanceKm + climb;
}

/**
 * Ciclismo ao ar livre:
 *   D_eq = D + (elevação/100) × 1 km
 *   T₂₀  = T × (20 / D_eq)^1,05
 *   M_ciclismo = 1200 / T₂₀  → velocidade equivalente (km/h) num pedal de 20 km
 *
 * Bike indoor (ergométrica/spinning) não entra no bônus variável: a "distância" exibida por
 * cada aparelho não é comparável entre máquinas. Recebe a base + fallback neutro.
 */
export function cyclingMetric(
  timeMin: number,
  distanceKm: number,
  variant: CycleVariant | undefined,
  elevationM: number | undefined,
  params: ScoringParams,
): number | null {
  const c = params.cycling;
  if (variant === 'indoor') return null;
  if (!(timeMin > 0) || !(distanceKm > 0)) return null;
  if (distanceKm < c.minKm || distanceKm > c.maxKm) return null;
  const rawSpeed = distanceKm / (timeMin / 60);
  if (rawSpeed < c.minSpeedKmh || rawSpeed > c.maxSpeedKmh) return null;
  if (elevationM !== undefined && (elevationM < 0 || elevationM / distanceKm > c.maxClimbMPerKm)) return null;
  const dEq = cyclingEquivalentDistance(distanceKm, elevationM, params);
  const t20 = equivalentTime(timeMin, dEq, c.refKm, c.exponent);
  return (c.refKm * 60) / t20;
}

// ---------------------------------------------------------------------------
// Natação
// ---------------------------------------------------------------------------

/**
 * Natação:
 *   T₁₀₀₀ = T × (1 / D)^1,04       (D em km)
 *   M_natação = 1000 / T₁₀₀₀       → velocidade equivalente (m/min) em 1.000 m
 *
 * Piscina e águas abertas formam distribuições separadas (correnteza, ondas e ausência de
 * viradas tornam os tempos não comparáveis).
 */
export function swimmingMetric(timeMin: number, distanceKm: number, params: ScoringParams): number | null {
  const s = params.swimming;
  if (!(timeMin > 0) || !(distanceKm > 0)) return null;
  if (distanceKm < s.minKm || distanceKm > s.maxKm) return null;
  const secPer100m = (timeMin * 60) / (distanceKm * 10);
  if (secPer100m < s.minSecPer100m || secPer100m > s.maxSecPer100m) return null;
  const t1000 = equivalentTime(timeMin, distanceKm, s.refKm, s.exponent);
  return (s.refKm * 1000) / t1000;
}

export const swimMetricKey = (variant: SwimVariant | undefined) => (variant === 'open_water' ? 'swim_open' : 'swim_pool');

// ---------------------------------------------------------------------------
// Caminhada — permanece com velocidade média (km/h) dentro de uma faixa plausível.
// ---------------------------------------------------------------------------

export function walkingMetric(timeMin: number, distanceKm: number, params: ScoringParams): number | null {
  const w = params.walking;
  if (!(timeMin > 0) || !(distanceKm > 0) || distanceKm < w.minKm) return null;
  const speed = distanceKm / (timeMin / 60);
  if (speed < w.minSpeedKmh || speed > w.maxSpeedKmh) return null;
  return speed;
}
