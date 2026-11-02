import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api, AuthFlowError, isDemo } from '@/api';
import { DEMO_CODE } from '@/api/demo-api';
import { CodeInput } from '@/components/CodeInput';
import { Badge, Button, EmptyState, Screen, Text, TopBar } from '@/components/ui';
import { useCooldown } from '@/hooks/useCooldown';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

/**
 * Verificação de e-mail: o usuário digita o código de 6 dígitos ou toca no link do e-mail
 * (o link abre /auth-callback). Ao confirmar, a sessão começa e o app segue para o onboarding.
 */
export default function VerifyEmail() {
  const { email = '', resent } = useLocalSearchParams<{ email: string; resent?: string }>();
  const toast = useToast();
  const cooldown = useCooldown(60, true);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function submit(value = code) {
    if (value.length !== 6) return;
    setLoading(true);
    setInvalid(false);
    try {
      await api.auth.verifyEmail(email, value);
      toast('E-mail confirmado!', 'success');
    } catch (e) {
      setInvalid(e instanceof AuthFlowError && e.code === 'otp_invalid');
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.auth.resendVerification(email);
      cooldown.restart();
      toast('Enviamos um novo código', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Confirmar" onPress={() => submit()} loading={loading} disabled={code.length !== 6} />}>
      <TopBar onBack={() => router.replace('/(auth)/sign-in')} />
      <EmptyState
        icon="mail"
        title="Confirme seu e-mail"
        message={`${resent ? 'Reenviamos' : 'Enviamos'} um código de 6 dígitos para ${email}. Digite abaixo ou toque no link do e-mail neste celular.`}
      />
      <CodeInput
        value={code}
        error={invalid}
        onChange={(v) => {
          setCode(v);
          setInvalid(false);
        }}
        onComplete={submit}
      />
      {isDemo && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.lg }}>
          <Badge label={`Modo demo · use ${DEMO_CODE}`} tone="primary" />
        </View>
      )}
      <View style={{ alignItems: 'center', marginTop: space.xxl, gap: space.sm }}>
        <Button
          title={cooldown.ready ? 'Reenviar código' : `Reenviar em ${cooldown.left}s`}
          variant="ghost"
          size="md"
          icon="mail"
          disabled={!cooldown.ready}
          onPress={resend}
        />
        <Text variant="caption" tone="muted" align="center">
          Não chegou? Confira o spam ou a aba Promoções.
        </Text>
        <Button title="Usar outro e-mail" variant="ghost" size="md" onPress={() => router.replace('/(auth)/sign-up')} />
      </View>
    </Screen>
  );
}
