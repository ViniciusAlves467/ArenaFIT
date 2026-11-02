import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { Text } from './ui/Text';

const LENGTH = 6;

/** Código de verificação em 6 caixas; um TextInput invisível recebe o teclado e o autocompletar. */
export function CodeInput({ value, onChange, onComplete, error }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; error?: boolean }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable accessibilityLabel="Código de verificação" onPress={() => ref.current?.focus()} style={styles.row}>
      {Array.from({ length: LENGTH }, (_, i) => {
        const active = focused && (i === value.length || (i === LENGTH - 1 && value.length === LENGTH));
        return (
          <View key={i} style={[styles.box, active && styles.boxActive, error && styles.boxError]}>
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, LENGTH);
          onChange(digits);
          if (digits.length === LENGTH) onComplete?.(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        autoFocus
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  box: {
    width: 48,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.text },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
