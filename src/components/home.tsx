import { levelProgress } from '@shared/scoring/index.ts';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Checkin, GroupSummary } from '@/api';
import { formatNumber, localDay, relativeTime } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

import { ACTIVITY_LABEL, Card, Icon, ProgressBar, Text } from './ui';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Semana corrente (segunda a domingo) com os dias que tiveram check-in. */
export function WeekStrip({ checkins, goal }: { checkins: Checkin[]; goal: number }) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDay(d);
  });
  const done = new Set(checkins.map((c) => localDay(new Date(c.performed_at))));
  const todayKey = localDay(today);
  const count = days.filter((d) => done.has(d)).length;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.weekHeader}>
        <Text variant="overline" tone="secondary">
          Meta semanal
        </Text>
        <Text variant="caption">
          <Text variant="caption" tone={count >= goal ? 'success' : 'primary'}>
            {count}
          </Text>{' '}
          / {goal} dias
        </Text>
      </View>
      <View style={styles.week}>
        {days.map((d, i) => {
          const isDone = done.has(d);
          const isToday = d === todayKey;
          return (
            <View key={d} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <View style={[styles.day, isDone && styles.dayDone, isToday && !isDone && styles.dayToday]}>
                {isDone ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
              </View>
              <Text variant="caption" style={{ fontSize: 11, color: isToday ? colors.text : colors.textMuted }}>
                {WEEKDAYS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function LevelBar({ xp, compact }: { xp: number; compact?: boolean }) {
  const p = levelProgress(xp);
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.levelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Text variant="overline" tone="secondary">
            Nível
          </Text>
          <Text variant="stat">{p.level}</Text>
        </View>
        <Text variant="caption" tone="muted">
          {formatNumber(p.current)} / {formatNumber(p.needed)} XP
        </Text>
      </View>
      <ProgressBar value={p.ratio} height={compact ? 4 : 6} />
    </View>
  );
}

export function GroupTile({ group, favorite }: { group: GroupSummary; favorite?: boolean }) {
  return (
    <Card onPress={() => router.push(`/group/${group.id}`)} style={styles.tile}>
      <View style={styles.tileTop}>
        <View style={[styles.groupDot, { backgroundColor: group.accent }]} />
        {favorite && <Icon name="star" size={14} color={colors.primary} />}
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>
        {group.name}
      </Text>
      <Text variant="caption" tone="muted">
        {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
      </Text>
      <View style={styles.tileStats}>
        <View>
          <Text variant="stat" tone="primary">
            {group.my_rank}º
          </Text>
          <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
            posição
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="stat">{formatNumber(group.my_points)}</Text>
          <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
            pontos
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function CheckinRow({ checkin }: { checkin: Checkin }) {
  const meta = [
    checkin.distance_km ? `${checkin.distance_km.toLocaleString('pt-BR')} km` : null,
    checkin.duration_min ? `${Math.round(checkin.duration_min)} min` : null,
    relativeTime(checkin.performed_at),
  ].filter(Boolean);
  return (
    <View style={styles.checkinRow}>
      <View style={styles.activityIcon}>
        <Icon name={checkin.type} size={18} color={checkin.type === 'rest' ? colors.textSecondary : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {checkin.title || ACTIVITY_LABEL[checkin.type]}
        </Text>
        <Text variant="caption" tone="muted">
          {meta.join(' · ')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyStrong">+{formatNumber(checkin.xp)} XP</Text>
        {checkin.points > 0 && (
          <Text variant="caption" tone="primary">
            {checkin.points} pts
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDone: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tile: { width: 176, gap: 2 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  groupDot: { width: 10, height: 10, borderRadius: 3 },
  tileStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
