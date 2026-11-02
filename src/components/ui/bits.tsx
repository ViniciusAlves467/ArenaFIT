import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && { backgroundColor: colors.surface3 },
        disabled && { opacity: 0.4 },
      ]}
    >
      {icon && <Icon name={icon} size={16} color={selected ? colors.primary : colors.textSecondary} />}
      <Text variant="caption" style={{ color: selected ? colors.primary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Switch com as cores do app (no web, `activeThumbColor` substitui `thumbColor`). */
export function Toggle({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const webProps = { activeThumbColor: '#fff', activeTrackColor: colors.primary } as object;
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: colors.primary, false: colors.surface3 }}
      thumbColor="#fff"
      {...webProps}
    />
  );
}

export function ProgressBar({ value, height = 6, color = colors.primary, track = colors.surface3 }: { value: number; height?: number; color?: string; track?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Indicador compacto (moedas, streak, nível) usado no topo das telas. */
export function StatPill({ icon, value, color = colors.text, onPress, label }: { icon: IconName; value: string | number; color?: string; onPress?: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.pill} disabled={!onPress}>
      <Icon name={icon} size={15} color={color} strokeWidth={2.2} />
      <Text variant="bodyStrong" style={{ fontSize: 14 }}>
        {value}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text variant="caption" style={{ color: active ? colors.text : colors.textSecondary, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_500Medium' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 300 }}>
          {message}
        </Text>
      )}
      {action && <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  style,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }, style]}>
      {icon && (
        <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerSoft }]}>
          <Icon name={icon} size={18} color={danger ? colors.danger : colors.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" tone={danger ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress && <Icon name="chevron-right" size={18} color={colors.textMuted} />)}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'danger' }) {
  const map = {
    neutral: { bg: colors.surface3, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text variant="overline" style={{ color: map.fg, fontSize: 10, letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    height: 38,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  chipSelected: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.surface3 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.huge, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
