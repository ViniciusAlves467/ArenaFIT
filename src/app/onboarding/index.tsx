import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Sex } from '@/api';
import { StepHeader } from '@/components/StepHeader';
import { Button, Card, Chip, Icon, Input, Screen, Text } from '@/components/ui';
import { useMe, useUpdateProfile } from '@/hooks/queries';
import { useToast } from '@/providers/ToastProvider';
import { colors, radius, space } from '@/theme/tokens';

function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/');
}

function parseDate(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(dd)) return null;
  const age = (Date.now() - date.getTime()) / (365.25 * 86_400_000);
  if (age < 13 || age > 100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);

export default function OnboardingProfile() {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [birth, setBirth] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [consent, setConsent] = useState(false);

  // Pré-preenche uma única vez; refetches do perfil não podem sobrescrever o que foi digitado.
  const initialized = useRef(false);
  useEffect(() => {
    if (!me || initialized.current) return;
    initialized.current = true;
    const first = me.profile.display_name ?? me.private.full_name?.split(' ')[0] ?? '';
    setDisplayName(first);
    setUsername(me.profile.username || slug(first));
    if (me.private.sex) setSex(me.private.sex);
    if (me.private.height_cm) setHeight(String(me.private.height_cm));
    if (me.private.weight_kg) setWeight(String(me.private.weight_kg));
  }, [me]);

  const h = Number(height.replace(',', '.'));
  const w = Number(weight.replace(',', '.'));
  const birthIso = parseDate(birth);
  const valid =
    displayName.trim().length >= 1 &&
    /^[a-z0-9_.]{3,20}$/.test(username) &&
    !!birthIso &&
    !!sex &&
    h >= 100 && h <= 250 &&
    w >= 25 && w <= 350 &&
    consent;

  async function next() {
    try {
      await update.mutateAsync({
        priv: { birth_date: birthIso, sex, height_cm: h, weight_kg: w, terms_accepted_at: new Date().toISOString() },
        profile: { display_name: displayName.trim(), username },
      });
      router.push('/onboarding/avatar');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Continuar" iconRight="chevron-right" onPress={next} disabled={!valid} loading={update.isPending} />}>
      <StepHeader step={1} total={2} title="Sobre você" subtitle="Usamos estes dados para comparar seu treino com pessoas de perfil parecido." />

      <View style={{ gap: space.lg }}>
        <Input label="Como quer ser chamado" value={displayName} onChangeText={setDisplayName} maxLength={40} />
        <Input
          label="Nome de usuário"
          value={username}
          onChangeText={(v) => setUsername(slug(v))}
          autoCapitalize="none"
          hint="Letras minúsculas, números, ponto e _ (3 a 20)."
        />
        <Input label="Data de nascimento" value={birth} onChangeText={(v) => setBirth(maskDate(v))} keyboardType="number-pad" placeholder="DD/MM/AAAA" error={birth.length === 10 && !birthIso ? 'Data inválida' : null} />

        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="secondary" style={{ marginLeft: 2 }}>
            Sexo biológico
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="Feminino" selected={sex === 'female'} onPress={() => setSex('female')} />
            <Chip label="Masculino" selected={sex === 'male'} onPress={() => setSex('male')} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Altura" value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" placeholder="170" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Peso" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" placeholder="70" />
          </View>
        </View>

        <Card style={{ backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Icon name="shield-check" size={20} color={colors.primary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              Peso, altura, idade e sexo <Text variant="caption">não geram pontos</Text> e nunca aparecem para outras pessoas. Servem apenas para formar a população estatística de comparação. Você pode exportar ou excluir seus dados a qualquer momento.
            </Text>
          </View>
        </Card>

        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent((c) => !c)} style={styles.consent}>
          <View style={[styles.box, consent && styles.boxOn]}>{consent && <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} />}</View>
          <Text variant="caption" style={{ flex: 1 }}>
            Li e concordo com a Política de Privacidade e autorizo o tratamento destes dados para o cálculo da pontuação (LGPD, art. 7º, I).
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: radius.sm - 2 },
});
