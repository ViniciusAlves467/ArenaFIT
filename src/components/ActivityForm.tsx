import { CARDIO_TYPES } from '@shared/checkin-input.ts';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { ActivityType, ActivityVariant, Exercise, WorkoutTemplate } from '@/api';
import { EXERCISES, MUSCLE_LABEL } from '@/api/catalog';
import { formatPace } from '@/theme/format';
import { colors, space } from '@/theme/tokens';

import { ExercisePicker } from './ExercisePicker';
import { ACTIVITY_LABEL, Button, Card, Chip, Icon, IconButton, Input, SectionTitle, Text } from './ui';

export const ACTIVITY_TYPES: ActivityType[] = ['strength', 'run', 'walk', 'cycle', 'swim', 'rest'];

export const VARIANT_OPTIONS: Partial<Record<ActivityType, { value: ActivityVariant; label: string }[]>> = {
  cycle: [
    { value: 'road', label: 'Ao ar livre' },
    { value: 'indoor', label: 'Bike indoor' },
  ],
  swim: [
    { value: 'pool', label: 'Piscina' },
    { value: 'open_water', label: 'Águas abertas' },
  ],
};

interface SetDraft {
  load: string;
  reps: string;
}
interface ExerciseDraft {
  key: string;
  exercise: Exercise;
  sets: SetDraft[];
}

/** Estado editável de uma atividade — compartilhado entre check-in e treino fixo. */
export interface ActivityDraft {
  type: ActivityType;
  variant: ActivityVariant | null;
  exercises: ExerciseDraft[];
  duration: string;
  distance: string;
  elevation: string;
}

export const emptyDraft = (type: ActivityType = 'strength'): ActivityDraft => ({
  type,
  variant: VARIANT_OPTIONS[type]?.[0].value ?? null,
  exercises: [],
  duration: '',
  distance: '',
  elevation: '',
});

export const num = (v: string) => Number(v.replace(',', '.'));
const key = () => Math.random().toString(36).slice(2, 9);
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

export function draftFromTemplate(t: WorkoutTemplate): ActivityDraft {
  return {
    type: t.type,
    variant: t.variant ?? VARIANT_OPTIONS[t.type]?.[0].value ?? null,
    exercises: t.exercises
      .map((e) => {
        const exercise = EXERCISES.find((x) => x.id === e.exerciseId);
        return exercise ? { key: key(), exercise, sets: e.sets.map((s) => ({ load: str(s.loadKg), reps: str(s.reps) })) } : null;
      })
      .filter((e): e is ExerciseDraft => !!e),
    duration: str(t.duration_min),
    distance: str(t.distance_km),
    elevation: '',
  };
}

export const isCardio = (d: ActivityDraft) => CARDIO_TYPES.includes(d.type);

/** `requireValues`: no check-in todos os campos são obrigatórios; no treino fixo podem ficar vazios. */
export function draftIsValid(d: ActivityDraft, requireValues = true): boolean {
  if (d.type === 'strength') {
    if (d.exercises.length === 0) return false;
    if (!requireValues) return true;
    return d.exercises.every((e) => e.sets.every((s) => s.load !== '' && num(s.load) >= 0 && Number.isInteger(num(s.reps)) && num(s.reps) >= 1));
  }
  if (isCardio(d) && requireValues) return num(d.duration) >= 1 && num(d.distance) > 0;
  return true;
}

export function draftExercises(d: ActivityDraft) {
  return d.exercises.map((e) => ({
    exerciseId: e.exercise.id,
    sets: e.sets.filter((s) => s.reps !== '').map((s) => ({ loadKg: num(s.load || '0'), reps: num(s.reps) })),
  }));
}

