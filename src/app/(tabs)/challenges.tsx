import { StyleSheet, View } from 'react-native';

import { WeekStrip } from '@/components/home';
import { Card, Icon, IconButton, ProgressBar, Screen, SectionTitle, Text } from '@/components/ui';
import { useAchievements, useMe, useMyCheckins, useUpdateProfile } from '@/hooks/queries';
import { formatNumber } from '@/theme/format';
import { colors, space } from '@/theme/tokens';

export default function Challenges() {
  const me = useMe();
  const achievements = useAchievements();
  const checkins = useMyCheckins();
  const update = useUpdateProfile();
  const profile = me.data?.profile;
  if (!profile) return <Screen>{null}</Screen>;

  const goal = profile.weekly_goal;
  const setGoal = (g: number) => update.mutate({ profile: { weekly_goal: Math.min(7, Math.max(1, g)) } });
  const list = achievements.data ?? [];
  const done = list.filter((a) => a.completed_at).length;

  return (
    <Screen onRefresh={() => Promise.all([achievements.refetch(), checkins.refetch()])} refreshing={achievements.isRefetching}>
      <Text variant="title">Desafios</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>
        Metas pessoais e conquistas — sem comparação com ninguém.
      </Text>

      <View style={styles.streaks}>
        <Card style={styles.streakCard}>
          <Icon name="flame" size={22} color={profile.current_streak ? colors.primary : colors.textMuted} />
          <Text variant="display">{profile.current_streak}</Text>
          <Text variant="caption" tone="muted">
            dias seguidos
          </Text>
        </Card>
        <Card style={styles.streakCard}>
          <Icon name="award" size={22} color={colors.gold} />
          <Text variant="display">{profile.best_streak}</Text>
          <Text variant="caption" tone="muted">
            melhor sequência
          </Text>
        </Card>
      </View>

      <SectionTitle title="Meta da semana" />
      <Card style={{ gap: space.lg }}>
        <View style={styles.goalRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Treinar {goal}x por semana</Text>
            <Text variant="caption" tone="muted">
              Ajuste para algo sustentável. Constância vale mais que intensidade.
            </Text>
          </View>
          <IconButton icon="minus" label="Diminuir meta" size={36} onPress={() => setGoal(goal - 1)} />
          <Text variant="stat" style={{ width: 28, textAlign: 'center' }}>
            {goal}
          </Text>
          <IconButton icon="plus" label="Aumentar meta" size={36} onPress={() => setGoal(goal + 1)} />
        </View>
        <WeekStrip checkins={checkins.data ?? []} goal={goal} />
      </Card>

      <SectionTitle
        title="Conquistas"
        action={
          <Text variant="caption" tone="muted">
            {done}/{list.length}
          </Text>
        }
      />
      <View style={{ gap: space.sm }}>
        {list.map((a) => {
          const complete = !!a.completed_at;
          return (
            <Card key={a.id} highlight={complete} style={styles.ach}>
              <View style={[styles.achIcon, complete && { backgroundColor: colors.primary }]}>
                <Icon name={a.icon} size={20} color={complete ? colors.onPrimary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text variant="bodyStrong">{a.name}</Text>
                  <Text variant="caption" tone={complete ? 'primary' : 'muted'}>
                    {complete ? 'Concluída' : `${formatNumber(a.progress)}/${formatNumber(a.target)}`}
                  </Text>
                </View>
                <Text variant="caption" tone="secondary">
                  {a.description}
                </Text>
                {!complete && <ProgressBar value={a.progress / a.target} height={4} />}
                <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                  +{formatNumber(a.xp_reward)} XP · +{a.coin_reward} moedas
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streaks: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  streakCard: { flex: 1, alignItems: 'flex-start', gap: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ach: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  achIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
});
