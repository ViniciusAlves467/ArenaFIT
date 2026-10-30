import { router } from 'expo-router';
import { useState } from 'react';

import { Button, EmptyState, Input, Screen, Text, TopBar } from '@/components/ui';
import { useJoinGroup } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export default function JoinGroup() {
  const join = useJoinGroup();
  const toast = useToast();
  const [code, setCode] = useState('');

  async function submit() {
    try {
      const g = await join.mutateAsync({ code });
      toast(`Você entrou em ${g.name}`, 'success');
      router.replace(`/group/${g.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Entrar no grupo" onPress={submit} disabled={code.length !== 6} loading={join.isPending} />}>
      <TopBar title="Entrar com código" />
      <EmptyState icon="hash" title="Tem um convite?" message="Digite o código de 6 caracteres que seu amigo compartilhou." />
      <Input
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
        autoCapitalize="characters"
        autoFocus
        placeholder="ABC123"
        style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center', fontFamily: 'BarlowCondensed_700Bold' }}
        onSubmitEditing={submit}
      />
      <Text variant="caption" tone="muted" align="center" style={{ marginTop: space.lg }}>
        Sem código? Explore os grupos públicos na aba Grupos.
      </Text>
    </Screen>
  );
}
