import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, type Group, type GroupPatch, type RankingEntry } from '@/api';
import { Avatar } from '@/components/Avatar';
import { Button, Card, Chip, Divider, Input, ListRow, Screen, SectionTitle, Text, Toggle, TopBar } from '@/components/ui';
import { qk, useGroup, useMe, useRanking } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { daysLeft, localDay } from '@/theme/format';
import { avatarAccents, space } from '@/theme/tokens';

const EXTEND = [
  { label: 'Manter', days: undefined },
  { label: '+7 dias', days: 7 },
  { label: '+30 dias', days: 30 },
  { label: 'Sem fim', days: null },
] as const;

/** Configurações do grupo — só o dono chega aqui (botão de engrenagem no grupo). */
export default function ManageGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const ranking = useRanking(id);
  const me = useMe();
  if (!group.data || !ranking.data || !me.data) return <Screen><TopBar title="Configurar grupo" /></Screen>;
  if (group.data.owner_id !== me.data.profile.id) {
    return (
      <Screen>
        <TopBar title="Configurar grupo" />
        <Text tone="secondary">Só o dono do grupo pode alterar estas configurações.</Text>
      </Screen>
    );
  }
  return <ManageForm group={group.data} members={ranking.data} myId={me.data.profile.id} />;
}

function ManageForm({ group, members, myId }: { group: Group; members: RankingEntry[]; myId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setPublic] = useState(group.visibility === 'public');
  const [requirePhoto, setRequirePhoto] = useState(group.require_photo);
  const [requireLocation, setRequireLocation] = useState(group.require_location);
  const [accent, setAccent] = useState(group.accent);
  const [extend, setExtend] = useState<number | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.group(group.id) });
    qc.invalidateQueries({ queryKey: qk.ranking(group.id) });
    qc.invalidateQueries({ queryKey: ['groups'] });
  };

  const save = useMutation({
    mutationFn: (patch: GroupPatch) => api.updateGroup(group.id, patch),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (userId: string) => api.removeMember(group.id, userId), onSuccess: refresh });
  const regen = useMutation({ mutationFn: () => api.regenerateInviteCode(group.id), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => api.deleteGroup(group.id), onSuccess: refresh });

  const left = daysLeft(group.ends_on);
  const newEnd =
    extend === undefined
      ? group.ends_on
      : extend === null
        ? null
        : localDay(new Date(Math.max(now, group.ends_on ? Date.parse(`${group.ends_on}T12:00:00`) : now) + extend * 86_400_000));

  async function submit() {
    try {
      await save.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        visibility: isPublic ? 'public' : 'private',
        require_photo: requirePhoto,
        require_location: requireLocation,
        accent,
        ends_on: newEnd,
      });
      toast('Grupo atualizado', 'success');
      router.back();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  /** Ações destrutivas pedem um segundo toque. */
  const confirmed = (key: string) => {
    if (confirm === key) return true;
    setConfirm(key);
    toast('Toque de novo para confirmar', 'info');
    return false;
  };

  const toggle = (value: boolean, onChange: (v: boolean) => void) => (
    <Toggle value={value} onValueChange={onChange} />
  );

  return (
    <Screen footer={<Button title="Salvar alterações" onPress={submit} loading={save.isPending} disabled={name.trim().length < 3} />}>
      <TopBar title="Configurar grupo" />

      <View style={{ gap: space.lg }}>
        <Input label="Nome" value={name} onChangeText={setName} maxLength={40} />
        <Input label="Descrição" value={description} onChangeText={setDescription} maxLength={280} multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />
        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="secondary">
            Cor
          </Text>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {avatarAccents.map((c) => (
              <Pressable key={c} accessibilityLabel={`Cor ${c}`} onPress={() => setAccent(c)} style={[styles.swatchRing, accent === c && { borderColor: c }]}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="secondary">
            Término · {left === null ? 'sem data' : `${left} dias restantes`}
            {newEnd !== group.ends_on ? ` → ${newEnd ? new Date(`${newEnd}T12:00:00`).toLocaleDateString('pt-BR') : 'sem fim'}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {EXTEND.map((o) => (
              <Chip key={o.label} label={o.label} selected={extend === o.days} onPress={() => setExtend(o.days)} />
            ))}
          </View>
        </View>
      </View>

      <Card padded={false} style={{ marginTop: space.xl }}>
        <ListRow icon="globe" title="Grupo público" subtitle="Aparece em Explorar" right={toggle(isPublic, setPublic)} />
        <ListRow icon="camera" title="Exigir foto com emoji do dia" right={toggle(requirePhoto, setRequirePhoto)} />
        <ListRow icon="map-pin" title="Exigir localização" right={toggle(requireLocation, setRequireLocation)} />
      </Card>

      <SectionTitle title="Convite" />
      <Card style={styles.codeRow}>
        <View>
          <Text variant="overline" tone="muted">
            Código atual
          </Text>
          <Text variant="stat" style={{ letterSpacing: 3 }}>
            {group.invite_code}
          </Text>
        </View>
        <Button
          title="Gerar novo"
          size="md"
          variant="secondary"
          loading={regen.isPending}
          onPress={() =>
            confirmed('regen') &&
            regen.mutate(undefined, {
              onSuccess: (code) => toast(`Novo código: ${code}. O antigo deixou de valer.`, 'success'),
              onError: (e) => toast(e.message, 'error'),
            })
          }
        />
      </Card>

      <SectionTitle title={`Membros (${members.length})`} />
      <Card padded={false}>
        {members.map((m, i) => (
          <View key={m.user_id}>
            {i > 0 && <Divider />}
            <View style={styles.member}>
              <Avatar user={m.profile} size={36} showEmblem={false} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{m.user_id === myId ? 'Você' : m.profile.display_name}</Text>
                <Text variant="caption" tone="muted">
                  @{m.profile.username} · {m.points} pts
                </Text>
              </View>
              {m.user_id === myId ? (
                <Text variant="caption" tone="primary">
                  Dono
                </Text>
              ) : (
                <Button
                  title={confirm === `rm:${m.user_id}` ? 'Confirmar' : 'Remover'}
                  size="md"
                  variant="danger"
                  loading={remove.isPending && remove.variables === m.user_id}
                  onPress={() =>
                    confirmed(`rm:${m.user_id}`) &&
                    remove.mutate(m.user_id, {
                      onSuccess: () => toast(`${m.profile.display_name} saiu do grupo`, 'info'),
                      onError: (e) => toast(e.message, 'error'),
                    })
                  }
                />
              )}
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle title="Zona de perigo" />
      <Card padded={false}>
        <ListRow
          icon="trash"
          danger
          title={confirm === 'delete' ? 'Toque de novo para excluir definitivamente' : 'Excluir grupo'}
          subtitle="Apaga o ranking e os check-ins publicados neste grupo"
          onPress={() =>
            confirmed('delete') &&
            del.mutate(undefined, {
              onSuccess: () => {
                toast('Grupo excluído', 'info');
                router.dismissTo('/groups');
              },
              onError: (e) => toast(e.message, 'error'),
            })
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatchRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
});
