import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api, type GroupSummary, type WorkoutTemplate } from '@/api';
import { ActivityForm, type ActivityDraft, draftExercises, draftFromTemplate, draftIsValid, emptyDraft, isCardio, num } from '@/components/ActivityForm';
import { Button, Card, Chip, Icon, IconButton, Input, Screen, SectionTitle, Text, Toggle } from '@/components/ui';
import { useDailyEmoji, useExercises, useMyGroups, useSaveTemplate, useSubmitCheckin, useTemplates } from '@/hooks/queries';
import { setLastCheckinResult } from '@/lib/checkin-result';
import { compressPhoto } from '@/lib/photo';
import { useToast } from '@/providers/ToastProvider';
import { colors, radius, space } from '@/theme/tokens';

export default function NewCheckin() {
  const { template: templateParam } = useLocalSearchParams<{ template?: string }>();
  const groups = useMyGroups();
  const templates = useTemplates();
  if (!groups.data || !templates.data) return <Screen>{null}</Screen>;
  // Aberto a partir de "Treino de hoje" ou da lista de treinos fixos: já vem preenchido.
  const initial = templates.data.find((t) => t.id === templateParam);
  return <CheckinForm groups={groups.data} templates={templates.data} initialTemplate={initial} />;
}

/** Grupos preferidos do treino fixo (só os que o usuário ainda participa); senão, todos. */
function groupsFor(t: WorkoutTemplate | undefined, groups: GroupSummary[]) {
  const mine = groups.map((g) => g.id);
  const preferred = t?.group_ids.filter((id) => mine.includes(id)) ?? [];
  return preferred.length ? preferred : mine;
}

function CheckinForm({ groups, templates, initialTemplate }: { groups: GroupSummary[]; templates: WorkoutTemplate[]; initialTemplate?: WorkoutTemplate }) {
  const toast = useToast();
  const emoji = useDailyEmoji();
  const exercisesQ = useExercises();
  const submit = useSubmitCheckin();
  const saveTemplate = useSaveTemplate();

  const [draft, setDraft] = useState<ActivityDraft>(() => (initialTemplate ? draftFromTemplate(initialTemplate) : emptyDraft()));
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [title, setTitle] = useState(initialTemplate?.name ?? '');
  const [groupIds, setGroupIds] = useState<string[]>(() => groupsFor(initialTemplate, groups));
  const [templateId, setTemplateId] = useState<string | null>(initialTemplate?.id ?? null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [busy, setBusy] = useState(false);

  function applyTemplate(t: WorkoutTemplate) {
    setDraft(draftFromTemplate(t));
    setTitle(t.name);
    setTemplateId(t.id);
    setSaveAsTemplate(false);
    setGroupIds(groupsFor(t, groups));
  }

  const selectedGroups = useMemo(() => groups.filter((g) => groupIds.includes(g.id)), [groups, groupIds]);
  const needsPhoto = selectedGroups.filter((g) => g.require_photo);
  const needsLocation = selectedGroups.filter((g) => g.require_location);
  const canSubmit = draftIsValid(draft) && (needsPhoto.length === 0 || !!photo);

  async function takePhoto() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast('Permita o acesso à câmera para registrar a foto', 'error');
        return;
      }
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
    if (!res.canceled && res.assets[0]) setPhoto({ uri: res.assets[0].uri, width: res.assets[0].width, height: res.assets[0].height });
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
      const cardio = isCardio(draft);
      const location = needsLocation.length ? await getLocation() : undefined;
      const photoPath = photo ? await api.uploadCheckinPhoto(await compressPhoto(photo.uri, photo.width, photo.height)) : undefined;
      const result = await submit.mutateAsync({
        type: draft.type,
        variant: draft.variant ?? undefined,
        title: title.trim() || undefined,
        exercises: draft.type === 'strength' ? draftExercises(draft) : undefined,
        durationMin: cardio ? num(draft.duration) : undefined,
        distanceKm: cardio ? num(draft.distance) : undefined,
        elevationM: draft.type === 'cycle' && draft.variant === 'road' && draft.elevation ? num(draft.elevation) : undefined,
        photoPath,
        emoji: photoPath ? emoji.data : undefined,
        location,
        groupIds,
      });
      if (saveAsTemplate) {
        await saveTemplate
          .mutateAsync({
            name: title.trim() || 'Meu treino',
            type: draft.type,
            variant: draft.variant,
            exercises: draftExercises(draft),
            duration_min: cardio ? num(draft.duration) : null,
            distance_km: cardio ? num(draft.distance) : null,
            weekdays: [],
            group_ids: groupIds,
          })
          .catch((e) => toast((e as Error).message, 'error'));
      }
      setLastCheckinResult(result);
      router.replace('/checkin/result');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button title="Concluir check-in" icon="check" onPress={send} disabled={!canSubmit} loading={busy} />}>
      <View style={styles.top}>
        <IconButton icon="x" label="Cancelar" onPress={() => router.back()} />
        <Text variant="heading">Novo check-in</Text>
        <IconButton icon="dumbbell" label="Meus treinos fixos" onPress={() => router.push('/routines')} />
      </View>

      {templates.length > 0 && (
        <View style={{ marginBottom: space.lg }}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: space.sm }}>
            Treinos fixos
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg, flexGrow: 0 }}>
            {templates.map((t) => (
              <Chip key={t.id} label={t.name} icon={t.type} selected={templateId === t.id} onPress={() => applyTemplate(t)} />
            ))}
            <View style={{ width: space.lg }} />
          </ScrollView>
        </View>
      )}

      <ActivityForm
        draft={draft}
        onChange={(d) => {
          // Mudou a modalidade de um treino fixo: o título dele deixa de fazer sentido.
          if (templateId && d.type !== draft.type) setTitle('');
          setDraft(d);
          setTemplateId(null);
        }}
        exercises={exercisesQ.data ?? []}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="Tirar foto" onPress={takePhoto} style={[styles.photo, !photo && needsPhoto.length > 0 && { borderColor: colors.primaryBorder }]}>
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
        <Input label="Título (opcional)" value={title} onChangeText={setTitle} maxLength={60} placeholder={draft.type === 'rest' ? 'Ex.: Alongamento' : 'Ex.: Treino A — Peito'} />
      </View>

      {draft.type === 'rest' && (
        <Card style={{ marginTop: space.lg, flexDirection: 'row', gap: space.md }}>
          <Icon name="info" size={18} color={colors.primary} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            Descanso mantém sua sequência e rende XP, mas não gera pontos de ranking nem bônus de desempenho.
          </Text>
        </Card>
      )}

      {groups.length > 0 && (
        <>
          <SectionTitle title="Publicar nos grupos" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {groups.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                selected={groupIds.includes(g.id)}
                onPress={() => setGroupIds((ids) => (ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id]))}
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

      {!templateId && draft.type !== 'rest' && (
        <Card padded={false} style={{ marginTop: space.xl }}>
          <View style={styles.saveRow}>
            <Icon name="star" size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Salvar como treino fixo</Text>
              <Text variant="caption" tone="muted">
                Exercícios, cargas e grupos ficam prontos para a próxima vez.
              </Text>
            </View>
            <Toggle value={saveAsTemplate} onValueChange={setSaveAsTemplate} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  photo: {
    height: 200,
    marginTop: space.xl,
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
  locRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'flex-start' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
