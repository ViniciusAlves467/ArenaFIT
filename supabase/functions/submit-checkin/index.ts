// Edge Function: recebe o check-in, calcula a pontuação no servidor e grava de forma atômica.
// O cliente nunca envia pontos/XP — tudo é derivado aqui a partir dos dados brutos do treino.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { checkGroupRequirements, validateCheckinPayload } from '../_shared/checkin-input.ts';
import { corsHeaders, json } from '../_shared/http.ts';
import {
  type BodyProfile,
  DEFAULT_PARAMS,
  type ExerciseLog,
  extractMetrics,
  type MetricContext,
  scoreCheckin,
} from '../_shared/scoring/index.ts';

const POPULATION_WINDOW_DAYS = 180;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Não autenticado' }, 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Sessão inválida' }, 401);
  const userId = auth.user.id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const now = new Date();
  const parsed = validateCheckinPayload(raw, { userId, now });
  if (!parsed.ok) return json({ error: parsed.errors[0], errors: parsed.errors }, 422);
  const payload = parsed.value;

  const [{ data: profile }, { data: priv }] = await Promise.all([
    admin.from('profiles').select('timezone, first_activity_at').eq('id', userId).single(),
    admin.from('profile_private').select('sex, height_cm, weight_kg, birth_date').eq('id', userId).single(),
  ]);
  if (!profile) return json({ error: 'Perfil não encontrado' }, 404);

  // Grupos: precisa ser membro e cumprir as exigências de validação de cada um.
  if (payload.groupIds?.length) {
    const { data: groups } = await admin
      .from('groups')
      .select('id, name, require_photo, require_location, group_members!inner(user_id)')
      .in('id', payload.groupIds)
      .eq('group_members.user_id', userId);
    if (!groups || groups.length !== payload.groupIds.length) return json({ error: 'Você não participa de um dos grupos' }, 403);
    const { data: daily } = await admin.rpc('get_daily_emoji', { p_timezone: profile.timezone });
    const errors = checkGroupRequirements(payload, groups, daily?.[0]?.emoji ?? '');
    if (errors.length) return json({ error: errors[0], errors }, 422);
  }

  // Exercícios → grupo muscular primário.
  let exercises: ExerciseLog[] | undefined;
  if (payload.type === 'strength') {
    const ids = [...new Set(payload.exercises!.map((e) => e.exerciseId))];
    const { data: catalog } = await admin.from('exercises').select('id, muscle_group').in('id', ids).eq('is_active', true);
    const muscle = new Map((catalog ?? []).map((e) => [e.id as string, e.muscle_group as string]));
    const unknown = ids.find((id) => !muscle.has(id));
    if (unknown) return json({ error: `Exercício desconhecido: ${unknown}` }, 422);
    exercises = payload.exercises!.map((e) => ({ exerciseId: e.exerciseId, muscleGroup: muscle.get(e.exerciseId)!, sets: e.sets }));
  }

  const performedAt = payload.performedAt ? new Date(payload.performedAt) : now;
  const activity = {
    type: payload.type,
    exercises,
    durationMin: payload.durationMin,
    distanceKm: payload.distanceKm,
    variant: payload.variant,
    elevationM: payload.elevationM,
  };
  const metrics = extractMetrics(activity, DEFAULT_PARAMS);

  const body: BodyProfile | null =
    priv?.sex && priv.height_cm && priv.weight_kg && priv.birth_date
      ? {
          sex: priv.sex,
          heightCm: Number(priv.height_cm),
          weightKg: Number(priv.weight_kg),
          ageYears: (performedAt.getTime() - Date.parse(priv.birth_date)) / (365.25 * 86_400_000),
        }
      : null;

  // Contexto estatístico de cada métrica: população comparável, referência inicial e histórico.
  const context: Record<string, MetricContext> = {};
  const since = new Date(now.getTime() - POPULATION_WINDOW_DAYS * 86_400_000).toISOString();
  const historySince = new Date(now.getTime() - DEFAULT_PARAMS.historyWindowDays * 86_400_000).toISOString();
  await Promise.all(
    [...new Set(metrics.map((m) => m.key))].map(async (key) => {
      const [population, reference, history] = await Promise.all([
        body
          ? admin.rpc('scoring_population', { p_metric_key: key, p_sex: body.sex, p_exclude_user: userId, p_since: since })
          : Promise.resolve({ data: [] as any[] }),
        body
          ? admin.from('reference_quantiles').select('probs, values, source').eq('metric_key', key).eq('sex', body.sex).maybeSingle()
          : Promise.resolve({ data: null }),
        admin
          .from('performance_samples')
          .select('metric, performed_at')
          .eq('user_id', userId)
          .eq('metric_key', key)
          .eq('is_valid', true)
          .gte('performed_at', historySince),
      ]);
      context[key] = {
        samples: body
          ? (population.data ?? []).map((s: any) => ({
              metric: Number(s.metric),
              body: { sex: body.sex, heightCm: Number(s.height_cm), weightKg: Number(s.weight_kg), ageYears: Number(s.age_years) },
            }))
          : [],
        reference: reference.data ? { probs: reference.data.probs, values: reference.data.values, source: reference.data.source } : null,
        history: (history.data ?? []).map((h: any) => ({ metric: Number(h.metric), performedAt: new Date(h.performed_at) })),
      };
    }),
  );

  const breakdown = scoreCheckin({
    activity,
    // Sem dados corporais o motor ainda funciona: a comparação cai no fallback neutro.
    body: body ?? { sex: 'female', heightCm: 0, weightKg: 0, ageYears: 0 },
    now: performedAt,
    firstActivityAt: profile.first_activity_at ? new Date(profile.first_activity_at) : null,
    context,
    params: DEFAULT_PARAMS,
  });

  const sets = (exercises ?? []).flatMap((e) =>
    e.sets.map((s, i) => ({ exercise_id: e.exerciseId, position: i + 1, load_kg: s.loadKg, reps: s.reps })),
  );

  const { data: result, error } = await admin.rpc('record_checkin', {
    p: {
      user_id: userId,
      type: payload.type,
      title: payload.title,
      notes: payload.notes,
      performed_at: performedAt.toISOString(),
      duration_min: payload.durationMin,
      distance_km: payload.distanceKm,
      variant: payload.variant,
      elevation_m: payload.elevationM,
      photo_path: payload.photoPath,
      emoji: payload.emoji,
      lat: payload.location?.lat,
      lng: payload.location?.lng,
      location_accuracy_m: payload.location?.accuracyM,
      score: breakdown.S,
      bonus: breakdown.bonus,
      points: breakdown.points,
      xp: breakdown.xp,
      coins: breakdown.coins,
      breakdown,
      sets,
      group_ids: payload.groupIds ?? [],
      samples: metrics.map((m) => ({ metric_key: m.key, metric: m.metric })),
    },
  });
  if (error) {
    console.error('record_checkin', error);
    return json({ error: 'Não foi possível registrar o check-in' }, 500);
  }

  return json({ ...result, breakdown });
});
