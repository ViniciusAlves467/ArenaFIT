import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { IconButton } from './Button';
import { Text } from './Text';

export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  footer,
  contentStyle,
  edgeTop = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Conteúdo fixo no rodapé (ex.: botão principal). */
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  edgeTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const padding = [padded && { paddingHorizontal: space.lg }, { paddingTop: edgeTop ? insets.top + space.sm : 0 }];
  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, { paddingBottom: (footer ? 0 : insets.bottom) + space.huge * 2 }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, padding, contentStyle]}>{children}</View>
      )}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>}
    </View>
  );
}

/** Barra superior das telas internas: voltar + título + ação opcional. */
export function TopBar({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      <IconButton icon="arrow-left" label="Voltar" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      {title ? (
        <Text variant="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="secondary">
        {title}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xxl,
    marginBottom: space.md,
  },
});
