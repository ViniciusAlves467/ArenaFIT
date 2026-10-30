import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cosmeticById } from '@/api/catalog';
import { Avatar, UserTitle } from '@/components/Avatar';
import { CheckinRow, LevelBar } from '@/components/home';
import { Button, Card, Divider, EmptyState, IconButton, Screen, SectionTitle, Text } from '@/components/ui';
import { useAchievements, useMe, useMyCheckins } from '@/hooks/queries';
import { formatNumber } from '@/theme/format';
import { colors, space } from '@/theme/tokens';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const checkins = useMyCheckins();
  const achievements = useAchievements();
  const profile = me.data?.profile;
  if (!profile) return <Screen>{null}</Screen>;

  const banner = cosmeticById(profile.equipped_banner)?.data ?? { from: '#1A1A1A', to: '#0D0D0D' };
  const stats = [
    { label: 'Nível', value: profile.level },
    { label: 'Check-ins', value: checkins.data?.length ?? 0 },
    { label: 'Melhor seq.', value: profile.best_streak },
    { label: 'Conquistas', value: achievements.data?.filter((a) => a.completed_at).length ?? 0 },
  ];

  return (
    <Screen padded={false} edgeTop={false} onRefresh={() => Promise.all([me.refetch(), checkins.refetch()])} refreshing={me.isRefetching}>
      <LinearGradient colors={[banner.from, banner.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, { paddingTop: insets.top + space.sm }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <IconButton icon="settings" label="Configurações" onPress={() => router.push('/settings')} />
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: space.lg }}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarBg}>
            <Avatar user={profile} size={96} />
          </View>
          <Button title="Personalizar" icon="sparkles" size="md" variant="secondary" onPress={() => router.push('/shop')} />
        </View>
        <Text variant="title" style={{ marginTop: space.md }}>
          {profile.display_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 }}>
          <Text variant="caption" tone="muted">
            @{profile.username}
          </Text>
          <UserTitle titleId={profile.equipped_title} size="md" />
        </View>

        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text variant="stat">{formatNumber(s.value)}</Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <Card style={{ marginTop: space.lg }}>
          <LevelBar xp={profile.xp} />
        </Card>

        <SectionTitle title="Histórico" />
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {(checkins.data ?? []).map((c, i) => (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <CheckinRow checkin={c} />
            </View>
          ))}
          {!checkins.data?.length && <EmptyState icon="activity" title="Sem treinos registrados" />}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { height: 150, paddingHorizontal: space.lg },
  avatarWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -48 },
  avatarBg: { padding: 4, borderRadius: 60, backgroundColor: colors.bg },
  stats: {
    flexDirection: 'row',
    marginTop: space.xl,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
