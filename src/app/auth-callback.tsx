import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { api } from '@/api';
import { Button, EmptyState } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

type LinkType = 'signup' | 'email' | 'recovery' | 'email_change';

/**
 * Destino dos deep links de autenticação (`arenafit://auth-callback`, `exp://…/--/auth-callback`
 * ou `/auth-callback` na web):
 * - `?code=` → login com Google ou link de confirmação no fluxo PKCE;
 * - `?token_hash=&type=` → link de e-mail dos templates do ArenaFit;
 * - `?error_description=` → o provedor recusou (ex.: link expirado).
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; token_hash?: string; type?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(params.error_description ?? null);

  useEffect(() => {
    if (params.error_description) return;
    let cancelled = false;
    const run = async () => {
      if (params.token_hash && params.type) await api.auth.verifyTokenHash(params.token_hash, params.type as LinkType);
      else if (params.code) await api.auth.exchangeCode(params.code);
      if (params.type === 'recovery') router.replace('/settings');
      else router.replace('/');
    };
    run().catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [params.code, params.token_hash, params.type, params.error_description]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space.xl }}>
        <EmptyState
          icon="alert"
          title="Não foi possível continuar"
          message={`${error}\n\nSe você recebeu um código de 6 dígitos no e-mail, use-o na tela de confirmação.`}
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
