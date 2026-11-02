import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components/ui';
import { useMe } from '@/hooks/queries';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, border: colors.border, text: colors.text },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <ToastProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const me = useMe();
  const signedIn = !!session;
  const ready = !loading && (!signedIn || !me.isPending);
  const onboarded = !!me.data?.profile.onboarded_at;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (signedIn && me.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }}>
        <EmptyState
          icon="alert"
          title="Não foi possível carregar seu perfil"
          message={me.error.message}
          action={<Button title="Tentar novamente" onPress={() => me.refetch()} />}
        />
      </View>
    );
  }

  return (
    <>
      {signedIn && onboarded && Platform.OS !== 'web' && <NotificationRouter />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="group/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="group/join" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkin/new" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkin/result" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="routines/index" />
          <Stack.Screen name="routines/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="group/manage" />
          <Stack.Screen name="shop" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="scoring" />
        </Stack.Protected>

        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="legal/privacy" />
      </Stack>
    </>
  );
}

/** Tocar no lembrete de treino abre direto o check-in. */
function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) router.push(url as never);
  }, [response]);
  return null;
}
