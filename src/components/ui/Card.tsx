import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

export function Card({
  children,
  onPress,
  style,
  padded = true,
  highlight,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  /** Borda laranja sutil para destacar o item (ex.: você no ranking). */
  highlight?: boolean;
}) {
  const content = [styles.card, padded && styles.padded, highlight && styles.highlight, style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...content, pressed && { backgroundColor: colors.surface2 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: { padding: space.lg },
  highlight: { borderColor: colors.primaryBorder, backgroundColor: '#17110D' },
});
