import { type AuthError, FunctionsHttpError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { requireSupabase } from '@/lib/supabase';

import {
  type AchievementProgress,
  type Api,
  AuthFlowError,
  type Checkin,
  type CheckinResult,
  type Cosmetic,
  type Exercise,
  type FeedItem,
  type Group,
  type GroupSummary,
  type Me,
  type PublicGroup,
  type RankingEntry,
  type WorkoutTemplate,
} from './types';

const PHOTO_BUCKET = 'checkin-photos';
const PUBLIC_PROFILE = 'id, username, display_name, avatar, equipped_frame, equipped_title, equipped_emblem, level';
// Nunca usar `*` em checkins: lat/lng não são legíveis pela API (ver migration de segurança).
const CHECKIN_COLUMNS =
  'id, user_id, type, title, notes, performed_at, day, duration_min, distance_km, variant, elevation_m, photo_path, emoji, has_location, points, xp, coins, bonus, breakdown';
const TEMPLATE_COLUMNS = 'id, name, type, variant, exercises, duration_min, distance_km, weekdays, group_ids, position';

const sb = () => requireSupabase();

async function uid(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Sessão expirada. Entre novamente.');
  return id;
}

/** Lança o erro do Supabase (traduzido) ou devolve `data` sem o `null`. */
function check<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(translateError(res.error.message));
  return res.data as NonNullable<R['data']>;
}

function translateError(message: string): string {
  if (message.includes('profiles_username_key')) return 'Este nome de usuário já está em uso';
  return message;
}

/** Converte erros do Supabase Auth (pelos códigos estáveis do GoTrue) em mensagens e códigos do app. */
function authError(error: AuthError): AuthFlowError {
  switch (error.code) {
    case 'over_request_rate_limit':
      return new AuthFlowError('Muitas tentativas. Aguarde um minuto e tente de novo.', 'rate_limited');
    case 'flow_state_not_found':
    case 'flow_state_expired':
    case 'bad_code_verifier':
      return new AuthFlowError('O login expirou ou foi aberto em outro aparelho. Tente entrar de novo.', 'expired');
    case 'provider_disabled':
    case 'signup_disabled':
      return new AuthFlowError('Login com Google ainda não foi ativado no servidor', 'unknown');
    default:
      if (/rate limit/i.test(error.message)) return new AuthFlowError('Muitas tentativas. Aguarde um minuto.', 'rate_limited');
      return new AuthFlowError(error.message, 'unknown');
  }
}

function checkAuth<R extends { data: unknown; error: AuthError | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw authError(res.error);
  return res.data as NonNullable<R['data']>;
}

