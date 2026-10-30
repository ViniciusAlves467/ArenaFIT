import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MUSCLE_LABEL } from '@/api/catalog';
import type { Exercise } from '@/api';
import { colors, space } from '@/theme/tokens';

import { Chip, IconButton, Input, Text } from './ui';

export function ExercisePicker({
  visible,
  exercises,
  onClose,
  onPick,
}: {
  visible: boolean;
  exercises: Exercise[];
  onClose: () => void;
  onPick: (e: Exercise) => void;
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return exercises.filter((e) => (!muscle || e.muscle_group === muscle) && (!term || e.name.toLowerCase().includes(term)));
  }, [exercises, q, muscle]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
        <View style={styles.header}>
          <Text variant="heading" style={{ flex: 1 }}>
            Escolher exercício
          </Text>
          <IconButton icon="x" label="Fechar" onPress={onClose} />
        </View>
        <Input placeholder="Buscar exercício" value={q} onChangeText={setQ} autoFocus />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...Object.keys(MUSCLE_LABEL)]}
          keyExtractor={(m) => m ?? 'all'}
          contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}
          style={{ flexGrow: 0 }}
          renderItem={({ item }) => <Chip label={item ? MUSCLE_LABEL[item] : 'Todos'} selected={muscle === item} onPress={() => setMuscle(item)} />}
        />
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item);
                setQ('');
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}
            >
              <Text variant="bodyStrong">{item.name}</Text>
              <Text variant="caption" tone="muted">
                {MUSCLE_LABEL[item.muscle_group]}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  row: { paddingVertical: space.md, paddingHorizontal: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
});
