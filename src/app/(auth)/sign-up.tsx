import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api';
import { Button, EmptyState, Input, Screen, Text, TopBar } from '@/components/ui';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export default function SignUp() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const errors = {
    name: name.trim().length > 0 && name.trim().length < 2 ? 'Informe seu nome' : null,
    email: email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? 'E-mail inválido' : null,
    password: password.length > 0 && password.length < 8 ? 'Mínimo de 8 caracteres' : null,
  };
  const valid = name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;

  async function submit() {
    setLoading(true);
    try {
      const { needsConfirmation } = await api.auth.signUp(email.trim().toLowerCase(), password, name.trim());
      if (needsConfirmation) setSentTo(email.trim());
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <Screen>
        <TopBar />
        <EmptyState
          icon="mail"
          title="Confirme seu e-mail"
          message={`Enviamos um link para ${sentTo}. Abra-o neste celular para ativar sua conta.`}
          action={<Button title="Ir para o login" variant="secondary" onPress={() => router.replace('/(auth)/sign-in')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Criar conta" onPress={submit} loading={loading} disabled={!valid} />}>
      <TopBar />
      <Text variant="title">Crie sua conta</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        Leva menos de um minuto.
      </Text>
      <View style={{ gap: space.lg }}>
        <Input label="Nome completo" value={name} onChangeText={setName} autoComplete="name" textContentType="name" error={errors.name} />
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.email} />
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.password} hint="Use pelo menos 8 caracteres." />
      </View>
    </Screen>
  );
}
