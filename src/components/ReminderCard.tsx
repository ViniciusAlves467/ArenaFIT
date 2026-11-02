import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { useMe, useMyCheckins } from '@/hooks/queries';
import { getReminderSettings, type ReminderSettings, remindersSupported, saveReminderSettings } from '@/lib/reminders';
import { useToast } from '@/providers/ToastProvider';
import { localDay } from '@/theme/format';
import { space } from '@/theme/tokens';

import { Card, Chip, ListRow, Text, Toggle } from './ui';

const TIMES = [
  { hour: 6, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
] as const;

const label = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** Contexto usado para decidir se hoje ainda precisa de lembrete. */
export function useReminderContext() {
  const me = useMe();
  const checkins = useMyCheckins();
  const doneToday = (checkins.data ?? []).some((c) => localDay(new Date(c.performed_at)) === localDay());
  return { doneToday, streak: me.data?.profile.current_streak ?? 0, ready: !!checkins.data && !!me.data };
}

export function ReminderCard() {
  const qc = useQueryClient();
  const toast = useToast();
  const ctx = useReminderContext();
  const settings = useQuery({ queryKey: ['reminder-settings'], queryFn: getReminderSettings, enabled: remindersSupported });

  const save = useMutation({
    mutationFn: (next: ReminderSettings) => saveReminderSettings(next, ctx),
    onSuccess: (ok, next) => {
      if (!ok) {
        toast('Permita as notificações nas configurações do celular', 'error');
        return;
      }
      qc.setQueryData(['reminder-settings'], next);
      if (next.enabled) toast(`Lembrete diário às ${label(next.hour, next.minute)}`, 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (!remindersSupported) {
    return (
      <Card>
        <Text variant="caption" tone="muted">
          Lembretes funcionam no app do celular.
        </Text>
      </Card>
    );
  }
  const s = settings.data;
  if (!s) return null;

  return (
    <Card padded={false}>
      <ListRow
        icon="calendar"
        title="Lembrete de treino"
        subtitle="Só avisa nos dias em que você ainda não fez check-in"
        right={
          <Toggle value={s.enabled} disabled={save.isPending} onValueChange={(enabled) => save.mutate({ ...s, enabled })} />
        }
      />
      {s.enabled && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {TIMES.map((t) => (
            <Chip
              key={label(t.hour, t.minute)}
              label={label(t.hour, t.minute)}
              selected={s.hour === t.hour && s.minute === t.minute}
              onPress={() => save.mutate({ ...s, hour: t.hour, minute: t.minute })}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
