import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import type { RankingEntry } from '@/api';
import { Avatar, UserTitle } from '@/components/Avatar';
import { FeedCard } from '@/components/FeedCard';
import { Badge, Button, Card, Divider, EmptyState, IconButton, Screen, Segmented, Text, TopBar } from '@/components/ui';
import { useFeed, useGroup, useLeaveGroup, useMe, useRanking, useVote } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { daysLeft, formatNumber } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

const MEDAL = [colors.gold, colors.silver, colors.bronze];

function Podium({ top, myId }: { top: RankingEntry[]; myId: string }) {
  // Ordem visual: 2º, 1º, 3º
  const order = [top[1], top[0], top[2]].filter(Boolean) as RankingEntry[];
  return (
    <View style={styles.podium}>
      {order.map((r) => {
        const pos = top.indexOf(r) + 1;
        const tall = pos === 1;
        return (
          <View key={r.user_id} style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
            <Avatar user={r.profile} size={tall ? 72 : 56} />
            <Text variant="bodyStrong" numberOfLines={1} style={{ maxWidth: 100 }}>
              {r.user_id === myId ? 'Você' : r.profile.display_name}
            </Text>
            <View style={[styles.step, { height: tall ? 92 : pos === 2 ? 70 : 54, borderColor: MEDAL[pos - 1] }]}>
              <Text variant="display" style={{ color: MEDAL[pos - 1], fontSize: tall ? 32 : 26 }}>
                {pos}
              </Text>
              <Text variant="caption" tone="secondary">
                {formatNumber(r.points)} pts
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const ranking = useRanking(id);
  const feed = useFeed(id);
  const me = useMe();
  const vote = useVote(id);
  const leave = useLeaveGroup();
  const toast = useToast();
  const [tab, setTab] = useState<'ranking' | 'feed'>('ranking');

  const g = group.data;
  const myId = me.data?.profile.id ?? '';
  if (!g) return <Screen><TopBar /></Screen>;

  const left = daysLeft(g.ends_on);
  const isOwner = g.owner_id === myId;
  const rows = ranking.data ?? [];

  const share = () =>
    Share.share({ message: `Bora treinar comigo no ArenaFit! Entre no grupo "${g.name}" com o código ${g.invite_code}.` }).catch(() => {});

  return (
    <Screen
      onRefresh={() => Promise.all([ranking.refetch(), feed.refetch()])}
      refreshing={ranking.isRefetching || feed.isRefetching}
    >
      <TopBar right={<IconButton icon="share" label="Convidar" onPress={share} />} />

      <Card style={{ gap: space.md }}>
        <View style={[styles.accentBar, { backgroundColor: g.accent }]} />
        <Text variant="title">{g.name}</Text>
        {g.description && (
          <Text variant="body" tone="secondary">
            {g.description}
          </Text>
        )}
        <View style={styles.badges}>
          <Badge label={g.visibility === 'public' ? 'Público' : 'Privado'} />
          {g.require_photo && <Badge label="Foto + emoji" tone="primary" />}
          {g.require_location && <Badge label="GPS" tone="primary" />}
          <Badge label={left === null ? 'Contínuo' : `${left} dias restantes`} />
        </View>
        <Divider />
        <View style={styles.codeRow}>
          <View>
            <Text variant="overline" tone="muted">
              Código de convite
            </Text>
            <Text variant="stat" style={{ letterSpacing: 3 }}>
              {g.invite_code}
            </Text>
          </View>
          <Button title="Convidar" icon="user-plus" size="md" variant="secondary" onPress={share} />
        </View>
      </Card>

      <View style={{ marginTop: space.xl }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'ranking', label: 'Ranking' },
            { value: 'feed', label: 'Check-ins' },
          ]}
        />
      </View>

      {tab === 'ranking' ? (
        <View style={{ marginTop: space.xl }}>
          {rows.length >= 2 && <Podium top={rows.slice(0, 3)} myId={myId} />}
          <Card padded={false} style={{ marginTop: space.xl }}>
            {rows.map((r, i) => (
              <View key={r.user_id}>
                {i > 0 && <Divider />}
                <View style={[styles.rankRow, r.user_id === myId && { backgroundColor: colors.primarySoft }]}>
                  <Text variant="bodyStrong" style={{ width: 28, color: MEDAL[i] ?? colors.textMuted }}>
                    {i + 1}
                  </Text>
                  <Avatar user={r.profile} size={36} showEmblem={false} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                      <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {r.user_id === myId ? 'Você' : r.profile.display_name}
                      </Text>
                      <UserTitle titleId={r.profile.equipped_title} />
                    </View>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      Nv {r.profile.level} · {r.checkins_count} check-ins
                    </Text>
                  </View>
                  <Text variant="stat" style={{ fontSize: 20 }} tone={r.user_id === myId ? 'primary' : 'default'}>
                    {formatNumber(r.points)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: space.md }}>
            1 treino pontuado por dia em cada grupo · descanso mantém a sequência
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {feed.data?.length ? (
            feed.data.map((item) => (
              <FeedCard
                key={item.checkin.id}
                item={item}
                isMine={item.checkin.user_id === myId}
                voting={vote.isPending}
                onVote={(v) =>
                  vote.mutate(
                    { checkinId: item.checkin.id, vote: v },
                    { onError: (e) => toast(e.message, 'error'), onSuccess: () => v === 'reject' && toast('Reprovação registrada', 'info') },
                  )
                }
              />
            ))
          ) : (
            <EmptyState icon="camera" title="Nenhum check-in ainda" message="Seja o primeiro a registrar um treino neste grupo." />
          )}
        </View>
      )}

      {!isOwner && (
        <Button
          title="Sair do grupo"
          variant="ghost"
          size="md"
          style={{ marginTop: space.xxxl, alignSelf: 'center' }}
          loading={leave.isPending}
          onPress={async () => {
            try {
              await leave.mutateAsync(g.id);
              toast(`Você saiu de ${g.name}`, 'info');
              router.back();
            } catch (e) {
              toast((e as Error).message, 'error');
            }
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accentBar: { width: 36, height: 4, borderRadius: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  step: {
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderTopWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
});
