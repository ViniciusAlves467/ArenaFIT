import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { api } from '@/api';
import { Button, EmptyState } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

/**
 * Retorno do login com Google (`arenafit://auth-callback`, `exp://…/--/auth-callback`
 * ou `/auth-callback` na web):
 * - `?code=` → troca o código PKCE pela sessão;
 * - `?error_description=` → o Google ou o Supabase recusou (ex.: login cancelado ou expirado).
 * No celular o retorno costuma ser tratado direto pelo `openAuthSessionAsync`; esta rota cobre a
 * web e o caso de o sistema abrir o deep link no app.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(params.error_description ?? null);

  useEffect(() => {
    if (params.error_description) return;
    let cancelled = false;
    const run = async () => {
      if (params.code) await api.auth.exchangeCode(params.code);
      router.replace('/');
    };
    run().catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_description]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space.xl }}>
        <EmptyState
          icon="alert"
          title="Não foi possível continuar"
          message={`${error}\n\nVolte e toque em “Continuar com Google” de novo.`}
          action={<Button title="Voltar" onPress={() => router.replace('/')} />}
        />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
