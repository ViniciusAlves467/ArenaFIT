import { View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { Text } from './ui/Text';

export function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: space.xxl }}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.xl }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.primary : colors.surface3 }} />
        ))}
      </View>
      <Text variant="overline" tone="primary">
        Passo {step} de {total}
      </Text>
      <Text variant="title" style={{ marginTop: space.xs }}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
