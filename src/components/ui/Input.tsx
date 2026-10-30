import { type ComponentRef, forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { Text } from './Text';

export const Input = forwardRef<ComponentRef<typeof TextInput>, TextInputProps & { label?: string; error?: string | null; suffix?: string; hint?: string }>(
  function Input({ label, error, suffix, hint, style, onFocus, onBlur, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.wrap}>
        {label && (
          <Text variant="caption" tone="secondary" style={styles.label}>
            {label}
          </Text>
        )}
        <View style={[styles.field, focused && styles.focused, !!error && styles.error]}>
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, style]}
            {...rest}
          />
          {suffix && (
            <Text variant="caption" tone="muted">
              {suffix}
            </Text>
          )}
        </View>
        {error ? (
          <Text variant="caption" tone="danger" style={styles.below}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="muted" style={styles.below}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  focused: { borderColor: colors.primary },
  error: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 14, outlineStyle: 'none' } as any,
  below: { marginLeft: 2 },
});