export function ActivityForm({ draft, onChange, exercises }: { draft: ActivityDraft; onChange: (d: ActivityDraft) => void; exercises: Exercise[] }) {
  const [picker, setPicker] = useState(false);
  const set = (patch: Partial<ActivityDraft>) => onChange({ ...draft, ...patch });
  const updateSets = (k: string, fn: (sets: SetDraft[]) => SetDraft[]) =>
    set({ exercises: draft.exercises.map((e) => (e.key === k ? { ...e, sets: fn(e.sets) } : e)).filter((e) => e.sets.length > 0) });

  const pace = draft.type === 'run' ? formatPace(num(draft.duration), num(draft.distance)) : null;
  const swimPace =
    draft.type === 'swim' && num(draft.duration) > 0 && num(draft.distance) > 0
      ? (() => {
          const sec = (num(draft.duration) * 60) / (num(draft.distance) * 10);
          return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} /100 m`;
        })()
      : null;
  const speed = draft.type === 'cycle' && num(draft.duration) > 0 && num(draft.distance) > 0 ? `${(num(draft.distance) / (num(draft.duration) / 60)).toFixed(1).replace('.', ',')} km/h` : null;
  const variants = VARIANT_OPTIONS[draft.type];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg, flexGrow: 0 }}>
        {ACTIVITY_TYPES.map((t) => (
          <Chip key={t} label={ACTIVITY_LABEL[t]} icon={t} selected={draft.type === t} onPress={() => onChange({ ...emptyDraft(t), exercises: draft.exercises })} />
        ))}
        <View style={{ width: space.lg }} />
      </ScrollView>

      {variants && (
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          {variants.map((v) => (
            <Chip key={v.value} label={v.label} selected={draft.variant === v.value} onPress={() => set({ variant: v.value })} />
          ))}
        </View>
      )}

      {draft.type === 'strength' && (
        <>
          <SectionTitle title="Exercícios" />
          <View style={{ gap: space.md }}>
            {draft.exercises.map((e) => (
              <Card key={e.key} style={{ gap: space.md }}>
                <View style={styles.exHeader}>
                  <Icon name="dumbbell" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.exercise.name}</Text>
                    <Text variant="caption" tone="muted">
                      {MUSCLE_LABEL[e.exercise.muscle_group]}
                    </Text>
                  </View>
                  <IconButton icon="trash" label="Remover exercício" size={34} onPress={() => set({ exercises: draft.exercises.filter((x) => x.key !== e.key) })} />
                </View>
                <View style={styles.setRow}>
                  <Text variant="overline" tone="muted" style={{ width: 44 }}>
                    Série
                  </Text>
                  <Text variant="overline" tone="muted" style={{ flex: 1 }}>
                    Carga (kg)
                  </Text>
                  <Text variant="overline" tone="muted" style={{ flex: 1 }}>
                    Reps
                  </Text>
                  <View style={{ width: 34 }} />
                </View>
                {e.sets.map((s, i) => (
                  <View key={i} style={styles.setRow}>
                    <Text variant="stat" tone="muted" style={{ width: 44, fontSize: 18 }}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Input value={s.load} onChangeText={(v) => updateSets(e.key, (sets) => sets.map((x, j) => (j === i ? { ...x, load: v } : x)))} keyboardType="decimal-pad" placeholder="0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        value={s.reps}
                        onChangeText={(v) => updateSets(e.key, (sets) => sets.map((x, j) => (j === i ? { ...x, reps: v.replace(/\D/g, '') } : x)))}
                        keyboardType="number-pad"
                        placeholder="10"
                      />
                    </View>
                    <IconButton icon="minus" label="Remover série" size={34} onPress={() => updateSets(e.key, (sets) => sets.filter((_, j) => j !== i))} />
                  </View>
                ))}
                <Button title="Adicionar série" icon="plus" variant="ghost" size="md" onPress={() => updateSets(e.key, (sets) => [...sets, { ...(sets.at(-1) ?? { load: '', reps: '' }) }])} />
              </Card>
            ))}
            <Button title="Adicionar exercício" icon="plus" variant="secondary" onPress={() => setPicker(true)} />
            <Text variant="caption" tone="muted">
              Conta o melhor 1RM estimado de cada exercício — mais séries não somam pontos.
            </Text>
          </View>
        </>
      )}

      {isCardio(draft) && (
        <>
          <SectionTitle title="Dados do treino" />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Duração" value={draft.duration} onChangeText={(v) => set({ duration: v })} keyboardType="decimal-pad" suffix="min" placeholder="30" />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Distância"
                value={draft.distance}
                onChangeText={(v) => set({ distance: v })}
                keyboardType="decimal-pad"
                suffix="km"
                placeholder={draft.type === 'swim' ? '1,5' : draft.type === 'cycle' ? '20' : '5'}
              />
            </View>
          </View>
          {draft.type === 'cycle' && draft.variant === 'road' && (
            <View style={{ marginTop: space.md }}>
              <Input
                label="Ganho de elevação (opcional)"
                value={draft.elevation}
                onChangeText={(v) => set({ elevation: v.replace(/\D/g, '') })}
                keyboardType="number-pad"
                suffix="m"
                placeholder="0"
                hint="Cada 100 m de subida valem 1 km no plano."
              />
            </View>
          )}
          {(pace || swimPace || speed) && (
            <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
              {draft.type === 'cycle' ? 'Velocidade média' : 'Ritmo médio'}: <Text variant="caption">{pace ?? swimPace ?? speed}</Text>
            </Text>
          )}
          {draft.type === 'cycle' && draft.variant === 'indoor' && (
            <Text variant="caption" tone="muted" style={{ marginTop: space.sm }}>
              Bike indoor vale a pontuação base + bônus neutro (a distância muda de aparelho para aparelho).
            </Text>
          )}
        </>
      )}

      <ExercisePicker
        visible={picker}
        exercises={exercises}
        onClose={() => setPicker(false)}
        onPick={(exercise) => {
          set({ exercises: [...draft.exercises, { key: key(), exercise, sets: [{ load: '', reps: '' }] }] });
          setPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
