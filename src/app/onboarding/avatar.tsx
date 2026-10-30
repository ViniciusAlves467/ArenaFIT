import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Me } from '@/api';
import { Avatar } from '@/components/Avatar';
import { StepHeader } from '@/components/StepHeader';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { useMe, useUpdateProfile } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { avatarAccents, colors, space } from '@/theme/tokens';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();

export default function OnboardingAvatar() {
  const { data: me } = useMe();
  if (!me) return <Screen>{null}</Screen>;
  return <AvatarForm me={me} />;
}

function AvatarForm({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [symbol, setSymbol] = useState(() => initials(me.private.full_name ?? me.profile.display_name ?? 'AF'));
  const [accent, setAccent] = useState<string>(avatarAccents[0]);

  const preview = {
    avatar: { symbol, accent },
    display_name: me.profile.display_name ?? '',
    equipped_frame: null,
    equipped_emblem: 'emblem_bolt',
  };

  async function finish() {
    try {
      await update.mutateAsync({
        profile: {
          avatar: { symbol: symbol.slice(0, 2).toUpperCase(), accent },
          equipped_emblem: 'emblem_bolt',
          equipped_title: 'title_rookie',
          equipped_banner: 'banner_graphite',
          onboarded_at: new Date().toISOString(),
        },
      });
      toast('Tudo pronto. Bora pro primeiro treino!', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Entrar na arena" onPress={finish} disabled={symbol.trim().length === 0} loading={update.isPending} />}>
      <TopBar />
      <StepHeader step={2} total={2} title="Sua identidade" subtitle="Molduras, emblemas e títulos você desbloqueia treinando." />

      <Card style={styles.previewCard}>
        <Avatar user={preview} size={112} />
        <Text variant="heading" style={{ marginTop: space.lg }}>
          {me.profile.display_name}
        </Text>
        <Text variant="caption" tone="muted">
          @{me.profile.username} · Nível 1
        </Text>
      </Card>

      <View style={{ gap: space.xl, marginTop: space.xl }}>
        <Input label="Iniciais" value={symbol} onChangeText={(v) => setSymbol(v.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase())} autoCapitalize="characters" maxLength={2} />
        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="secondary" style={{ marginLeft: 2 }}>
            Cor de destaque
          </Text>
          <View style={styles.swatches}>
            {avatarAccents.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ selected: accent === c }}
                accessibilityLabel={`Cor ${c}`}
                onPress={() => setAccent(c)}
                style={[styles.swatchRing, accent === c && { borderColor: c }]}
              >
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewCard: { alignItems: 'center', paddingVertical: space.xxxl },
  swatches: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  swatchRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
});
