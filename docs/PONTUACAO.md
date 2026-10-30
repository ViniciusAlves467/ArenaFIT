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
| — | ciclismo e natação (extensão) | `cyclingMetric`, `swimmingMetric` |

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

## Ciclismo e natação — modelos dedicados (proposta)

Seguem a mesma lógica da corrida (seção 10): converter distâncias diferentes num tempo equivalente numa distância de referência e transformar em velocidade equivalente. Código em `endurance.ts`.

**Ciclismo ao ar livre**

```
D_eq = D + (elevação / 100) × 1 km        (100 m de subida ≈ 1 km no plano)
T₂₀  = T × (20 / D_eq)^1,05
M_ciclismo = 1200 / T₂₀                   (km/h equivalentes num pedal de 20 km)
```

- Elegível de 5 a 200 km, velocidade média de 8 a 55 km/h e até 120 m de subida por km.
- **Bike indoor** (ergométrica/spinning) fica fora do bônus variável — a "distância" de cada aparelho não é comparável. Recebe a base e o bônus neutro (12,5%), como o estudo faz com tiros e intervalados.

**Natação**

```
T₁₀₀₀ = T × (1 / D)^1,04                  (D em km)
M_natação = 1000 / T₁₀₀₀                  (m/min equivalentes em 1.000 m)
```

- Elegível de 100 m a 10 km, ritmo entre 0:55 e 4:00 por 100 m.
- **Piscina e águas abertas** são distribuições separadas (`swim_pool`, `swim_open`): correnteza, ondas e a ausência de viradas tornam os tempos incomparáveis.

Os expoentes 1,05 e 1,04 são hipóteses iniciais — menores que o da corrida (1,06), porque a queda de ritmo com a distância é menor no ciclismo (vácuo, menor impacto) e na natação (esforço mais técnico). Devem ser calibrados com dados reais, como o estudo pede para o 1,06.

A caminhada continua com velocidade média (km/h) entre 2 e 9 km/h.

## Comparação para quem prefere não informar o sexo

O estudo compara dentro da "mesma categoria de sexo". A opção **"Prefiro não informar"** (`sex = 'unspecified'`) segue esta regra:

1. A pessoa é comparada com a **população geral** do exercício (todos os sexos), ponderada pela proximidade de altura, peso e idade. A distância corporal Dᵢⱼ já captura a maior parte da diferença de desempenho entre corpos.
2. Os registros dela entram **apenas na população geral**, nunca nas distribuições feminina ou masculina — assim não as deslocam.
3. Após as 3 semanas iniciais, 65% do score vem do próprio histórico, então a escolha pesa cada vez menos.
4. Se houver base inicial de referência, a linha `sex = 'unspecified'` de `reference_quantiles` deve conter a distribuição geral.

Teste correspondente: `scoring.test.ts` → *Sexo "prefiro não informar"*.

## Curva de níveis

Os documentos dizem apenas que o usuário "começará no nível 1 e ganhará XP de acordo com a realização dos seus treinos" — a curva não estava definida. Proposta implementada (no app e no banco, `xp_for_level`):

```
XP acumulado para atingir o nível L = 5000 × (L − 1)^1,5
```

| Nível | XP total | Treinos (~1.125 XP) | A 4 treinos/semana |
| --- | --- | --- | --- |
| 2 | 5.000 | ~4 | 1 semana |
| 3 | 14.142 | ~13 | 3 semanas |
| 5 | 40.000 | ~36 | 2 meses |
| 10 | 135.000 | ~120 | 7 meses |
| 15 | 261.916 | ~233 | 1,1 ano |
| 20 | 414.095 | ~368 | 1,8 ano |

Por que essa forma: o expoente 1,5 faz cada nível custar um pouco mais que o anterior (sensação de progresso rápido no começo, quando o risco de abandono é maior), sem virar uma "parede" — o nível 20 ainda é alcançável em menos de 2 anos de constância. Conquistas também dão XP, o que acelera um pouco os primeiros níveis. Os cosméticos têm nível mínimo distribuído ao longo dessa curva (1 a 15).

## Outras regras que o estudo não define (implementadas como proposta)

| Item | Proposta implementada |
| --- | --- |
| Descanso/recuperação | 0 pontos de ranking, 300 XP, 3 moedas, mantém a sequência |
| Moedas | 10 por treino + recompensas de conquistas |
| Reprovação no grupo | Maioria dos votos com quórum: reprovações > aprovações **e** ≥ metade dos demais membros (no máximo 3 reprovações necessárias, para grupos grandes não travarem). Prazo de 48 h |

## Simulação para a banca

```bash
npm run simulate
```

Gera, com base **simulada** (seed fixa, reprodutível): a tabela do experimento de cold start (N = 0…300) nos três modos de α, e a distribuição dos bônus de 5.000 usuárias simuladas — que fica uniforme entre 5% e 20%, sem concentração nas pontas.
