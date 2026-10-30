import type { ScoringParams } from './params.ts';
import { clamp01, roundHalfUp } from './stats.ts';

/** B = 0,05 + 0,15 × S (seção 3). */
export function bonusFromScore(S: number, params: ScoringParams): number {
  return params.bonusMin + (params.bonusMax - params.bonusMin) * clamp01(S);
}

export interface Rewards {
  points: number;
  pointsExtra: number;
  xp: number;
  xpExtra: number;
}

/** P_total = 50 + arredondar(50B); XP_total = 1000 + arredondar(1000B) (seção 8). */
export function rewardsFromBonus(B: number, params: ScoringParams): Rewards {
  const pointsExtra = roundHalfUp(params.basePoints * B);
  const xpExtra = roundHalfUp(params.baseXp * B);
  return {
    points: params.basePoints + pointsExtra,
    pointsExtra,
    xp: params.baseXp + xpExtra,
    xpExtra,
  };
}

// ---------------------------------------------------------------------------
// Níveis — curva ainda não definida no projeto. Proposta:
// XP acumulado para atingir o nível L = 5000 × (L − 1)^1,5
// Nv 2 ≈ 4–5 treinos · Nv 5 ≈ 2 meses (4x/sem) · Nv 10 ≈ 7 meses · Nv 20 ≈ 1,8 ano
// ---------------------------------------------------------------------------

export const LEVEL_XP_FACTOR = 5000;
export const LEVEL_XP_EXPONENT = 1.5;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(LEVEL_XP_FACTOR * Math.pow(level - 1, LEVEL_XP_EXPONENT));
}

export function levelFromXp(xp: number): number {
  let level = Math.max(1, Math.floor(Math.pow(Math.max(0, xp) / LEVEL_XP_FACTOR, 1 / LEVEL_XP_EXPONENT)) + 1);
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

export interface LevelProgress {
  level: number;
  current: number;
  needed: number;
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return {
    level,
    current: xp - floor,
    needed: ceil - floor,
    ratio: clamp01((xp - floor) / (ceil - floor)),
  };
}

// ---------------------------------------------------------------------------
// Streak — dias seguidos com check-in (treino OU descanso). Datas no formato YYYY-MM-DD,
// no fuso do usuário.
// ---------------------------------------------------------------------------

export function nextStreak(currentStreak: number, lastDay: string | null, today: string): number {
  if (!lastDay) return 1;
  if (lastDay === today) return Math.max(1, currentStreak);
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDay}T00:00:00Z`)) / 86_400_000);
  if (diff === 1) return currentStreak + 1;
  if (diff < 0) return currentStreak;
  return 1;
}
