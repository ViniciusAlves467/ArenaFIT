import { levelProgress, xpForLevel } from '@shared/scoring/index.ts';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { BonusGauge, ScoreExplanation } from '@/components/ScoreExplanation';
import { Button, Card, Icon, ProgressBar, Screen, SectionTitle, Text } from '@/components/ui';
import { useMyGroups } from '@/hooks/queries';
import { getLastCheckinResult } from '@/lib/checkin-result';
import { formatNumber, formatPercent } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

export default function CheckinResult() {
  const result = getLastCheckinResult();
  const groups = useMyGroups();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  if (!result) return <Redirect href="/" />;
  const { breakdown, profile } = result;
  const lp = levelProgress(profile.xp);
  const leveledUp = profile.xp - result.xp < xpForLevel(lp.level);
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name ?? 'Grupo';

  return (
    <Screen footer={<Button title="Voltar ao início" onPress={() => router.replace('/')} />}>
      <Animated.View style={[styles.hero, { opacity, transform: [{ scale }] }]}>
        <View style={styles.check}>
          <Icon name="check" size={30} color={colors.onPrimary} strokeWidth={3} />
        </View>
        <Text variant="overline" tone="primary">
          {leveledUp ? `Subiu para o nível ${lp.level}!` : 'Check-in registrado'}
        </Text>
        <Text variant="hero" style={{ fontSize: 64, lineHeight: 66 }}>
          +{formatNumber(result.xp)} <Text variant="display" tone="secondary">XP</Text>
        </Text>
        <View style={styles.rewards}>
          <Reward icon="trophy" value={`+${result.points}`} label="pontos" />
          <Reward icon="coins" value={`+${result.coins}`} label="moedas" color={colors.gold} />
          <Reward icon="flame" value={String(profile.current_streak)} label="sequência" />
        </View>
      </Animated.View>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="bodyStrong">Nível {lp.level}</Text>
          <Text variant="caption" tone="muted">
            faltam {formatNumber(lp.needed - lp.current)} XP
          </Text>
        </View>
        <ProgressBar value={lp.ratio} />
      </Card>

      {result.unlocked.length > 0 && (
        <>
          <SectionTitle title="Conquistas desbloqueadas" />
          {result.unlocked.map((a) => (
            <Card key={a.id} highlight style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', marginBottom: space.sm }}>
              <View style={styles.achIcon}>
                <Icon name={a.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{a.name}</Text>
                <Text variant="caption" tone="secondary">
                  +{formatNumber(a.xp)} XP · +{a.coins} moedas
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {breakdown.bonus !== null && (
        <>
          <SectionTitle title="Bônus de desempenho" />
          <Card style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text variant="display" tone="primary">
                {formatPercent(breakdown.bonus)}
              </Text>
              <Text variant="caption" tone="muted">
                score {formatPercent(breakdown.S ?? 0, 0)}
              </Text>
            </View>
            <BonusGauge bonus={breakdown.bonus} />
            <Text variant="caption" tone="secondary">
              A base (50 pts · 1.000 XP) premia a constância. O bônus vai de 5% a 20% conforme seu desempenho em relação a pessoas parecidas e à sua própria evolução.
            </Text>
          </Card>
          <SectionTitle title="Como calculamos" action={<Text variant="caption" tone="primary" onPress={() => router.push('/scoring')}>Entenda</Text>} />
          <Card>
            <ScoreExplanation breakdown={breakdown} />
          </Card>
        </>
      )}

      {result.groups.length > 0 && (
        <>
          <SectionTitle title="Nos seus grupos" />
          <Card padded={false}>
            {result.groups.map((g) => (
              <View key={g.group_id} style={styles.groupRow}>
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {groupName(g.group_id)}
                </Text>
                <Text variant="caption" tone={g.points > 0 ? 'primary' : 'muted'}>
                  {g.points > 0 ? `+${g.points} pts` : 'já pontuou hoje'}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Reward({ icon, value, label, color = colors.primary }: { icon: 'trophy' | 'coins' | 'flame'; value: string; label: string; color?: string }) {
  return (
    <View style={styles.reward}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="stat">{value}</Text>
      <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl, paddingBottom: space.xxl },
  check: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  rewards: { flexDirection: 'row', gap: space.md, marginTop: space.lg, alignSelf: 'stretch' },
  reward: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  achIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
});
