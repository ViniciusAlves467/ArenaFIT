import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDemo } from '@/api';
import { GoogleButton } from '@/components/GoogleButton';
import { Wordmark } from '@/components/Logo';
import { Badge, Button, Text } from '@/components/ui';
import { colors, space, type } from '@/theme/tokens';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
      <LinearGradient
        colors={['rgba(255,106,19,0.28)', 'rgba(255,106,19,0.04)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <Wordmark size={26} />
        {isDemo && <Badge label="Modo demo" tone="primary" />}
      </View>

      <View style={styles.hero}>
        <Text style={[type.hero, { fontSize: 56, lineHeight: 56 }]}>TREINE.</Text>
        <Text style={[type.hero, { fontSize: 56, lineHeight: 56 }]}>REGISTRE.</Text>
        <Text style={[type.hero, { fontSize: 56, lineHeight: 56, color: colors.primary }]}>SUBA.</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.lg, maxWidth: 320 }}>
          Check-ins com foto, ranking com amigos e uma pontuação que valoriza a sua constância — não só quem levanta mais peso.
        </Text>
      </View>

      <View style={{ gap: space.md }}>
        <GoogleButton />
        <Button title="Criar conta com e-mail" onPress={() => router.push('/(auth)/sign-up')} />
        <Button title="Já tenho conta" variant="ghost" onPress={() => router.push('/(auth)/sign-in')} />
        <Text variant="caption" tone="muted" align="center" style={{ marginTop: space.xs }}>
          Ao continuar, você concorda com os{' '}
          <Text variant="caption" tone="secondary" style={styles.link} onPress={() => router.push('/legal/terms')}>
            Termos de Uso
          </Text>{' '}
          e a{' '}
          <Text variant="caption" tone="secondary" style={styles.link} onPress={() => router.push('/legal/privacy')}>
            Política de Privacidade
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { gap: 0 },
  link: { textDecorationLine: 'underline' },
});
