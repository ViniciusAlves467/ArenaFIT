import { StyleSheet, View } from 'react-native';

import { cosmeticById } from '@/api/catalog';
import type { PublicProfile } from '@/api';
import { colors, fonts, rarityColor } from '@/theme/tokens';

import { Icon } from './ui/Icon';
import { Text } from './ui/Text';

type AvatarSource = Pick<PublicProfile, 'avatar' | 'equipped_frame' | 'equipped_emblem' | 'display_name'>;

/**
 * Avatar minimalista: iniciais + cor de destaque, com moldura e emblema desbloqueáveis.
 * Substitui o "personagem cartoon" por uma identidade visual mais adulta e esportiva.
 */
export function Avatar({ user, size = 48, showEmblem = true }: { user: AvatarSource; size?: number; showEmblem?: boolean }) {
  const accent = user.avatar?.accent ?? colors.primary;
  const symbol = (user.avatar?.symbol || user.display_name?.slice(0, 2) || '?').toUpperCase();
  const frame = cosmeticById(user.equipped_frame);
  const emblem = cosmeticById(user.equipped_emblem);
  const style = (frame?.data.style as string) ?? 'none';
  const frameColor = (frame?.data.color as string) ?? colors.border;
  const ring = Math.max(2, Math.round(size / 24));
  const inner = size - (style === 'none' ? 0 : ring * 2 + (style === 'double' ? ring * 2 : 2));

  const core = (
    <View
      style={{
        width: inner,
        height: inner,
        borderRadius: inner / 2,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: style === 'none' ? 1 : 0,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: inner * 0.4, lineHeight: inner * 0.46, color: accent, letterSpacing: 0.5 }}>
        {symbol.slice(0, 2)}
      </Text>
    </View>
  );

  let framed = core;
  if (style === 'solid' || style === 'dashed') {
    framed = (
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: frameColor, borderStyle: style === 'dashed' ? 'dashed' : 'solid' }]}>
        {core}
      </View>
    );
  } else if (style === 'glow') {
    framed = (
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,106,19,0.18)' }]}>
        <View style={[styles.ring, { width: size - ring * 2, height: size - ring * 2, borderRadius: size, borderWidth: ring, borderColor: frameColor }]}>{core}</View>
      </View>
    );
  } else if (style === 'double') {
    framed = (
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(1, ring - 1), borderColor: frameColor }]}>
        <View style={[styles.ring, { width: size - ring * 3, height: size - ring * 3, borderRadius: size, borderWidth: Math.max(1, ring - 1), borderColor: frameColor }]}>{core}</View>
      </View>
    );
  }

  const badge = Math.max(16, size * 0.36);
  return (
    <View style={{ width: size, height: size }}>
      {framed}
      {showEmblem && emblem && size >= 36 && (
        <View
          style={[
            styles.emblem,
            { width: badge, height: badge, borderRadius: badge / 2, right: -badge * 0.12, bottom: -badge * 0.12, borderColor: colors.bg },
          ]}
        >
          <Icon name={emblem.data.icon as string} size={badge * 0.55} color={rarityColor[emblem.rarity] ?? colors.primary} strokeWidth={2.3} />
        </View>
      )}
    </View>
  );
}

export function UserTitle({ titleId, size = 'sm' }: { titleId: string | null | undefined; size?: 'sm' | 'md' }) {
  const t = cosmeticById(titleId);
  if (!t) return null;
  return (
    <Text variant="overline" style={{ color: rarityColor[t.rarity], fontSize: size === 'sm' ? 10 : 11 }}>
      {t.name}
    </Text>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  emblem: { position: 'absolute', backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
