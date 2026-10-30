import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Cosmetic, CosmeticKind, ProfilePatch } from '@/api';
import { Avatar } from '@/components/Avatar';
import { Button, Card, Icon, Screen, Segmented, StatPill, Text, TopBar } from '@/components/ui';
import { useCosmetics, useMe, useOwnedCosmetics, usePurchase, useUpdateProfile } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { formatNumber } from '@/theme/format';
import { colors, radius, rarityColor, space } from '@/theme/tokens';

const KIND_LABEL: Record<CosmeticKind, string> = { frame: 'Molduras', title: 'Títulos', emblem: 'Emblemas', banner: 'Banners' };
const RARITY_LABEL = { common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário' } as const;
const SLOT: Record<CosmeticKind, keyof ProfilePatch> = {
  frame: 'equipped_frame',
  title: 'equipped_title',
  emblem: 'equipped_emblem',
  banner: 'equipped_banner',
};

export default function Shop() {
  const me = useMe();
  const cosmetics = useCosmetics();
  const owned = useOwnedCosmetics();
  const purchase = usePurchase();
  const update = useUpdateProfile();
  const toast = useToast();
  const [kind, setKind] = useState<CosmeticKind>('frame');
  const [selected, setSelected] = useState<Cosmetic | null>(null);

  const profile = me.data?.profile;
  const items = useMemo(() => (cosmetics.data ?? []).filter((c) => c.kind === kind), [cosmetics.data, kind]);
  if (!profile) return <Screen><TopBar title="Loja" /></Screen>;

  const ownedSet = new Set(owned.data ?? []);
  const isOwned = (c: Cosmetic) => c.price === 0 || ownedSet.has(c.id);
  const equippedId = (c: Cosmetic) => profile[SLOT[c.kind as CosmeticKind] as keyof typeof profile];

  // Pré-visualização: o perfil atual com o item selecionado aplicado.
  const preview = { ...profile, ...(selected ? { [SLOT[selected.kind as CosmeticKind]]: selected.id } : {}) };
  const banner = (cosmetics.data ?? []).find((c) => c.id === preview.equipped_banner)?.data ?? { from: '#1A1A1A', to: '#0D0D0D' };
  const title = (cosmetics.data ?? []).find((c) => c.id === preview.equipped_title);

  async function act(c: Cosmetic) {
    try {
      if (!isOwned(c)) {
        await purchase.mutateAsync(c.id);
        toast(`${c.name} desbloqueado`, 'success');
      }
      await update.mutateAsync({ profile: { [SLOT[c.kind as CosmeticKind]]: c.id } });
      toast(`${c.name} equipado`, 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const sel = selected && selected.kind === kind ? selected : null;
  const locked = sel ? profile.level < sel.min_level : false;
  const cantAfford = sel ? !isOwned(sel) && profile.coins < sel.price : false;

  return (
    <Screen
      footer={
        sel ? (
          <Button
            title={
              equippedId(sel) === sel.id
                ? 'Equipado'
                : locked
                  ? `Requer nível ${sel.min_level}`
                  : isOwned(sel)
                    ? 'Equipar'
                    : `Comprar por ${formatNumber(sel.price)} moedas`
            }
            icon={isOwned(sel) ? 'check' : 'coins'}
            disabled={equippedId(sel) === sel.id || locked || cantAfford}
            loading={purchase.isPending || update.isPending}
            onPress={() => act(sel)}
          />
        ) : undefined
      }
    >
      <TopBar title="Loja" right={<StatPill icon="coins" value={formatNumber(profile.coins)} color={colors.gold} label="Suas moedas" />} />

      <Card padded={false}>
        <LinearGradient colors={[banner.from, banner.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.previewBanner} />
        <View style={styles.previewBody}>
          <View style={styles.previewAvatar}>
            <Avatar user={preview} size={84} />
          </View>
          <Text variant="heading" style={{ marginTop: space.sm }}>
            {profile.display_name}
          </Text>
          {title && (
            <Text variant="overline" style={{ color: rarityColor[title.rarity] }}>
              {title.name}
            </Text>
          )}
        </View>
      </Card>

      <View style={{ marginTop: space.lg }}>
        <Segmented value={kind} onChange={(k) => setKind(k)} options={(Object.keys(KIND_LABEL) as CosmeticKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
      </View>

      <View style={styles.grid}>
        {items.map((c) => {
          const active = sel?.id === c.id;
          const equipped = equippedId(c) === c.id;
          const lockedItem = profile.level < c.min_level;
          return (
            <Pressable key={c.id} onPress={() => setSelected(c)} style={[styles.item, active && styles.itemActive]}>
              <View style={styles.itemPreview}>
                <ItemPreview cosmetic={c} profile={profile} />
                {lockedItem && (
                  <View style={styles.lock}>
                    <Icon name="lock" size={14} color={colors.textSecondary} />
                  </View>
                )}
              </View>
              <Text variant="bodyStrong" numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="overline" style={{ color: rarityColor[c.rarity], fontSize: 10 }}>
                {RARITY_LABEL[c.rarity]}
              </Text>
              <View style={styles.price}>
                {equipped ? (
                  <Text variant="caption" tone="primary">
                    Equipado
                  </Text>
                ) : isOwned(c) ? (
                  <Text variant="caption" tone="secondary">
                    Seu
                  </Text>
                ) : lockedItem ? (
                  <Text variant="caption" tone="muted">
                    Nível {c.min_level}
                  </Text>
                ) : (
                  <>
                    <Icon name="coins" size={13} color={colors.gold} />
                    <Text variant="caption">{formatNumber(c.price)}</Text>
                  </>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function ItemPreview({ cosmetic, profile }: { cosmetic: Cosmetic; profile: NonNullable<ReturnType<typeof useMe>['data']>['profile'] }) {
  switch (cosmetic.kind) {
    case 'frame':
      return <Avatar user={{ ...profile, equipped_frame: cosmetic.id }} size={64} showEmblem={false} />;
    case 'emblem':
      return (
        <View style={styles.emblemPreview}>
          <Icon name={cosmetic.data.icon} size={28} color={rarityColor[cosmetic.rarity]} />
        </View>
      );
    case 'banner':
      return <LinearGradient colors={[cosmetic.data.from, cosmetic.data.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerPreview} />;
    default:
      return (
        <Text variant="overline" style={{ color: rarityColor[cosmetic.rarity], fontSize: 13 }} align="center">
          {cosmetic.name}
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  previewBanner: { height: 72 },
  previewBody: { alignItems: 'center', paddingBottom: space.lg, marginTop: -42 },
  previewAvatar: { padding: 4, borderRadius: 60, backgroundColor: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.lg },
  item: {
    width: '47.8%',
    flexGrow: 1,
    padding: space.md,
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemActive: { borderColor: colors.primary },
  itemPreview: { height: 96, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm, overflow: 'hidden' },
  lock: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  emblemPreview: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  bannerPreview: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
