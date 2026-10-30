-- =============================================================================
-- ArenaFit — schema base
-- Dados corporais (LGPD) ficam isolados em profile_private, visíveis só ao dono.
-- Pontos, XP, moedas e status são escritos apenas pelo servidor (service_role /
-- funções SECURITY DEFINER), nunca diretamente pelo cliente.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create type public.sex as enum ('male', 'female');
create type public.activity_type as enum ('strength', 'run', 'walk', 'cycle', 'swim', 'rest');
create type public.checkin_status as enum ('approved', 'rejected');
create type public.vote_kind as enum ('approve', 'reject');
create type public.group_role as enum ('owner', 'admin', 'member');
create type public.group_visibility as enum ('public', 'private');
create type public.cosmetic_kind as enum ('frame', 'title', 'emblem', 'banner', 'accent');

-- -----------------------------------------------------------------------------
-- Catálogos
-- -----------------------------------------------------------------------------

create table public.exercises (
  id text primary key,
  name text not null,
  -- grupo muscular primário único (estudo, seção 7.5)
  muscle_group text not null check (muscle_group in ('chest', 'back', 'legs', 'glutes', 'shoulders', 'biceps', 'triceps', 'core')),
  equipment text not null default 'barbell',
  is_active boolean not null default true,
  sort int not null default 0
);

create table public.cosmetics (
  id text primary key,
  kind public.cosmetic_kind not null,
  name text not null,
  description text,
  price int not null default 0 check (price >= 0),
  min_level int not null default 1,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort int not null default 0
);

create table public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  metric text not null check (metric in ('checkins', 'streak', 'strength_checkins', 'run_km', 'groups_joined', 'level')),
  target numeric not null check (target > 0),
  xp_reward int not null default 0,
  coin_reward int not null default 0,
  sort int not null default 0
);

-- -----------------------------------------------------------------------------
-- Perfis
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  -- avatar gerado: { "symbol": "AL", "accent": "#FF6A13" }
  avatar jsonb not null default '{}'::jsonb,
  equipped_frame text references public.cosmetics (id),
  equipped_title text references public.cosmetics (id),
  equipped_emblem text references public.cosmetics (id),
  equipped_banner text references public.cosmetics (id),
  xp bigint not null default 0,
  level int not null default 1,
  coins int not null default 0 check (coins >= 0),
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_checkin_day date,
  first_activity_at timestamptz,
  weekly_goal int not null default 3 check (weekly_goal between 1 and 7),
  favorite_group_id uuid,
  timezone text not null default 'America/Sao_Paulo',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  birth_date date check (birth_date > '1900-01-01' and birth_date < current_date),
  sex public.sex,
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  weight_kg numeric(5, 1) check (weight_kg between 25 and 350),
  terms_accepted_at timestamptz,
  privacy_version text,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Grupos
-- -----------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  description text check (char_length(description) <= 280),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  visibility public.group_visibility not null default 'private',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  -- Datas de grupo no fuso do app; current_date (UTC) quebraria grupos criados à noite.
  starts_on date not null default (now() at time zone 'America/Sao_Paulo')::date,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  accent text not null default '#FF6A13' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  max_members int not null default 50 check (max_members between 2 and 500),
  require_photo boolean not null default true,
  require_location boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_favorite_group_fk foreign key (favorite_group_id) references public.groups (id) on delete set null;

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  points int not null default 0,
  checkins_count int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);
create index group_members_ranking_idx on public.group_members (group_id, points desc);

-- Emoji de validação do dia (estudo: "gerado diariamente pelo aplicativo").
create table public.daily_codes (
  day date primary key,
  emoji text not null
);

-- -----------------------------------------------------------------------------
-- Check-ins
-- -----------------------------------------------------------------------------

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.activity_type not null,
  title text check (char_length(title) <= 60),
  notes text check (char_length(notes) <= 500),
  performed_at timestamptz not null default now(),
  day date not null,
  duration_min numeric(6, 1) check (duration_min is null or duration_min between 1 and 1440),
  distance_km numeric(6, 2) check (distance_km is null or distance_km between 0.01 and 500),
  photo_path text,
  emoji text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  location_accuracy_m real,
  has_location boolean generated always as (lat is not null and lng is not null) stored,
  score numeric(6, 5),
  bonus numeric(6, 5),
  points int not null default 0,
  xp int not null default 0,
  coins int not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index checkins_user_idx on public.checkins (user_id, performed_at desc);

create table public.checkin_sets (
  id bigint generated always as identity primary key,
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  position int not null,
  load_kg numeric(6, 2) not null check (load_kg >= 0),
  reps int not null check (reps between 1 and 100)
);
create index checkin_sets_checkin_idx on public.checkin_sets (checkin_id);

-- Um check-in pode ser publicado em vários grupos; cada grupo valida e pontua o seu.
create table public.checkin_groups (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  status public.checkin_status not null default 'approved',
  points int not null default 0,
  approvals int not null default 0,
  rejections int not null default 0,
  created_at timestamptz not null default now(),
  primary key (checkin_id, group_id)
);
create index checkin_groups_feed_idx on public.checkin_groups (group_id, created_at desc);

create table public.checkin_votes (
  checkin_id uuid not null,
  group_id uuid not null,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  vote public.vote_kind not null,
  created_at timestamptz not null default now(),
  primary key (checkin_id, group_id, voter_id),
  foreign key (checkin_id, group_id) references public.checkin_groups (checkin_id, group_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Dados estatísticos do motor de pontuação (somente servidor)
-- -----------------------------------------------------------------------------

create table public.performance_samples (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  metric_key text not null,
  metric double precision not null check (metric > 0),
  sex public.sex not null,
  height_cm numeric(5, 1) not null,
  weight_kg numeric(5, 1) not null,
  age_years numeric(5, 2) not null,
  performed_at timestamptz not null,
  is_valid boolean not null default true
);
create index performance_samples_lookup_idx on public.performance_samples (metric_key, sex, performed_at desc) where is_valid;
create index performance_samples_user_idx on public.performance_samples (user_id, metric_key, performed_at desc);

-- Base inicial validada (seção 5.2). Começa vazia: sem fonte justificada, o motor usa o neutro.
create table public.reference_quantiles (
  metric_key text not null,
  sex public.sex not null,
  probs double precision[] not null,
  "values" double precision[] not null,
  source text not null,
  updated_at timestamptz not null default now(),
  primary key (metric_key, sex),
  check (array_length(probs, 1) = array_length("values", 1) and array_length(probs, 1) >= 2)
);

-- -----------------------------------------------------------------------------
-- Gamificação
-- -----------------------------------------------------------------------------

create table public.user_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  progress numeric not null default 0,
  completed_at timestamptz,
  primary key (user_id, achievement_id)
);
