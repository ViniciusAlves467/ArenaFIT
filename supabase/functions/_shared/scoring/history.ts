import type { ScoringParams } from './params.ts';
import { clamp01, daysBetween, weightedPercentile } from './stats.ts';

export interface HistoryEntry {
  metric: number;
  performedAt: Date;
}

export interface HistoryInput {
  metric: number;
  /** Registros anteriores do próprio usuário no mesmo exercício/modalidade. */
  history: HistoryEntry[];
  /** Data do primeiro registro válido do usuário (início das 3 semanas). */
  firstActivityAt: Date | null;
  now: Date;
  params: ScoringParams;
}

export interface HistoryResult {
  eligible: boolean;
  /** Hₑ — posição do desempenho atual no histórico recente (null se inelegível). */
  H: number | null;
  recordsInWindow: number;
  daysActive: number;
  reason: 'ok' | 'warmup' | 'few-records';
}

/**
 * Hₑ = Percentil(Mₑ atual | histórico pessoal recente), seção 6.2.
 * Elegível somente após o período inicial E com registros suficientes do exercício
 * na janela móvel — caso contrário o score continua 100% comparação (seção 11).
 */
export function computeHistory(input: HistoryInput): HistoryResult {
  const { metric, history, firstActivityAt, now, params } = input;
  const daysActive = firstActivityAt ? Math.max(0, daysBetween(firstActivityAt, now)) : 0;

  const windowStart = now.getTime() - params.historyWindowDays * 24 * 60 * 60 * 1000;
  const recent = history.filter(
    (h) =>
      Number.isFinite(h.metric) &&
      h.metric > 0 &&
      h.performedAt.getTime() >= windowStart &&
      h.performedAt.getTime() < now.getTime(),
  );

  if (daysActive < params.warmupDays) {
    return { eligible: false, H: null, recordsInWindow: recent.length, daysActive, reason: 'warmup' };
  }
  if (recent.length < params.minHistoryRecords) {
    return { eligible: false, H: null, recordsInWindow: recent.length, daysActive, reason: 'few-records' };
  }

  const H = weightedPercentile(
    metric,
    recent.map((h) => ({ value: h.metric, weight: 1 })),
  );
  return { eligible: true, H: clamp01(H ?? 0.5), recordsInWindow: recent.length, daysActive, reason: 'ok' };
}

/** Sem histórico: S = C. Com histórico: S = 0,65·H + 0,35·C (seção 6.3). */
export function combineScore(C: number, history: HistoryResult, params: ScoringParams): number {
  if (!history.eligible || history.H === null) return clamp01(C);
  return clamp01(params.historyWeight * history.H + (1 - params.historyWeight) * C);
}
