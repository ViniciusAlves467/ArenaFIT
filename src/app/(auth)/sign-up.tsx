import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, AuthFlowError } from '@/api';
import { Button, Icon, Input, Screen, Text, TopBar } from '@/components/ui';
import { passwordIssue } from '@/lib/password';
import { useToast } from '@/providers/ToastProvider';
import { colors, radius, space } from '@/theme/tokens';

export default function SignUp() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const errors = {
    name: name.trim().length > 0 && name.trim().length < 2 ? 'Informe seu nome' : null,
    email: email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? 'E-mail inválido' : null,
    password: password.length > 0 ? passwordIssue(password) : null,
  };
  const valid = name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(email) && !passwordIssue(password) && accepted;

  async function submit() {
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      const { needsConfirmation } = await api.auth.signUp(normalized, password, name.trim());
      if (needsConfirmation) router.replace({ pathname: '/(auth)/verify', params: { email: normalized } });
    } catch (e) {
      if (e instanceof AuthFlowError && e.code === 'user_exists') {
        toast(e.message, 'info');
        router.replace('/(auth)/sign-in');
        return;
      }
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
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
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.password} hint="Pelo menos 8 caracteres, com letras e números." />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((a) => !a)} style={styles.terms}>
          <View style={[styles.box, accepted && styles.boxOn]}>{accepted && <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} />}</View>
          <Text variant="caption" style={{ flex: 1 }}>
            Li e aceito os{' '}
            <Text variant="caption" tone="primary" onPress={() => router.push('/legal/terms')}>
              Termos de Uso
            </Text>{' '}
            e a{' '}
            <Text variant="caption" tone="primary" onPress={() => router.push('/legal/privacy')}>
              Política de Privacidade
            </Text>
            .
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderRadius: radius.sm - 2, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
