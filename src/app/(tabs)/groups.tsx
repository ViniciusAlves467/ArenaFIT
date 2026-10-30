import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { GroupSummary, PublicGroup } from '@/api';
import { Badge, Button, Card, EmptyState, Icon, Input, Screen, Segmented, Text } from '@/components/ui';
import { useJoinGroup, useMe, useMyGroups, usePublicGroups, useUpdateProfile } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { daysLeft, formatNumber } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

function periodLabel(endsOn: string | null) {
  const left = daysLeft(endsOn);
  if (left === null) return 'Sem data de término';
  if (left === 0) return 'Termina hoje';
  return `${left} ${left === 1 ? 'dia restante' : 'dias restantes'}`;
}

function MyGroupCard({ group, favorite, onFavorite }: { group: GroupSummary; favorite: boolean; onFavorite: () => void }) {
  return (
    <Card onPress={() => router.push(`/group/${group.id}`)} padded={false}>
      <View style={styles.cardRow}>
        <View style={[styles.accent, { backgroundColor: group.accent }]} />
        <View style={{ flex: 1, gap: 4, paddingVertical: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>
              {group.name}
            </Text>
            {group.visibility === 'public' && <Icon name="globe" size={14} color={colors.textMuted} />}
          </View>
          <Text variant="caption" tone="muted">
            {group.member_count} membros · {periodLabel(group.ends_on)}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.sm }}>
            <View>
              <Text variant="stat" tone="primary">
                {group.my_rank}º
              </Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                sua posição
              </Text>
            </View>
            <View>
              <Text variant="stat">{formatNumber(group.my_points)}</Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                seus pontos
              </Text>
            </View>
          </View>
        </View>
        <Pressable accessibilityLabel={favorite ? 'Grupo favorito' : 'Marcar como favorito'} hitSlop={12} onPress={onFavorite} style={styles.star}>
          <Icon name="star" size={20} color={favorite ? colors.primary : colors.textMuted} strokeWidth={favorite ? 2.4 : 1.8} />
        </Pressable>
      </View>
    </Card>
  );
}

function PublicGroupCard({ group }: { group: PublicGroup }) {
  const join = useJoinGroup();
  const toast = useToast();
  return (
    <Card onPress={group.is_member ? () => router.push(`/group/${group.id}`) : undefined}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View style={[styles.square, { backgroundColor: group.accent }]}>
          <Icon name="users" size={18} color={colors.onPrimary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {group.name}
          </Text>
          <Text variant="caption" tone="muted">
            {group.member_count} membros · {periodLabel(group.ends_on)}
          </Text>
        </View>
        {group.is_member ? (
          <Badge label="Participando" tone="success" />
        ) : (
          <Button
            title="Entrar"
            size="md"
            loading={join.isPending}
            onPress={async () => {
              try {
                await join.mutateAsync({ id: group.id });
                toast(`Você entrou em ${group.name}`, 'success');
                router.push(`/group/${group.id}`);
              } catch (e) {
                toast((e as Error).message, 'error');
              }
            }}
          />
        )}
      </View>
      {group.description && (
        <Text variant="caption" tone="secondary" style={{ marginTop: space.md }} numberOfLines={2}>
          {group.description}
        </Text>
      )}
    </Card>
  );
}

export default function Groups() {
  const [tab, setTab] = useState<'mine' | 'explore'>('mine');
  const [search, setSearch] = useState('');
  const mine = useMyGroups();
  const explore = usePublicGroups(search);
  const me = useMe();
  const update = useUpdateProfile();
  const favorite = me.data?.profile.favorite_group_id;

  return (
    <Screen onRefresh={() => (tab === 'mine' ? mine.refetch() : explore.refetch())} refreshing={mine.isRefetching || explore.isRefetching}>
      <Text variant="title" style={{ marginBottom: space.lg }}>
        Grupos
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        <Button title="Criar grupo" icon="plus" size="md" style={{ flex: 1 }} onPress={() => router.push('/group/new')} />
        <Button title="Usar código" icon="hash" size="md" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/group/join')} />
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: 'Meus grupos' },
          { value: 'explore', label: 'Explorar' },
        ]}
      />

      <View style={{ gap: space.md, marginTop: space.lg }}>
        {tab === 'mine' ? (
          mine.data?.length ? (
            mine.data.map((g) => (
              <MyGroupCard
                key={g.id}
                group={g}
                favorite={g.id === favorite}
                onFavorite={() => update.mutate({ profile: { favorite_group_id: g.id === favorite ? null : g.id } })}
              />
            ))
          ) : (
            <EmptyState icon="users" title="Nenhum grupo ainda" message="Crie um grupo para competir com seus amigos ou explore os desafios abertos." />
          )
        ) : (
          <>
            <Input placeholder="Buscar grupos abertos" value={search} onChangeText={setSearch} autoCapitalize="none" />
            {explore.data?.map((g) => <PublicGroupCard key={g.id} group={g} />)}
            {explore.data?.length === 0 && <EmptyState icon="search" title="Nada por aqui" message="Tente outro nome ou crie um grupo público." />}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardRow: { flexDirection: 'row', alignItems: 'stretch', gap: space.lg },
  accent: { width: 4 },
  star: { paddingHorizontal: space.lg, justifyContent: 'center' },
  square: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
