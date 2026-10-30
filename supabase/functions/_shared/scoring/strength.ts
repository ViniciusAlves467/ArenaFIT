import type { ScoringParams } from './params.ts';

export interface StrengthSet {
  loadKg: number;
  reps: number;
}

/** 1RM_estimado = Carga × (1 + Repetições / 30)  (fórmula de Epley, seção 7.2). */
export function estimate1RM(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

export function isValidSet(set: StrengthSet, params: ScoringParams): boolean {
  return (
    Number.isFinite(set.loadKg) &&
    Number.isFinite(set.reps) &&
    set.loadKg > 0 &&
    set.loadKg <= params.strength.maxLoadKg &&
    Number.isInteger(set.reps) &&
    set.reps >= 1 &&
    set.reps <= params.strength.maxReps
  );
}

/**
 * Mₑ = max(1RM₁, …, 1RMₙ): o melhor 1RM estimado válido do treino.
 * Usar o máximo (e não a soma) impede que mais séries gerem vantagem automática.
 */
export function strengthMetric(sets: StrengthSet[], params: ScoringParams): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (!isValidSet(set, params)) continue;
    const rm = estimate1RM(set.loadKg, set.reps);
    if (best === null || rm > best) best = rm;
  }
  return best;
}
