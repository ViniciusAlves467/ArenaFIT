import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, AuthFlowError, isDemo } from '@/api';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Input, Screen, Text, TopBar } from '@/components/ui';
import { useToast } from '@/providers/ToastProvider';
import { colors, space } from '@/theme/tokens';

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
    const normalized = email.trim().toLowerCase();
    try {
      await api.auth.signInWithPassword(normalized, password);
    } catch (e) {
      if (e instanceof AuthFlowError && e.code === 'email_not_confirmed') {
        // Conta criada mas não confirmada: reenvia o código e leva à verificação.
        await api.auth.resendVerification(normalized).catch(() => {});
        router.push({ pathname: '/(auth)/verify', params: { email: normalized, resent: '1' } });
        return;
      }
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
      <Button
        title="Esqueci minha senha"
        variant="ghost"
        size="md"
        onPress={() => router.push({ pathname: '/(auth)/forgot', params: { email: email.trim().toLowerCase() } })}
        style={{ marginTop: space.md, alignSelf: 'flex-end' }}
      />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text variant="caption" tone="muted">
          ou
        </Text>
        <View style={styles.line} />
      </View>
      <GoogleButton />
      <Button title="Criar uma conta" variant="ghost" size="md" onPress={() => router.replace('/(auth)/sign-up')} style={{ marginTop: space.lg, alignSelf: 'center' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
