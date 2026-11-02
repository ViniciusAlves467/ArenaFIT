import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api } from '@/api';
import { Button, EmptyState, Input, Screen, TopBar } from '@/components/ui';
import { useToast } from '@/providers/ToastProvider';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const toast = useToast();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  async function submit() {
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      await api.auth.requestPasswordReset(normalized);
      router.replace({ pathname: '/(auth)/reset', params: { email: normalized } });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title="Enviar código" onPress={submit} loading={loading} disabled={!valid} />}>
      <TopBar />
      <EmptyState icon="lock-keyhole" title="Esqueceu a senha?" message="Informe o e-mail da sua conta. Enviaremos um código para você criar uma nova senha." />
      <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus onSubmitEditing={valid ? submit : undefined} />
    </Screen>
  );
}
