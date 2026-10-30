import { CARDIO_TYPES } from '@shared/checkin-input.ts';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api, type ActivityType, type Exercise } from '@/api';
import { MUSCLE_LABEL } from '@/api/catalog';
import { ExercisePicker } from '@/components/ExercisePicker';
import { ACTIVITY_LABEL, Button, Card, Chip, Icon, IconButton, Input, Screen, SectionTitle, Text } from '@/components/ui';
import { useDailyEmoji, useExercises, useMyGroups, useSubmitCheckin } from '@/hooks/queries';
import { setLastCheckinResult } from '@/lib/checkin-result';
import { useToast } from '@/providers/ToastProvider';
import { formatPace } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

const TYPES: ActivityType[] = ['strength', 'run', 'walk', 'cycle', 'swim', 'rest'];

interface SetDraft {
  load: string;
  reps: string;
}
interface ExerciseDraft {
  key: string;
  exercise: Exercise;
  sets: SetDraft[];
}

const num = (v: string) => Number(v.replace(',', '.'));
const uid = () => Math.random().toString(36).slice(2, 9);

export default function NewCheckin() {
  const toast = useToast();
  const emoji = useDailyEmoji();
  const groups = useMyGroups();
  const exercisesQ = useExercises();
  const submit = useSubmitCheckin();

  const [type, setType] = useState<ActivityType>('strength');
  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (groups.data && groupIds === null) setGroupIds(groups.data.map((g) => g.id));
  }, [groups.data, groupIds]);

  const selectedGroups = useMemo(() => (groups.data ?? []).filter((g) => groupIds?.includes(g.id)), [groups.data, groupIds]);
  const needsPhoto = selectedGroups.filter((g) => g.require_photo);
  const needsLocation = selectedGroups.filter((g) => g.require_location);
  const isCardio = CARDIO_TYPES.includes(type);
  const pace = type === 'run' ? formatPace(num(duration), num(distance)) : null;

  const validSets = exercises.every((e) => e.sets.every((s) => num(s.load) >= 0 && s.load !== '' && Number.isInteger(num(s.reps)) && num(s.reps) >= 1));
  const canSubmit =
    (type !== 'strength' || (exercises.length > 0 && validSets)) &&
    (!isCardio || (num(duration) >= 1 && num(distance) > 0)) &&
    (needsPhoto.length === 0 || !!photo);

  async function takePhoto() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast('Permita o acesso à câmera para registrar a foto', 'error');
        return;
      }
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  }

  async function getLocation() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) throw new Error('Permita a localização: um dos grupos exige GPS');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? undefined };
  }

  async function send() {
    setBusy(true);
    try {
      const location = needsLocation.length ? await getLocation() : undefined;
      const photoPath = photo ? await api.uploadCheckinPhoto(photo) : undefined;
      const result = await submit.mutateAsync({
        type,
        title: title.trim() || undefined,
        exercises:
          type === 'strength'
            ? exercises.map((e) => ({ exerciseId: e.exercise.id, sets: e.sets.map((s) => ({ loadKg: num(s.load), reps: num(s.reps) })) }))
            : undefined,
        durationMin: isCardio ? num(duration) : undefined,
        distanceKm: isCardio ? num(distance) : undefined,
        photoPath,
        emoji: photoPath ? emoji.data : undefined,
        location,
        groupIds: groupIds ?? [],
      });
      setLastCheckinResult(result);
      router.replace('/checkin/result');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const updateSet = (key: string, i: number, patch: Partial<SetDraft>) =>
    setExercises((list) => list.map((e) => (e.key === key ? { ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : e)));

  return (
    <Screen footer={<Button title="Concluir check-in" icon="check" onPress={send} disabled={!canSubmit} loading={busy} />}>
      <View style={styles.top}>
        <IconButton icon="x" label="Cancelar" onPress={() => router.back()} />
        <Text variant="heading">Novo check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg, flexGrow: 0 }}>
        {TYPES.map((t) => (
          <Chip key={t} label={ACTIVITY_LABEL[t]} icon={t} selected={type === t} onPress={() => setType(t)} />
        ))}
        <View style={{ width: space.lg }} />
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Tirar foto" onPress={takePhoto} style={[styles.photo, !photo && needsPhoto.length > 0 && { borderColor: colors.primaryBorder }]}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.retake}>
              <Icon name="camera" size={14} color={colors.text} />
              <Text variant="caption">Refazer</Text>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <View style={styles.camIcon}>
              <Icon name="camera" size={24} color={colors.primary} />
            </View>
            <Text variant="bodyStrong">Foto de validação</Text>
            <Text variant="caption" tone="secondary" align="center" style={{ maxWidth: 260 }}>
              Faça o {emoji.data ?? '…'} na foto. {needsPhoto.length ? 'Obrigatória para os grupos selecionados.' : 'Opcional sem grupos que exijam.'}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={{ marginTop: space.lg }}>
        <Input label="Título (opcional)" value={title} onChangeText={setTitle} maxLength={60} placeholder={type === 'rest' ? 'Ex.: Alongamento' : 'Ex.: Peito e tríceps'} />
      </View>

      {type === 'strength' && (
        <>
          <SectionTitle title="Exercícios" />
          <View style={{ gap: space.md }}>
            {exercises.map((e) => (
              <Card key={e.key} style={{ gap: space.md }}>
                <View style={styles.exHeader}>
                  <Icon name="dumbbell" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.exercise.name}</Text>
                    <Text variant="caption" tone="muted">
                      {MUSCLE_LABEL[e.exercise.muscle_group]}
                    </Text>
                  </View>
                  <IconButton icon="trash" label="Remover exercício" size={34} onPress={() => setExercises((l) => l.filter((x) => x.key !== e.key))} />
                </View>
                <View style={styles.setHead}>
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
                      <Input value={s.load} onChangeText={(v) => updateSet(e.key, i, { load: v })} keyboardType="decimal-pad" placeholder="0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input value={s.reps} onChangeText={(v) => updateSet(e.key, i, { reps: v.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="10" />
                    </View>
                    <IconButton
                      icon="minus"
                      label="Remover série"
                      size={34}
                      onPress={() => setExercises((l) => l.map((x) => (x.key === e.key ? { ...x, sets: x.sets.filter((_, j) => j !== i) } : x)).filter((x) => x.sets.length > 0))}
                    />
                  </View>
                ))}
                <Button
                  title="Adicionar série"
                  icon="plus"
                  variant="ghost"
                  size="md"
                  onPress={() => setExercises((l) => l.map((x) => (x.key === e.key ? { ...x, sets: [...x.sets, { ...(x.sets.at(-1) ?? { load: '', reps: '' }) }] } : x)))}
                />
              </Card>
            ))}
            <Button title="Adicionar exercício" icon="plus" variant="secondary" onPress={() => setPicker(true)} />
            <Text variant="caption" tone="muted">
              Conta o melhor 1RM estimado de cada exercício — mais séries não somam pontos.
            </Text>
          </View>
        </>
      )}

      {isCardio && (
        <>
          <SectionTitle title="Dados do treino" />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Duração" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" suffix="min" placeholder="30" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Distância" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" suffix="km" placeholder="5" />
            </View>
          </View>
          {pace && (
            <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
              Pace médio: <Text variant="caption">{pace}</Text>
            </Text>
          )}
        </>
      )}

      {type === 'rest' && (
        <Card style={{ marginTop: space.lg, flexDirection: 'row', gap: space.md }}>
          <Icon name="info" size={18} color={colors.primary} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            Descanso mantém sua sequência e rende XP, mas não gera pontos de ranking nem bônus de desempenho.
          </Text>
        </Card>
      )}

      {!!groups.data?.length && (
        <>
          <SectionTitle title="Publicar nos grupos" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {groups.data.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                selected={groupIds?.includes(g.id)}
                onPress={() => setGroupIds((ids) => (ids?.includes(g.id) ? ids.filter((x) => x !== g.id) : [...(ids ?? []), g.id]))}
              />
            ))}
          </View>
          {needsLocation.length > 0 && (
            <View style={styles.locRow}>
              <Icon name="map-pin" size={16} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                Sua localização será registrada no envio (exigida por {needsLocation.map((g) => g.name).join(', ')}). O grupo vê apenas “local verificado”.
              </Text>
            </View>
          )}
        </>
      )}

      <ExercisePicker
        visible={picker}
        exercises={exercisesQ.data ?? []}
        onClose={() => setPicker(false)}
        onPick={(exercise) => {
          setExercises((l) => [...l, { key: uid(), exercise, sets: [{ load: '', reps: '' }] }]);
          setPicker(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  photo: {
    height: 220,
    marginTop: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  camIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  retake: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,10,10,0.8)',
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  locRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'flex-start' },
});
