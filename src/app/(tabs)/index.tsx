import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { isDemo } from '@/api';
import { Avatar, UserTitle } from '@/components/Avatar';
import { CheckinRow, GroupTile, LevelBar, WeekStrip } from '@/components/home';
import { useReminderContext } from '@/components/ReminderCard';
import { Badge, Button, Card, Divider, EmptyState, Icon, Screen, SectionTitle, StatPill, Text } from '@/components/ui';
import { useDailyEmoji, useMe, useMyCheckins, useMyGroups, useRanking, useTemplates } from '@/hooks/queries';
import { syncReminders } from '@/lib/reminders';
import { templateSummary, templatesForToday } from '@/lib/routines';
import { formatNumber, greeting, localDay } from '@/theme/format';
import { colors, space } from '@/theme/tokens';

function FavoriteGroup({ groupId, myId }: { groupId: string; myId: string }) {
  const { data: groups } = useMyGroups();
  const { data: ranking } = useRanking(groupId);
  const group = groups?.find((g) => g.id === groupId);
  if (!group || !ranking) return null;
  const top = ranking.slice(0, 3);
  const meIndex = ranking.findIndex((r) => r.user_id === myId);
  const rows = meIndex > 2 ? [...top, ranking[meIndex]] : top;

  return (
    <Card onPress={() => router.push(`/group/${group.id}`)}>
      <View style={styles.favHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="star" size={14} color={colors.primary} />
            <Text variant="overline" tone="secondary">
              Grupo favorito
            </Text>
          </View>
          <Text variant="heading" style={{ marginTop: 4 }} numberOfLines={1}>
            {group.name}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </View>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {rows.map((r) => {
          const pos = ranking.indexOf(r) + 1;
          const isMe = r.user_id === myId;
          return (
            <View key={r.user_id} style={[styles.rankRow, isMe && styles.rankMe]}>
              <Text variant="bodyStrong" style={{ width: 24, color: pos === 1 ? colors.gold : pos === 2 ? colors.silver : pos === 3 ? colors.bronze : colors.textMuted }}>
                {pos}
              </Text>
              <Avatar user={r.profile} size={30} showEmblem={false} />
              <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {isMe ? 'Você' : r.profile.display_name}
              </Text>
              <Text variant="bodyStrong" tone={isMe ? 'primary' : 'default'}>
                {formatNumber(r.points)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default function Home() {
  const me = useMe();
  const groups = useMyGroups();
  const checkins = useMyCheckins();
  const emoji = useDailyEmoji();
  const templates = useTemplates();
  const reminder = useReminderContext();

  // Refaz a agenda de lembretes quando o status do dia muda (ex.: depois de um check-in).
  useEffect(() => {
    if (reminder.ready) syncReminders({ doneToday: reminder.doneToday, streak: reminder.streak }).catch(() => {});
  }, [reminder.ready, reminder.doneToday, reminder.streak]);

  if (!me.data) return <Screen>{null}</Screen>;
  const { profile } = me.data;
  const todayDone = (checkins.data ?? []).some((c) => localDay(new Date(c.performed_at)) === localDay());
  const favorite = profile.favorite_group_id ?? groups.data?.[0]?.id;
  const todays = templatesForToday(templates.data ?? []);

  const refresh = () => Promise.all([me.refetch(), groups.refetch(), checkins.refetch()]);

  return (
    <Screen onRefresh={refresh} refreshing={me.isRefetching}>
      <View style={styles.header}>
        <Avatar user={profile} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="secondary">
            {greeting()},
          </Text>
          <Text variant="heading" numberOfLines={1}>
            {profile.display_name}
          </Text>
        </View>
        <StatPill icon="flame" value={profile.current_streak} color={profile.current_streak > 0 ? colors.primary : colors.textMuted} label="Sequência de dias" />
        <StatPill icon="coins" value={formatNumber(profile.coins)} color={colors.gold} label="Moedas — abrir loja" onPress={() => router.push('/shop')} />
      </View>
      {isDemo && (
        <View style={{ marginTop: space.md }}>
          <Badge label="Modo demo · dados locais" tone="primary" />
        </View>
      )}

      <Card style={{ marginTop: space.xl, gap: space.xl }}>
        <View style={styles.todayRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="overline" tone="primary">
              {todayDone ? 'Check-in feito hoje' : 'Treino de hoje'}
            </Text>
            <Text variant="title" style={{ fontSize: 20 }}>
              {todayDone ? 'Mandou bem. Descanso também conta.' : todays.length ? 'Hoje é dia de:' : 'Registre e pontue'}
            </Text>
            <Text variant="caption" tone="secondary">
              Mostre o emoji do dia na foto para validar nos grupos.
            </Text>
          </View>
          <View style={styles.emojiBox}>
            <Text style={{ fontSize: 34, lineHeight: 42 }}>{emoji.data ?? '…'}</Text>
            <Text variant="overline" tone="muted" style={{ fontSize: 9 }}>
              Emoji do dia
            </Text>
          </View>
        </View>
        {todays.length > 0 && !todayDone ? (
          <View style={{ gap: space.sm }}>
            {todays.map((t) => (
              <Card key={t.id} onPress={() => router.push({ pathname: '/checkin/new', params: { template: t.id } })} style={styles.todayTemplate}>
                <Icon name={t.type} size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {templateSummary(t)}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.textMuted} />
              </Card>
            ))}
            <Button title="Outro treino" icon="camera" variant="secondary" onPress={() => router.push('/checkin/new')} />
          </View>
        ) : (
          <Button title={todayDone ? 'Registrar outro treino' : 'Fazer check-in'} icon="camera" variant={todayDone ? 'secondary' : 'primary'} onPress={() => router.push('/checkin/new')} />
        )}
        <Divider />
        <WeekStrip checkins={checkins.data ?? []} goal={profile.weekly_goal} />
      </Card>

      <Card style={{ marginTop: space.md, gap: space.md }}>
        <LevelBar xp={profile.xp} />
        <View style={styles.titleRow}>
          <UserTitle titleId={profile.equipped_title} />
          <Text variant="caption" tone="muted">
            {formatNumber(profile.xp)} XP no total
          </Text>
        </View>
      </Card>

      {favorite && (
        <>
          <SectionTitle title="Ranking" />
          <FavoriteGroup groupId={favorite} myId={profile.id} />
        </>
      )}

      <SectionTitle
        title="Seus grupos"
        action={
          <Text variant="caption" tone="primary" onPress={() => router.push('/(tabs)/groups')}>
            Ver todos
          </Text>
        }
      />
      {groups.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }} style={{ marginHorizontal: -space.lg }} contentInset={{ left: space.lg }}>
          <View style={{ width: space.lg - space.md }} />
          {groups.data.map((g) => (
            <GroupTile key={g.id} group={g} favorite={g.id === favorite} />
          ))}
          <View style={{ width: space.lg - space.md }} />
        </ScrollView>
      ) : (
        <Card>
          <EmptyState
            icon="users"
            title="Treinar junto rende mais"
            message="Crie um grupo com seus amigos ou entre em um desafio aberto."
            action={<Button title="Criar ou entrar em um grupo" variant="secondary" onPress={() => router.push('/(tabs)/groups')} />}
          />
        </Card>
      )}

      <SectionTitle title="Atividade recente" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {(checkins.data ?? []).slice(0, 5).map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <CheckinRow checkin={c} />
          </View>
        ))}
        {!checkins.data?.length && <EmptyState icon="activity" title="Nenhum treino ainda" message="Seu histórico aparece aqui." />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  todayRow: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  emojiBox: {
    width: 84,
    height: 92,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  todayTemplate: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface2, paddingVertical: space.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  favHeader: { flexDirection: 'row', alignItems: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: 10 },
  rankMe: { backgroundColor: colors.primarySoft },
});
