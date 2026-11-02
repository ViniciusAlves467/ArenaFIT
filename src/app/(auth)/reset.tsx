import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api, isDemo } from '@/api';
import { DEMO_CODE } from '@/api/demo-api';
import { CodeInput } from '@/components/CodeInput';
import { Badge, Button, EmptyState, Input, Screen, Text, TopBar } from '@/components/ui';
import { useCooldown } from '@/hooks/useCooldown';
import { passwordIssue } from '@/lib/password';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export default function ResetPassword() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const toast = useToast();
  const cooldown = useCooldown(60, true);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const issue = password ? passwordIssue(password) : null;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = code.length === 6 && !passwordIssue(password) && confirm === password;

  async function submit() {
    setLoading(true);
    try {
      await api.auth.resetPassword(email, code, password);
      toast('Senha alterada. Bem-vindo de volta!', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.auth.requestPasswordReset(email);
      cooldown.restart();
      toast('Enviamos um novo código', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Salvar nova senha" onPress={submit} loading={loading} disabled={!valid} />}>
      <TopBar />
      <EmptyState icon="mail" title="Crie uma nova senha" message={`Digite o código enviado para ${email}.`} />
      <CodeInput value={code} onChange={setCode} />
      {isDemo && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.md }}>
          <Badge label={`Modo demo · use ${DEMO_CODE}`} tone="primary" />
        </View>
      )}
      <View style={{ gap: space.lg, marginTop: space.xl }}>
        <Input label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={issue} />
        <Input label="Repita a nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={mismatch ? 'As senhas não conferem' : null} />
      </View>
      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <Button title={cooldown.ready ? 'Reenviar código' : `Reenviar em ${cooldown.left}s`} variant="ghost" size="md" disabled={!cooldown.ready} onPress={resend} />
        <Text variant="caption" tone="muted">
          O código vale por 1 hora.
        </Text>
      </View>
    </Screen>
  );
}
