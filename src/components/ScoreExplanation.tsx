import type { MetricBreakdown, ScoreBreakdown } from '@shared/scoring/index.ts';
import { StyleSheet, View } from 'react-native';

import { EXERCISES, MUSCLE_LABEL } from '@/api/catalog';
import { formatDecimal, formatPercent } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

import { Divider, Text } from './ui';

const metricName = (m: MetricBreakdown) => {
  if (m.exerciseId) return EXERCISES.find((e) => e.id === m.exerciseId)?.name ?? m.exerciseId;
  return { run: 'Corrida', walk: 'Caminhada', cycle: 'Ciclismo', swim_pool: 'Natação (piscina)', swim_open: 'Natação (águas abertas)' }[m.key] ?? m.key;
};

const metricValue = (m: MetricBreakdown) => {
  if (m.key.startsWith('strength:')) return `1RM est. ${formatDecimal(m.metric, 1)} kg`;
  if (m.key === 'run') return `equiv. 5 km em ${formatDecimal(300 / m.metric, 1)} min`;
  if (m.key === 'cycle') return `equiv. ${formatDecimal(m.metric, 1)} km/h num pedal de 20 km`;
  if (m.key.startsWith('swim')) {
    const sec = 6000 / m.metric; // 100 m a M m/min
    return `equiv. ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} /100 m em 1.000 m`;
  }
  return `${formatDecimal(m.metric, 1)} km/h`;
};

function comparisonText(m: MetricBreakdown) {
  const c = m.comparison;
  switch (c.source) {
    case 'neutral':
      return 'Ainda sem base para comparar: posição neutra.';
    case 'reference':
      return 'Comparado à referência inicial do exercício.';
    case 'blend':
      return `Base do app (peso ${formatPercent(c.alpha, 0)}) + ${c.initialIsNeutral ? 'posição neutra' : 'referência inicial'}.`;
    case 'app':
      return 'Comparado a pessoas do app com perfil parecido.';
    default:
      return '';
  }
}

function historyText(m: MetricBreakdown) {
  const h = m.history;
  if (h.reason === 'warmup') return `Período inicial: o histórico entra após 21 dias (dia ${Math.floor(h.daysActive) + 1}).`;
  if (h.reason === 'few-records') return `Poucos registros recentes (${h.recordsInWindow}) para usar seu histórico.`;
  return `Seu histórico recente: ${formatPercent(h.H ?? 0, 0)} (peso 65%).`;
}

/** Barra 5% → 20% com a posição do bônus obtido. */
export function BonusGauge({ bonus }: { bonus: number }) {
  const pos = (bonus - 0.05) / 0.15;
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.gauge}>
        <View style={[styles.gaugeFill, { width: `${Math.max(4, pos * 100)}%` }]} />
        <View style={[styles.marker, { left: `${pos * 100}%` }]} />
      </View>
      <View style={styles.gaugeLabels}>
        <Text variant="caption" tone="muted">
          5%
        </Text>
        <Text variant="caption" tone="muted">
          12,5%
        </Text>
        <Text variant="caption" tone="muted">
          20%
        </Text>
      </View>
    </View>
  );
}

export function ScoreExplanation({ breakdown }: { breakdown: ScoreBreakdown }) {
  if (!breakdown.performanceEligible) {
    return (
      <Text variant="caption" tone="secondary">
        {breakdown.notes[0] ?? 'Sem bônus de desempenho.'}
      </Text>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      {breakdown.muscleGroups.length > 1 && (
        <View style={styles.groups}>
          {breakdown.muscleGroups.map((g) => (
            <View key={g.muscleGroup} style={styles.groupPill}>
              <Text variant="caption" tone="secondary">
                {MUSCLE_LABEL[g.muscleGroup] ?? g.muscleGroup}
              </Text>
              <Text variant="caption">{formatPercent(g.S, 0)}</Text>
            </View>
          ))}
        </View>
      )}
      {breakdown.metrics.map((m, i) => (
        <View key={m.key} style={{ gap: 6 }}>
          {i > 0 && <Divider />}
          <View style={styles.metricHead}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{metricName(m)}</Text>
              <Text variant="caption" tone="muted">
                {metricValue(m)}
              </Text>
            </View>
            <Text variant="stat" style={{ fontSize: 20 }} tone="primary">
              {formatPercent(m.S, 0)}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            Comparação: {formatPercent(m.comparison.C, 0)} — {comparisonText(m)}
          </Text>
          <Text variant="caption" tone="secondary">
            {historyText(m)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gauge: { height: 10, borderRadius: 5, backgroundColor: colors.surface3, overflow: 'visible', justifyContent: 'center' },
  gaugeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5, backgroundColor: colors.primary },
  marker: { position: 'absolute', width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: colors.text, borderWidth: 3, borderColor: colors.primary },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  groupPill: { flexDirection: 'row', gap: 6, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface2 },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
