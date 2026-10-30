import { Text as RNText, type TextProps } from 'react-native';

import { colors, type TypeVariant, type as typography } from '@/theme/tokens';

type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'success' | 'danger' | 'onPrimary';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  onPrimary: colors.onPrimary,
};

export function Text({
  variant = 'body',
  tone = 'default',
  align,
  style,
  ...rest
}: TextProps & { variant?: TypeVariant; tone?: Tone; align?: 'left' | 'center' | 'right' }) {
  return <RNText {...rest} style={[typography[variant], { color: toneColor[tone], textAlign: align }, style]} />;
}
