import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { EXERCISES } from '@/api/catalog';
import type { FeedItem } from '@/api';
import { formatPace, relativeTime } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { ACTIVITY_LABEL, Badge, Icon, Text } from './ui';

const exerciseName = (id: string) => EXERCISES.find((e) => e.id === id)?.name ?? id;

export function FeedCard({
  item,
  isMine,
  onVote,
  voting,
}: {
  item: FeedItem;
  isMine: boolean;
  onVote: (vote: 'approve' | 'reject' | null) => void;
  voting?: boolean;
}) {
  const c = item.checkin;
  const rejected = item.status === 'rejected';
  const exercises = [...new Set(c.sets.map((s) => s.exercise_id))];
  const pace = c.type === 'run' && c.duration_min && c.distance_km ? formatPace(c.duration_min, c.distance_km) : null;
  const votingOpen = Date.now() - new Date(c.performed_at).getTime() < 48 * 3_600_000;

  return (
    <View style={[styles.card, rejected && { opacity: 0.6 }]}>
      <View style={styles.head}>
        <Avatar user={c.profile} size={38} showEmblem={false} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {isMine ? 'Você' : c.profile.display_name}
          </Text>
          <Text variant="caption" tone="muted">
            {ACTIVITY_LABEL[c.type]} · {relativeTime(c.performed_at)}
          </Text>
        </View>
        {rejected ? (
          <Badge label="Reprovado" tone="danger" />
        ) : (
          <Text variant="stat" tone={item.points > 0 ? 'primary' : 'muted'} style={{ fontSize: 20 }}>
            +{item.points}
          </Text>
        )}
      </View>

      <View style={styles.media}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name={c.type} size={36} color={colors.textMuted} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.mediaBadges}>
          {c.emoji && (
            <View style={styles.chip}>
              <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
              <Text variant="caption" style={{ fontSize: 11 }}>
                emoji do dia
              </Text>
            </View>
          )}
          {c.has_location && (
            <View style={styles.chip}>
              <Icon name="map-pin" size={12} color={colors.success} strokeWidth={2.4} />
              <Text variant="caption" style={{ fontSize: 11 }}>
                local verificado
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text variant="bodyStrong">{c.title || ACTIVITY_LABEL[c.type]}</Text>
        {exercises.length > 0 && (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {exercises.map(exerciseName).join(' · ')}
          </Text>
        )}
        {(c.distance_km || c.duration_min) && c.type !== 'strength' ? (
          <Text variant="caption" tone="secondary">
            {[c.distance_km && `${c.distance_km.toLocaleString('pt-BR')} km`, c.duration_min && `${Math.round(c.duration_min)} min`, pace].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Text variant="caption" tone="muted" style={{ flex: 1 }}>
          {item.approvals} aprovações · {item.rejections} reprovações
        </Text>
        {!isMine && votingOpen && (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <VoteButton icon="thumbs-up" active={item.my_vote === 'approve'} tone="success" disabled={voting} label="Aprovar" onPress={() => onVote(item.my_vote === 'approve' ? null : 'approve')} />
            <VoteButton icon="thumbs-down" active={item.my_vote === 'reject'} tone="danger" disabled={voting} label="Reprovar" onPress={() => onVote(item.my_vote === 'reject' ? null : 'reject')} />
          </View>
        )}
      </View>
    </View>
  );
}

function VoteButton({ icon, active, tone, onPress, label, disabled }: { icon: 'thumbs-up' | 'thumbs-down'; active: boolean; tone: 'success' | 'danger'; onPress: () => void; label: string; disabled?: boolean }) {
  const color = tone === 'success' ? colors.success : colors.danger;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.vote, active && { backgroundColor: tone === 'success' ? colors.successSoft : colors.dangerSoft, borderColor: color }]}
    >
      <Icon name={icon} size={16} color={active ? color : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  media: { height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mediaBadges: { position: 'absolute', left: space.sm, bottom: space.sm, flexDirection: 'row', gap: space.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(10,10,10,0.78)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  vote: { width: 40, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
