/**
 * Parâmetros do modelo de pontuação (Estudo de Cálculo de Pontuação — TCC, seção 13).
 *
 * "Regra definida"  → valor decidido pelo projeto.
 * "Hipótese"        → valor inicial que precisa ser calibrado por simulação.
 * "Proposta"        → decisão de engenharia ainda não validada pela equipe.
 */
export interface ScoringParams {
  /** Pontos competitivos base por treino válido. Regra definida: 50. */
  basePoints: number;
  /** XP base por treino válido. Regra definida: 1000. */
  baseXp: number;
  /** Bônus mínimo. Regra definida: 5%. */
  bonusMin: number;
  /** Bônus máximo. Regra definida: 20%. */
  bonusMax: number;
  /** Peso do histórico pessoal após o período inicial. Regra definida: 65%. */
  historyWeight: number;
  /** Período inicial em dias (100% comparação). Regra definida: 21 dias. */
  warmupDays: number;
  /** Janela móvel do histórico pessoal em dias. Hipótese: 42 dias (6 semanas). */
  historyWindowDays: number;
  /** Mínimo de registros do exercício para usar histórico. A definir — proposta: 3. */
  minHistoryRecords: number;
  /** K da função de confiança α = N/(N+K). Hipótese: 30. */
  confidenceK: number;
  /**
   * Qual "tamanho de amostra" entra em α. A validar (seção 13).
   * - 'count'     → N simples.
   * - 'kish'      → Nₑff = (Σw)²/Σ(w²). Mede concentração dos pesos, mas é invariante à escala:
   *                 30 usuários igualmente distantes (w≈0,01) ainda dão Nₑff = 30.
   * - 'weightSum' → Σw: 30 usuários com w≈0,01 equivalem a ~0,3 usuário idêntico. Sempre ≤ Nₑff.
   *                 É o que melhor traduz a intenção da seção 4.3. Proposta de padrão.
   */
  confidenceSampleMode: 'count' | 'kish' | 'weightSum';
  /** Fallback neutro de comparação. Proposta de engenharia: 0,50. */
  neutralComparison: number;
  /** Desvios usados para padronizar a distância corporal Dᵢⱼ. Hipótese. */
  sigma: { heightCm: number; weightKg: number; ageYears: number };
  running: {
    /** Expoente da equivalência T₅ = T × (5/D)^e. Hipótese: 1,06. */
    exponent: number;
    /** Faixa de distância elegível ao bônus variável (km). Proposta. */
    minKm: number;
    maxKm: number;
    /** Faixa de pace plausível (min/km). Fora dela o registro não alimenta percentis. Proposta. */
    minPaceMinPerKm: number;
    maxPaceMinPerKm: number;
  };
  strength: {
    /** Repetições máximas aceitas na estimativa de 1RM. Proposta: 30. */
    maxReps: number;
    /** Carga máxima plausível por série (kg). Proposta. */
    maxLoadKg: number;
  };
  /** Recompensa de check-in de descanso/recuperação (sem bônus de desempenho). Proposta. */
  rest: { points: number; xp: number };
  /** Moedas por treino válido. A definir — proposta: 10. */
  coinsPerWorkout: number;
  /** Moedas por check-in de descanso. Proposta: 3. */
  coinsPerRest: number;
}

export const DEFAULT_PARAMS: ScoringParams = {
  basePoints: 50,
  baseXp: 1000,
  bonusMin: 0.05,
  bonusMax: 0.2,
  historyWeight: 0.65,
  warmupDays: 21,
  historyWindowDays: 42,
  minHistoryRecords: 3,
  confidenceK: 30,
  confidenceSampleMode: 'weightSum',
  neutralComparison: 0.5,
  sigma: { heightCm: 10, weightKg: 15, ageYears: 12 },
  running: {
    exponent: 1.06,
    minKm: 1,
    maxKm: 42.2,
    minPaceMinPerKm: 2.5,
    maxPaceMinPerKm: 12,
  },
  strength: { maxReps: 30, maxLoadKg: 500 },
  rest: { points: 0, xp: 300 },
  coinsPerWorkout: 10,
  coinsPerRest: 3,
};

export function withParams(overrides: Partial<ScoringParams> = {}): ScoringParams {
  return {
    ...DEFAULT_PARAMS,
    ...overrides,
    sigma: { ...DEFAULT_PARAMS.sigma, ...overrides.sigma },
    running: { ...DEFAULT_PARAMS.running, ...overrides.running },
    strength: { ...DEFAULT_PARAMS.strength, ...overrides.strength },
    rest: { ...DEFAULT_PARAMS.rest, ...overrides.rest },
  };
}
