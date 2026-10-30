import type { WorkoutTemplate } from '@/api';
import { EXERCISES } from '@/api/catalog';
import { ACTIVITY_LABEL } from '@/components/ui/Icon';

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function templateSummary(t: WorkoutTemplate) {
  if (t.type === 'strength') {
    const names = t.exercises.map((e) => EXERCISES.find((x) => x.id === e.exerciseId)?.name ?? e.exerciseId);
    const sets = t.exercises.reduce((a, e) => a + e.sets.length, 0);
    return `${names.length} exercícios · ${sets} séries — ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`;
  }
  const parts = [t.distance_km && `${String(t.distance_km).replace('.', ',')} km`, t.duration_min && `${t.duration_min} min`].filter(Boolean);
  return parts.length ? parts.join(' · ') : ACTIVITY_LABEL[t.type];
}

/** Treinos fixos marcados para hoje (0 = domingo). */
export const templatesForToday = (list: WorkoutTemplate[], today = new Date()) => list.filter((t) => t.weekdays.includes(today.getDay()));
