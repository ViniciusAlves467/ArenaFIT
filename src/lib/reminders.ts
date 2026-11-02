import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Lembrete de treino com notificações LOCAIS (funcionam no Expo Go e sem servidor).
 * Em vez de um alarme diário fixo, agenda um aviso por dia para os próximos 7 dias e pula
 * o dia em que o usuário já fez check-in — assim só lembra quem ainda não treinou.
 * A agenda é refeita ao abrir o app e após cada check-in.
 */

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const KEY = 'arenafit.reminder';
const CHANNEL = 'reminders';
const TAG = 'arenafit-reminder';
const DAYS_AHEAD = 7;

export const remindersSupported = Platform.OS !== 'web';

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 18, minute: 0 };

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_REMINDER, ...JSON.parse(raw) } : DEFAULT_REMINDER;
  } catch {
    return DEFAULT_REMINDER;
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Lembretes de treino',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const MESSAGES = [
  { title: 'Bora treinar?', body: 'Seu check-in de hoje ainda está esperando. Descanso também conta.' },
  { title: 'Não quebre a sequência', body: 'Um check-in rápido mantém seus dias seguidos.' },
  { title: 'O ranking não para', body: 'Seus amigos já estão pontuando hoje. E você?' },
];

/** Recria a agenda. `doneToday` pula o aviso de hoje; `streak` personaliza o texto. */
export async function syncReminders(opts: { doneToday: boolean; streak?: number }): Promise<void> {
  if (!remindersSupported) return;
  const settings = await getReminderSettings();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.content.data?.tag === TAG).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!settings.enabled) return;

  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now);
    at.setDate(now.getDate() + i);
    at.setHours(settings.hour, settings.minute, 0, 0);
    if (at <= now || (i === 0 && opts.doneToday)) continue;
    const msg = MESSAGES[(at.getDate() + i) % MESSAGES.length];
    const body = opts.streak && opts.streak > 1 && i <= 1 ? `Você está há ${opts.streak} dias seguidos. ${msg.body}` : msg.body;
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body, data: { tag: TAG, url: '/checkin/new' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

/** Salva a preferência; ao ligar, pede permissão. Retorna false se o usuário negar. */
export async function saveReminderSettings(next: ReminderSettings, ctx: { doneToday: boolean; streak?: number }): Promise<boolean> {
  if (next.enabled && !(await ensurePermission())) return false;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  await syncReminders(ctx);
  return true;
}
