import type { CheckinPayload } from '@shared/checkin-input.ts';
import type { ActivityType, ActivityVariant, ScoreBreakdown, Sex } from '@shared/scoring/index.ts';

export type { ActivityType, ActivityVariant, CheckinPayload, ScoreBreakdown, Sex };

export interface AvatarConfig {
  /** Até 2 letras (iniciais) exibidas no avatar. */
  symbol?: string;
  accent?: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar: AvatarConfig;
  equipped_frame: string | null;
  equipped_title: string | null;
  equipped_emblem: string | null;
  equipped_banner: string | null;
  xp: number;
  level: number;
  coins: number;
  current_streak: number;
  best_streak: number;
  last_checkin_day: string | null;
  first_activity_at: string | null;
  weekly_goal: number;
  favorite_group_id: string | null;
  timezone: string;
  onboarded_at: string | null;
}

export type PublicProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar' | 'equipped_frame' | 'equipped_title' | 'equipped_emblem' | 'level'
>;

export interface PrivateProfile {
  full_name: string | null;
  birth_date: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  terms_accepted_at: string | null;
  privacy_version?: string | null;
}

export interface Me {
  email: string | null;
  /** Provedores vinculados à conta (ex.: ['email'], ['google']). */
  providers: string[];
  profile: Profile;
  private: PrivateProfile;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'username'
    | 'display_name'
    | 'avatar'
    | 'equipped_frame'
    | 'equipped_title'
    | 'equipped_emblem'
    | 'equipped_banner'
    | 'weekly_goal'
    | 'favorite_group_id'
    | 'onboarded_at'
  >
>;
export type PrivatePatch = Partial<PrivateProfile>;

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  visibility: 'public' | 'private';
  invite_code: string;
  starts_on: string;
  ends_on: string | null;
  accent: string;
  max_members: number;
  require_photo: boolean;
  require_location: boolean;
  created_at: string;
}

export interface GroupSummary extends Group {
  member_count: number;
  my_points: number;
  my_rank: number;
  my_role: 'owner' | 'admin' | 'member';
}

export interface PublicGroup extends Group {
  member_count: number;
  is_member: boolean;
}

export interface NewGroupInput {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  ends_on: string | null;
  require_photo: boolean;
  require_location: boolean;
}

export interface RankingEntry {
  user_id: string;
  points: number;
  checkins_count: number;
  role: 'owner' | 'admin' | 'member';
  profile: PublicProfile;
}

export interface CheckinSet {
  exercise_id: string;
  position: number;
  load_kg: number;
  reps: number;
}

export interface Checkin {
  id: string;
  user_id: string;
  type: ActivityType;
  title: string | null;
  notes: string | null;
  performed_at: string;
  day: string;
  duration_min: number | null;
  distance_km: number | null;
  variant: ActivityVariant | null;
  elevation_m: number | null;
  photo_path: string | null;
  emoji: string | null;
  has_location: boolean;
  points: number;
  xp: number;
  coins: number;
  bonus: number | null;
  breakdown: Partial<ScoreBreakdown>;
}

export interface FeedItem {
  group_id: string;
  status: 'approved' | 'rejected';
  points: number;
  approvals: number;
  rejections: number;
  created_at: string;
  my_vote: 'approve' | 'reject' | null;
  photo_url: string | null;
  checkin: Checkin & { profile: PublicProfile; sets: CheckinSet[] };
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
}

export type CosmeticKind = 'frame' | 'title' | 'emblem' | 'banner';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind | 'accent';
  name: string;
  description: string | null;
  price: number;
  min_level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  data: Record<string, any>;
}

export interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  xp_reward: number;
  coin_reward: number;
  progress: number;
  completed_at: string | null;
}

export interface CheckinResult {
  checkin_id: string;
  points: number;
  xp: number;
  coins: number;
  groups: { group_id: string; points: number }[];
  unlocked: { id: string; name: string; icon: string; xp: number; coins: number }[];
  profile: Pick<Profile, 'xp' | 'level' | 'coins' | 'current_streak' | 'best_streak'>;
  breakdown: ScoreBreakdown;
}

/** Treino fixo: modelo reutilizável no check-in. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  type: ActivityType;
  variant: ActivityVariant | null;
  exercises: { exerciseId: string; sets: { loadKg: number; reps: number }[] }[];
  duration_min: number | null;
  distance_km: number | null;
  /** 0 = domingo … 6 = sábado */
  weekdays: number[];
  group_ids: string[];
  position: number;
}

export type WorkoutTemplateInput = Omit<WorkoutTemplate, 'id' | 'position'> & { id?: string };

/** Erro de autenticação com código estável, para a UI decidir o próximo passo. */
export type AuthErrorCode = 'rate_limited' | 'expired' | 'cancelled' | 'unknown';

export class AuthFlowError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode = 'unknown',
  ) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

export type GroupPatch = Partial<
  Pick<Group, 'name' | 'description' | 'visibility' | 'ends_on' | 'accent' | 'require_photo' | 'require_location'>
>;

export interface Session {
  userId: string;
  email: string | null;
}

export interface Api {
  readonly mode: 'supabase' | 'demo';
  auth: {
    getSession(): Promise<Session | null>;
    onChange(cb: (s: Session | null) => void): () => void;
    /** Único método de entrada: Google (OAuth do Supabase com PKCE). Cria a conta no primeiro acesso. */
    signInWithGoogle(): Promise<void>;
    /** Troca o `code` PKCE do deep link de retorno do Google por uma sessão (usado na web). */
    exchangeCode(code: string): Promise<void>;
    signOut(): Promise<void>;
  };
  getMe(): Promise<Me>;
  updateProfile(patch: ProfilePatch): Promise<void>;
  updatePrivate(patch: PrivatePatch): Promise<void>;

  listMyGroups(): Promise<GroupSummary[]>;
  listPublicGroups(search?: string): Promise<PublicGroup[]>;
  getGroup(id: string): Promise<Group>;
  getRanking(groupId: string): Promise<RankingEntry[]>;
  getFeed(groupId: string): Promise<FeedItem[]>;
  createGroup(input: NewGroupInput): Promise<Group>;
  joinGroup(by: { id?: string; code?: string }): Promise<Group>;
  leaveGroup(groupId: string): Promise<void>;
  updateGroup(groupId: string, patch: GroupPatch): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
  regenerateInviteCode(groupId: string): Promise<string>;
  deleteGroup(groupId: string): Promise<void>;
  vote(checkinId: string, groupId: string, vote: 'approve' | 'reject' | null): Promise<void>;

  getDailyEmoji(): Promise<string>;
  listExercises(): Promise<Exercise[]>;
  uploadCheckinPhoto(localUri: string): Promise<string>;
  submitCheckin(payload: CheckinPayload): Promise<CheckinResult>;
  listMyCheckins(limit?: number): Promise<Checkin[]>;

  listTemplates(): Promise<WorkoutTemplate[]>;
  saveTemplate(input: WorkoutTemplateInput): Promise<WorkoutTemplate>;
  deleteTemplate(id: string): Promise<void>;

  listCosmetics(): Promise<Cosmetic[]>;
  listOwnedCosmetics(): Promise<string[]>;
  purchaseCosmetic(id: string): Promise<void>;
  listAchievements(): Promise<AchievementProgress[]>;

  exportMyData(): Promise<unknown>;
  deleteAccount(): Promise<void>;
}
