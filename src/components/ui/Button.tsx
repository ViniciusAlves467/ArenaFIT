import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';

const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
  secondary: { bg: colors.surface2, pressed: colors.surface3, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', pressed: colors.surface2, fg: colors.text },
  danger: { bg: colors.dangerSoft, pressed: 'rgba(248,113,113,0.2)', fg: colors.danger },
  light: { bg: '#F5F5F4', pressed: '#DDDDDA', fg: '#0A0A0A' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  size = 'lg',
  style,
  left,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  left?: ReactNode;
}) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border ?? 'transparent', opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {left}
          {icon && <Icon name={icon} size={size === 'md' ? 16 : 18} color={p.fg} strokeWidth={2.2} />}
          <Text variant="bodyStrong" style={{ color: p.fg, fontSize: size === 'md' ? 14 : 16 }}>
            {title}
          </Text>
          {iconRight && <Icon name={iconRight} size={18} color={p.fg} strokeWidth={2.2} />}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
  size = 40,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  tone?: 'default' | 'primary';
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, backgroundColor: pressed ? colors.surface3 : colors.surface2 },
        tone === 'primary' && { backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderColor: 'transparent' },
      ]}
    >
      <Icon name={icon} size={18} color={tone === 'primary' ? colors.onPrimary : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  lg: { height: 54, paddingHorizontal: space.xxl },
  md: { height: 40, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBtn: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
});
