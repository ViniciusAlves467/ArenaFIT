import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Input, ListRow, Screen, Text, Toggle, TopBar } from '@/components/ui';
import { useCreateGroup } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { localDay } from '@/theme/format';
import { space } from '@/theme/tokens';

const DURATIONS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: 'Sem fim', days: null },
] as const;

export default function NewGroup() {
  const create = useCreateGroup();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setPublic] = useState(false);
  const [duration, setDuration] = useState<number | null>(30);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [requireLocation, setRequireLocation] = useState(true);

  async function submit() {
    try {
      const end = duration === null ? null : localDay(new Date(Date.now() + (duration - 1) * 86_400_000));
      const g = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility: isPublic ? 'public' : 'private',
        ends_on: end,
        require_photo: requirePhoto,
        require_location: requireLocation,
      });
      toast('Grupo criado. Compartilhe o código!', 'success');
      router.replace(`/group/${g.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const toggle = (value: boolean, onChange: (v: boolean) => void) => (
    <Toggle value={value} onValueChange={onChange} />
  );

  return (
    <Screen footer={<Button title="Criar grupo" onPress={submit} disabled={name.trim().length < 3} loading={create.isPending} />}>
      <TopBar title="Novo grupo" />
      <View style={{ gap: space.lg }}>
        <Input label="Nome" value={name} onChangeText={setName} maxLength={40} placeholder="Ex.: Turma do TCC" />
        <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={280} multiline placeholder="Regras, objetivo, combinados…" style={{ minHeight: 72, textAlignVertical: 'top' }} />

        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="secondary">
            Duração do desafio
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DURATIONS.map((d) => (
              <Chip key={d.label} label={d.label} selected={duration === d.days} onPress={() => setDuration(d.days)} />
            ))}
          </View>
        </View>

        <Card padded={false}>
          <ListRow icon="globe" title="Grupo público" subtitle="Aparece em Explorar para qualquer pessoa" right={toggle(isPublic, setPublic)} />
          <ListRow icon="camera" title="Exigir foto com emoji do dia" subtitle="Comprova que o treino foi feito hoje" right={toggle(requirePhoto, setRequirePhoto)} />
          <ListRow icon="map-pin" title="Exigir localização" subtitle="O grupo vê só “local verificado”, nunca o endereço" right={toggle(requireLocation, setRequireLocation)} />
        </Card>
      </View>
    </Screen>
  );
}