async function functionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return new Error(body?.error ?? 'Erro no servidor');
    } catch {
      return new Error('Erro no servidor');
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

const redirectTo = () => Linking.createURL('auth-callback');

export const supabaseApi: Api = {
  mode: 'supabase',

  auth: {
    async getSession() {
      const { data } = await sb().auth.getSession();
      const s = data.session;
      return s ? { userId: s.user.id, email: s.user.email ?? null } : null;
    },
    onChange(cb) {
      const { data } = sb().auth.onAuthStateChange((_event, s) =>
        cb(s ? { userId: s.user.id, email: s.user.email ?? null } : null),
      );
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle() {
      // Web: redirecionamento completo; a rota /auth-callback troca o código pela sessão.
      if (Platform.OS === 'web') {
        checkAuth(await sb().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } }));
        return;
      }
      const data = checkAuth(
        await sb().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectTo(), skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
        }),
      );
      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo());
      if (result.type !== 'success') throw new AuthFlowError('Login com Google cancelado', 'cancelled');
      const { queryParams } = Linking.parse(result.url);
      const fragment = new URLSearchParams(result.url.split('#')[1] ?? '');
      const errorDescription = queryParams?.error_description ?? fragment.get('error_description');
      if (errorDescription) throw new AuthFlowError(String(errorDescription), 'unknown');
      const code = queryParams?.code;
      if (typeof code !== 'string') throw new AuthFlowError('O Google não devolveu um código de acesso', 'unknown');
      await supabaseApi.auth.exchangeCode(code);
    },
    async exchangeCode(code) {
      checkAuth(await sb().auth.exchangeCodeForSession(code));
    },
    async signOut() {
      await sb().auth.signOut();
    },
  },

  async getMe(): Promise<Me> {
    const { data } = await sb().auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error('Sessão expirada');
    const [profile, priv] = await Promise.all([
      sb().from('profiles').select('*').eq('id', id).single(),
      sb().from('profile_private').select('full_name, birth_date, sex, height_cm, weight_kg, terms_accepted_at').eq('id', id).single(),
    ]);
    const providers = (data.user?.identities ?? []).map((i) => i.provider);
    return { email: data.user?.email ?? null, providers, profile: check(profile), private: check(priv) };
  },

  async updateProfile(patch) {
    check(await sb().from('profiles').update(patch).eq('id', await uid()));
  },

  async updatePrivate(patch) {
    check(await sb().from('profile_private').update(patch).eq('id', await uid()));
  },

  async listMyGroups(): Promise<GroupSummary[]> {
    const me = await uid();
    const memberships = check(
      await sb().from('group_members').select('role, points, groups(*)').eq('user_id', me),
    ) as unknown as { role: GroupSummary['my_role']; points: number; groups: Group }[];
    if (memberships.length === 0) return [];

    const ids = memberships.map((m) => m.groups.id);
    const all = check(await sb().from('group_members').select('group_id, user_id, points').in('group_id', ids));
    return memberships.map((m) => {
      const members = all.filter((r) => r.group_id === m.groups.id).sort((a, b) => b.points - a.points);
      return {
        ...m.groups,
        member_count: members.length,
        my_points: m.points,
        my_rank: members.findIndex((r) => r.user_id === me) + 1,
        my_role: m.role,
      };
    });
  },

  async listPublicGroups(search): Promise<PublicGroup[]> {
    const me = await uid();
    let q = sb().from('groups').select('*, group_members(count)').eq('visibility', 'public');
    if (search?.trim()) q = q.ilike('name', `%${search.trim()}%`);
    const groups = check(await q.order('created_at', { ascending: false }).limit(50)) as any[];
    const mine = check(await sb().from('group_members').select('group_id').eq('user_id', me));
    const mineSet = new Set(mine.map((m) => m.group_id));
    return groups.map(({ group_members, ...g }) => ({
      ...g,
      member_count: group_members?.[0]?.count ?? 0,
      is_member: mineSet.has(g.id),
    }));
  },

  async getGroup(id) {
    return check(await sb().from('groups').select('*').eq('id', id).single());
  },

  async getRanking(groupId): Promise<RankingEntry[]> {
    const rows = check(
      await sb()
        .from('group_members')
        .select(`user_id, points, checkins_count, role, profile:profiles(${PUBLIC_PROFILE})`)
        .eq('group_id', groupId)
        .order('points', { ascending: false })
        .order('checkins_count', { ascending: false }),
    );
    return rows as unknown as RankingEntry[];
  },

  async getFeed(groupId): Promise<FeedItem[]> {
    const me = await uid();
    const rows = check(
      await sb()
        .from('checkin_groups')
        .select(
          `group_id, status, points, approvals, rejections, created_at,
           checkin:checkins(${CHECKIN_COLUMNS}, profile:profiles(${PUBLIC_PROFILE}), sets:checkin_sets(exercise_id, position, load_kg, reps))`,
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(40),
    ) as unknown as Omit<FeedItem, 'my_vote' | 'photo_url'>[];

    const ids = rows.map((r) => r.checkin.id);
    const [votes, signed] = await Promise.all([
      ids.length
        ? sb().from('checkin_votes').select('checkin_id, vote').eq('group_id', groupId).eq('voter_id', me).in('checkin_id', ids)
        : Promise.resolve({ data: [], error: null }),
      (async () => {
        const paths = rows.map((r) => r.checkin.photo_path).filter((p): p is string => !!p);
        if (!paths.length) return new Map<string, string>();
        const { data } = await sb().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
        return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
      })(),
    ]);
    const voteMap = new Map((votes.data ?? []).map((v: any) => [v.checkin_id, v.vote]));
    return rows.map((r) => ({
      ...r,
      my_vote: voteMap.get(r.checkin.id) ?? null,
      photo_url: r.checkin.photo_path ? (signed.get(r.checkin.photo_path) ?? null) : null,
    }));
  },

  async createGroup(input) {
    const owner_id = await uid();
    return check(await sb().from('groups').insert({ ...input, owner_id }).select('*').single());
  },

  async joinGroup(by) {
    const data = check(
      await sb().rpc('join_group', { p_group_id: by.id ?? null, p_invite_code: by.code ?? null }),
    );
    return data as Group;
  },

  async leaveGroup(groupId) {
    check(await sb().from('group_members').delete().eq('group_id', groupId).eq('user_id', await uid()));
  },

  async updateGroup(groupId, patch) {
    check(await sb().from('groups').update(patch).eq('id', groupId));
  },

  async removeMember(groupId, userId) {
    check(await sb().from('group_members').delete().eq('group_id', groupId).eq('user_id', userId));
  },

  async regenerateInviteCode(groupId) {
    return check(await sb().rpc('regenerate_invite_code', { p_group_id: groupId })) as string;
  },

  async deleteGroup(groupId) {
    check(await sb().from('groups').delete().eq('id', groupId));
  },

  async vote(checkinId, groupId, vote) {
    const voter_id = await uid();
    if (vote === null) {
      check(await sb().from('checkin_votes').delete().match({ checkin_id: checkinId, group_id: groupId, voter_id }));
    } else {
      check(
        await sb()
          .from('checkin_votes')
          .upsert({ checkin_id: checkinId, group_id: groupId, voter_id, vote }, { onConflict: 'checkin_id,group_id,voter_id' }),
      );
    }
  },

  async getDailyEmoji() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    const data = check(await sb().rpc('get_daily_emoji', { p_timezone: tz })) as { emoji: string }[];
    return data[0]?.emoji ?? '✌️';
  },

  async listExercises(): Promise<Exercise[]> {
    return check(await sb().from('exercises').select('id, name, muscle_group, equipment').order('sort'));
  },

  async uploadCheckinPhoto(localUri) {
    const me = await uid();
    const path = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const body = await (await fetch(localUri)).arrayBuffer();
    check(await sb().storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false }));
    return path;
  },

  async submitCheckin(payload): Promise<CheckinResult> {
    const { data, error } = await sb().functions.invoke('submit-checkin', { body: payload });
    if (error) throw await functionError(error);
    return data as CheckinResult;
  },

  async listMyCheckins(limit = 30): Promise<Checkin[]> {
    return check(
      await sb().from('checkins').select(CHECKIN_COLUMNS).eq('user_id', await uid()).order('performed_at', { ascending: false }).limit(limit),
    ) as unknown as Checkin[];
  },

  async listTemplates(): Promise<WorkoutTemplate[]> {
    return check(
      await sb().from('workout_templates').select(TEMPLATE_COLUMNS).eq('user_id', await uid()).order('position').order('created_at'),
    ) as unknown as WorkoutTemplate[];
  },

  async saveTemplate({ id, ...input }) {
    const row = {
      ...input,
      duration_min: input.duration_min ?? null,
      distance_km: input.distance_km ?? null,
      variant: input.variant ?? null,
    };
    const res = id
      ? await sb().from('workout_templates').update(row).eq('id', id).select(TEMPLATE_COLUMNS).single()
      : await sb().from('workout_templates').insert({ ...row, user_id: await uid() }).select(TEMPLATE_COLUMNS).single();
    return check(res) as unknown as WorkoutTemplate;
  },

  async deleteTemplate(id) {
    check(await sb().from('workout_templates').delete().eq('id', id));
  },

  async listCosmetics(): Promise<Cosmetic[]> {
    return check(await sb().from('cosmetics').select('id, kind, name, description, price, min_level, rarity, data').order('sort'));
  },

  async listOwnedCosmetics() {
    const rows = check(await sb().from('user_cosmetics').select('cosmetic_id').eq('user_id', await uid()));
    return rows.map((r) => r.cosmetic_id as string);
  },

  async purchaseCosmetic(id) {
    check(await sb().rpc('purchase_cosmetic', { p_cosmetic_id: id }));
  },

  async listAchievements(): Promise<AchievementProgress[]> {
    const me = await uid();
    const [defs, mine] = await Promise.all([
      sb().from('achievements').select('id, name, description, icon, target, xp_reward, coin_reward').order('sort'),
      sb().from('user_achievements').select('achievement_id, progress, completed_at').eq('user_id', me),
    ]);
    const progress = new Map((check(mine) ?? []).map((m) => [m.achievement_id, m]));
    return check(defs).map((d) => ({
      ...d,
      target: Number(d.target),
      progress: Number(progress.get(d.id)?.progress ?? 0),
      completed_at: progress.get(d.id)?.completed_at ?? null,
    }));
  },

  async exportMyData() {
    return check(await sb().rpc('export_my_data'));
  },

  async deleteAccount() {
    const { error } = await sb().functions.invoke('delete-account', { body: {} });
    if (error) throw await functionError(error);
    await sb().auth.signOut();
  },
};
