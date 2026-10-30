import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { WorkoutTemplate } from '@/api';
import { ActivityForm, type ActivityDraft, draftExercises, draftFromTemplate, draftIsValid, emptyDraft, isCardio, num } from '@/components/ActivityForm';
import { Button, Chip, Input, Screen, SectionTitle, Text, TopBar } from '@/components/ui';
import { useDeleteTemplate, useExercises, useMyGroups, useSaveTemplate, useTemplates } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { WEEKDAY_SHORT } from '@/lib/routines';
import { space } from '@/theme/tokens';

export default function EditRoutine() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const templates = useTemplates();
  if (id && !templates.data) return <Screen><TopBar title="Editar treino fixo" /></Screen>;
  return <RoutineForm template={templates.data?.find((t) => t.id === id)} />;
}

function RoutineForm({ template }: { template?: WorkoutTemplate }) {
  const id = template?.id;
  const groups = useMyGroups();
  const exercises = useExercises();
  const save = useSaveTemplate();
  const remove = useDeleteTemplate();
  const toast = useToast();

  const [name, setName] = useState(template?.name ?? '');
  const [draft, setDraft] = useState<ActivityDraft>(() => (template ? draftFromTemplate(template) : emptyDraft()));
  const [weekdays, setWeekdays] = useState<number[]>(template?.weekdays ?? []);
  const [groupIds, setGroupIds] = useState<string[]>(template?.group_ids ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const valid = name.trim().length > 0 && draft.type !== 'rest' && draftIsValid(draft, false);

  async function submit() {
    const cardio = isCardio(draft);
    try {
      await save.mutateAsync({
        id,
        name: name.trim(),
        type: draft.type,
        variant: draft.variant,
        exercises: draft.type === 'strength' ? draftExercises(draft) : [],
        duration_min: cardio && draft.duration ? num(draft.duration) : null,
        distance_km: cardio && draft.distance ? num(draft.distance) : null,
        weekdays: [...weekdays].sort(),
        group_ids: groupIds,
      });
      toast('Treino fixo salvo', 'success');
      router.back();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function del() {
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await remove.mutateAsync(id);
      router.back();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Screen footer={<Button title="Salvar treino" onPress={submit} disabled={!valid} loading={save.isPending} />}>
      <TopBar title={id ? 'Editar treino fixo' : 'Novo treino fixo'} />
      <Input label="Nome" value={name} onChangeText={setName} maxLength={40} placeholder="Ex.: Treino A — Peito e tríceps" />

      <View style={{ marginTop: space.xl }}>
        <ActivityForm draft={draft} onChange={setDraft} exercises={exercises.data ?? []} />
      </View>
      {draft.type === 'rest' && (
        <Text variant="caption" tone="muted" style={{ marginTop: space.md }}>
          Descanso não precisa de treino fixo — registre direto no check-in.
        </Text>
      )}
      {draft.type === 'strength' && (
        <Text variant="caption" tone="muted" style={{ marginTop: space.sm }}>
          As cargas ficam como sugestão: no check-in você ajusta antes de enviar.
        </Text>
      )}

      <SectionTitle title="Dias da semana" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {WEEKDAY_SHORT.map((d, i) => (
          <Chip key={d} label={d} selected={weekdays.includes(i)} onPress={() => setWeekdays((w) => toggle(w, i))} />
        ))}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space.sm }}>
        Nesses dias ele aparece como “Treino de hoje” na tela inicial.
      </Text>

      {!!groups.data?.length && (
        <>
          <SectionTitle title="Publicar nos grupos" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {groups.data.map((g) => (
              <Chip key={g.id} label={g.name} selected={groupIds.includes(g.id)} onPress={() => setGroupIds((ids) => toggle(ids, g.id))} />
            ))}
          </View>
        </>
      )}

      {id && (
        <Button
          title={confirmDelete ? 'Toque de novo para excluir' : 'Excluir treino fixo'}
          variant="danger"
          size="md"
          onPress={del}
          loading={remove.isPending}
          style={{ marginTop: space.xxxl, alignSelf: 'center' }}
        />
      )}
    </Screen>
  );
}
