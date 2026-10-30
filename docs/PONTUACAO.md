# Motor de pontuação — do estudo para o código

Implementação fiel do *Estudo técnico revisado: comparação corporal, histórico individual e cold start*. Código em `supabase/functions/_shared/scoring/`; testes em `scoring.test.ts`.

## Mapa fórmula → função

| Seção do estudo | Fórmula | Função |
| --- | --- | --- |
| 3 | B = 0,05 + 0,15·S | `bonusFromScore` |
| 4.1 | Dᵢⱼ = √[(Δh/σ)² + (Δp/σ)² + (Δi/σ)²] | `bodyDistance` |
| 4.2 | wᵢⱼ = exp(−D²/2) | `similarityWeight` |
| 4.3 | Nₑff = (Σw)²/Σw² | `effectiveSampleSize` |
| 5.3 | C_app = percentil ponderado | `weightedPercentile` (mid-rank) |
| 5.4 | α = N/(N+K) | `confidence` |
| 5.5–5.6 | C = αC_app + (1−α)C_inicial, fallbacks | `computeComparison` |
| 6.2 | H = percentil no histórico (janela 6 sem.) | `computeHistory` |
| 6.3 | S = 0,65H + 0,35C | `combineScore` |
| 7.2 | 1RM = carga × (1 + reps/30); Mₑ = max | `estimate1RM`, `strengthMetric` |
| 7.4–7.5 | mediana por músculo, média entre músculos | `scoreCheckin` |
| 8 | P = 50 + arred(50B); XP = 1000 + arred(1000B) | `rewardsFromBonus`, `roundHalfUp` |
| 10.1 | T₅ = T·(5/D)^1,06; M = 300/T₅ | `equivalent5kMinutes`, `runningMetric` |
| 12 | algoritmo completo, com auditoria | `scoreCheckin` → `ScoreBreakdown` |

Todos os parâmetros da seção 13 estão em `params.ts`, marcados como *regra definida*, *hipótese* ou *proposta*.

## Decisões de engenharia (a validar com a equipe)

1. **Σw no lugar de Nₑff no cálculo de α (padrão).** O Nₑff de Kish mede a *concentração* dos pesos, mas é invariante à escala: 30 usuários igualmente distantes (w ≈ 0,01) produzem Nₑff = 30 e α = 0,5 — exatamente o caso que a seção 4.3 quer evitar ("30 usuários com pesos muito baixos não equivalem a 30 realmente próximos"). Σw resolve isso (30 × 0,01 ≈ 0,3 usuário idêntico) e é sempre ≤ Nₑff. Os três modos (`count`, `kish`, `weightSum`) estão implementados e comparados na simulação para a banca.
2. **Neutro como C_inicial.** Sem referência inicial validada, usamos C_inicial = 0,50 dentro da própria mistura (C = αC_app + (1−α)·0,50). Assim a transição neutro → base real é contínua, sem saltos (critério da seção 14.1).
3. **Percentil mid-rank.** Empates contam meio: um desempenho idêntico a toda a amostra fica em 0,50, não em 0 ou 1.
4. **População = melhor marca recente de cada usuário** (180 dias, mesmo sexo e exercício). Evita que usuários muito ativos dominem a distribuição.
5. **σ fixos** (altura 10 cm, peso 15 kg, idade 12 anos) em vez de σ da base — estáveis no cold start. Hipótese a calibrar.
6. **Mínimo de 3 registros** do exercício na janela para usar o histórico (o estudo deixa "a definir").
7. **Base inicial vazia.** A tabela `reference_quantiles` existe, mas não foi populada: o estudo exige origem e licença justificadas, e "o fallback neutro é preferível a uma referência sem justificativa" (seção 15).
8. **Validade dos dados:** reps 1–30 e carga até 500 kg para o 1RM; corrida de 1 a 42,2 km com pace entre 2,5 e 12 min/km. Fora disso o treino vale a base, mas não entra nos percentis.

## Regras que o estudo não define (implementadas como proposta)

| Item | Proposta implementada |
| --- | --- |
| Caminhada, ciclismo, natação | Velocidade média (km/h) no mesmo pipeline, com faixas de plausibilidade; sem referência → neutro |
| Descanso/recuperação | 0 pontos de ranking, 300 XP, 3 moedas, mantém a sequência |
| Moedas | 10 por treino + recompensas de conquistas |
| Curva de níveis | XP para o nível L = 5000 × (L−1)^1,5 (nível 2 ≈ 5 treinos; nível 10 ≈ 7 meses a 4x/semana) |
| Reprovação no grupo | reprovações > aprovações e ≥ metade dos demais membros (máx. 3 votos necessários) |

## Simulação para a banca

```bash
npm run simulate
```

Gera, com base **simulada** (seed fixa, reprodutível): a tabela do experimento de cold start (N = 0…300) nos três modos de α, e a distribuição dos bônus de 5.000 usuárias simuladas — que fica uniforme entre 5% e 20%, sem concentração nas pontas.
