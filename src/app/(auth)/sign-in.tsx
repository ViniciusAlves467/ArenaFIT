import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api, isDemo } from '@/api';
import { Button, Input, Screen, Text, TopBar } from '@/components/ui';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export default function SignIn() {
  const toast = useToast();
  const [email, setEmail] = useState(isDemo ? 'demo@arenafit.app' : '');
  const [password, setPassword] = useState(isDemo ? 'demo1234' : '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.includes('@') || password.length < 6) {
      toast('Informe e-mail e senha válidos', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.auth.signInWithPassword(email.trim().toLowerCase(), password);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title="Entrar" onPress={submit} loading={loading} />}>
      <TopBar />
      <Text variant="title">Bem-vindo de volta</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        Entre para continuar sua sequência.
      </Text>
      <View style={{ gap: space.lg }}>
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="voce@email.com" />
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" placeholder="••••••••" onSubmitEditing={submit} />
      </View>
      <Button title="Criar uma conta" variant="ghost" size="md" onPress={() => router.replace('/(auth)/sign-up')} style={{ marginTop: space.xl, alignSelf: 'center' }} />
    </Screen>
  );
}
