import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { api, isDemo, type Me, type Sex } from '@/api';
import { ReminderCard } from '@/components/ReminderCard';
import { Button, Card, Chip, Divider, Input, ListRow, Screen, SectionTitle, Text, TopBar } from '@/components/ui';
import { useMe, useUpdateProfile } from '@/hooks/queries';
import { passwordIssue } from '@/lib/password';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export default function Settings() {
  const me = useMe();
  if (!me.data) return <Screen><TopBar title="Configurações" /></Screen>;
  return <SettingsForm me={me.data} />;
}

function SettingsForm({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [height, setHeight] = useState(String(me.private.height_cm ?? ''));
  const [weight, setWeight] = useState(String(me.private.weight_kg ?? ''));
  const [sex, setSex] = useState<Sex | null>(me.private.sex);
  const [displayName, setDisplayName] = useState(me.profile.display_name ?? '');
  const [username, setUsername] = useState(me.profile.username ?? '');
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const hasPassword = me.providers.includes('email');
  const pwIssue = password ? passwordIssue(password) : null;

  async function saveProfile() {
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
      toast('Nome de usuário: 3 a 20 letras minúsculas, números, ponto ou _', 'error');
      return;
    }
    try {
      await update.mutateAsync({ profile: { display_name: displayName.trim(), username } });
      toast('Perfil atualizado', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    try {
      await api.auth.updatePassword(password);
      setPassword('');
      toast(hasPassword ? 'Senha alterada' : 'Senha criada: agora você também pode entrar com e-mail', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveBody() {
    const h = Number(height.replace(',', '.'));
    const w = Number(weight.replace(',', '.'));
    if (!(h >= 100 && h <= 250) || !(w >= 25 && w <= 350)) {
      toast('Confira altura e peso', 'error');
      return;
    }
    try {
      await update.mutateAsync({ priv: { height_cm: h, weight_kg: w, ...(sex ? { sex } : {}) } });
      toast('Dados atualizados', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function exportData() {
    try {
      const data = await api.exportMyData();
      await Share.share({ title: 'Meus dados — ArenaFit', message: JSON.stringify(data, null, 2) });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function deleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      toast('Toque novamente para confirmar a exclusão definitiva', 'info');
      return;
    }
    setBusy(true);
    try {
      await api.deleteAccount();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Configurações" />

      <SectionTitle title="Perfil" />
      <Card style={{ gap: space.md }}>
        <Input label="Nome de exibição" value={displayName} onChangeText={setDisplayName} maxLength={40} />
        <Input
          label="Nome de usuário"
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))}
          autoCapitalize="none"
          hint="Aparece como @usuário nos rankings."
        />
        <Button title="Salvar perfil" size="md" variant="secondary" onPress={saveProfile} loading={update.isPending} disabled={!displayName.trim()} />
      </Card>

      <SectionTitle title="Dados corporais" />
      <Card style={{ gap: space.md }}>
        <Text variant="caption" tone="secondary">
          Atualize quando mudar: eles definem com quem seu desempenho é comparado. Ninguém mais os vê.
        </Text>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Altura" value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Peso" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip label="Feminino" selected={sex === 'female'} onPress={() => setSex('female')} />
          <Chip label="Masculino" selected={sex === 'male'} onPress={() => setSex('male')} />
          <Chip label="Prefiro não informar" selected={sex === 'unspecified'} onPress={() => setSex('unspecified')} />
        </View>
        <Button title="Salvar" size="md" variant="secondary" onPress={saveBody} loading={update.isPending} />
      </Card>

      <SectionTitle title="Lembretes" />
      <ReminderCard />

      <SectionTitle title="Pontuação" />
      <Card padded={false}>
        <ListRow icon="info" title="Como funciona a pontuação" subtitle="Base, bônus, comparação e histórico" onPress={() => router.push('/scoring')} />
      </Card>

      <SectionTitle title="Privacidade (LGPD)" />
      <Card padded={false}>
        <ListRow icon="shield-check" title="Política de Privacidade" onPress={() => router.push('/legal/privacy')} />
        <Divider />
        <ListRow icon="info" title="Termos de Uso" onPress={() => router.push('/legal/terms')} />
        <Divider />
        <ListRow icon="download" title="Exportar meus dados" subtitle="Cópia completa em JSON (portabilidade)" onPress={exportData} />
        <Divider />
        <ListRow
          icon="trash"
          title={confirmDelete ? 'Confirmar exclusão definitiva' : 'Excluir minha conta'}
          subtitle="Remove perfil, check-ins, fotos e votos"
          danger
          onPress={busy ? undefined : deleteAccount}
        />
      </Card>

      <SectionTitle title="Conta" />
      <Card padded={false}>
        <ListRow
          icon="mail"
          title={me.email ?? '—'}
          subtitle={isDemo ? 'Modo demo · dados locais' : me.providers.includes('google') ? 'Conta Google' : 'E-mail e senha'}
        />
        <Divider />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Input
            label={hasPassword ? 'Nova senha' : 'Criar senha (para entrar também por e-mail)'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={pwIssue}
          />
          <Button
            title={hasPassword ? 'Alterar senha' : 'Criar senha'}
            size="md"
            variant="secondary"
            onPress={savePassword}
            loading={savingPassword}
            disabled={!password || !!pwIssue}
          />
        </View>
        <Divider />
        <ListRow icon="logout" title="Sair" onPress={() => api.auth.signOut()} />
      </Card>

      <Text variant="caption" tone="muted" align="center" style={{ marginTop: space.xxl }}>
        ArenaFit 0.1.0 · Projeto de TCC
      </Text>
    </Screen>
  );
}
