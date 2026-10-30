import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Icon, Screen, Text, TopBar } from '@/components/ui';
import { useMyGroups, useTemplates } from '@/hooks/queries';
import { templateSummary, WEEKDAY_SHORT } from '@/lib/routines';
import { colors, radius, space } from '@/theme/tokens';

/** Treinos fixos: rotinas salvas que preenchem o check-in em um toque. */
export default function Routines() {
  const templates = useTemplates();
  const groups = useMyGroups();
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name;

  return (
    <Screen footer={<Button title="Novo treino fixo" icon="plus" onPress={() => router.push('/routines/edit')} />} onRefresh={() => templates.refetch()} refreshing={templates.isRefetching}>
      <TopBar title="Treinos fixos" />
      <Text variant="body" tone="secondary" style={{ marginBottom: space.xl }}>
        Monte sua rotina uma vez — exercícios, cargas, dias da semana e grupos. No check-in é só tocar e enviar.
      </Text>

      {templates.data?.length === 0 && (
        <EmptyState icon="dumbbell" title="Nenhum treino fixo" message="Crie o seu Treino A, B, C ou a corrida de sábado." />
      )}

      <View style={{ gap: space.md }}>
        {templates.data?.map((t) => {
          const gnames = t.group_ids.map(groupName).filter(Boolean);
          return (
            <Card key={t.id} style={{ gap: space.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${t.name}`}
                onPress={() => router.push({ pathname: '/routines/edit', params: { id: t.id } })}
                style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.icon}>
                  <Icon name={t.type} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {templateSummary(t)}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
              <View style={styles.days}>
                {WEEKDAY_SHORT.map((d, i) => (
                  <View key={d} style={[styles.day, t.weekdays.includes(i) && styles.dayOn]}>
                    <Text variant="caption" style={{ fontSize: 11, color: t.weekdays.includes(i) ? colors.onPrimary : colors.textMuted }}>
                      {d}
                    </Text>
                  </View>
                ))}
              </View>
              {gnames.length > 0 && (
                <Text variant="caption" tone="secondary">
                  Publica em: {gnames.join(', ')}
                </Text>
              )}
              <Button
                title="Fazer check-in com este treino"
                size="md"
                variant="secondary"
                icon="camera"
                onPress={() => router.push({ pathname: '/checkin/new', params: { template: t.id } })}
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, height: 26, borderRadius: 8, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.primary },
});
