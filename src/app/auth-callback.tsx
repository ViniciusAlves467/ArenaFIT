import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { api } from '@/api';
import { colors } from '@/theme/tokens';

/** Destino do deep link `arenafit://auth-callback?code=...` (Google e confirmação de e-mail). */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    (code ? api.auth.exchangeCode(code) : Promise.resolve()).catch(() => {}).finally(() => setDone(true));
  }, [code]);

  if (done) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
