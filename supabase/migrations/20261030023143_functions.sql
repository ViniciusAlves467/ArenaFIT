-- =============================================================================
-- ArenaFit — funções, triggers e regras de negócio do servidor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();

-- Mesma curva de nível do motor TS (rewards.ts): XP para o nível L = 5000 × (L − 1)^1,5
create or replace function public.xp_for_level(p_level int)
returns bigint language sql immutable set search_path = '' as $$
  select case when p_level <= 1 then 0 else round(5000 * power((p_level - 1)::numeric, 1.5))::bigint end
$$;

create or replace function public.level_from_xp(p_xp bigint)
returns int language plpgsql immutable set search_path = '' as $$
declare
  l int;
begin
  if p_xp <= 0 then return 1; end if;
  l := floor(power(p_xp / 5000.0, 1 / 1.5))::int + 1;
  while public.xp_for_level(l + 1) <= p_xp loop l := l + 1; end loop;
  while l > 1 and public.xp_for_level(l) > p_xp loop l := l - 1; end loop;
  return l;
end $$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = auth.uid()
  )
$$;

-- -----------------------------------------------------------------------------
-- Cadastro: cria o perfil quando um usuário se registra (e-mail ou Google)
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(split_part(coalesce(v_name, ''), ' ', 1), 40), ''));
  insert into public.profile_private (id, full_name)
  values (new.id, left(v_name, 120));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Itens equipados precisam pertencer ao usuário (ou ser gratuitos) e ser do tipo certo;
-- grupo favorito precisa ser um grupo do qual ele participa.
create or replace function public.validate_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_slot text;
  v_id text;
begin
  foreach v_slot in array array['frame', 'title', 'emblem', 'banner'] loop
    v_id := case v_slot
      when 'frame' then new.equipped_frame
      when 'title' then new.equipped_title
      when 'emblem' then new.equipped_emblem
      else new.equipped_banner end;
    if v_id is not null and not exists (
      select 1 from public.cosmetics c
      where c.id = v_id and c.kind::text = v_slot
        and (c.price = 0 or exists (
          select 1 from public.user_cosmetics uc where uc.user_id = new.id and uc.cosmetic_id = c.id))
    ) then
      raise exception 'Cosmético % não disponível para este usuário', v_id using errcode = 'P0001';
    end if;
  end loop;

  if new.favorite_group_id is not null and new.favorite_group_id is distinct from old.favorite_group_id
     and not exists (select 1 from public.group_members m where m.group_id = new.favorite_group_id and m.user_id = new.id) then
    raise exception 'Você não participa deste grupo' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger profiles_validate before update on public.profiles
  for each row execute function public.validate_profile_update();

-- -----------------------------------------------------------------------------
-- Grupos
-- -----------------------------------------------------------------------------

create or replace function public.on_group_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end $$;

create trigger groups_add_owner after insert on public.groups
  for each row execute function public.on_group_created();

-- Entrar por id (grupos públicos) ou por código de convite (qualquer grupo).
create or replace function public.join_group(p_group_id uuid default null, p_invite_code text default null)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
  v_count int;
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '42501'; end if;

  if p_invite_code is not null then
    select * into g from public.groups where invite_code = upper(trim(p_invite_code));
  else
    select * into g from public.groups where id = p_group_id and visibility = 'public';
  end if;
  if g.id is null then raise exception 'Grupo não encontrado' using errcode = 'P0002'; end if;
  if g.ends_on is not null and g.ends_on < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Este grupo já foi encerrado' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.group_members where group_id = g.id;
  if v_count >= g.max_members then raise exception 'Grupo lotado' using errcode = 'P0001'; end if;

  insert into public.group_members (group_id, user_id) values (g.id, auth.uid())
  on conflict do nothing;
  return g;
end $$;

-- -----------------------------------------------------------------------------
-- Emoji diário de validação
-- -----------------------------------------------------------------------------

create or replace function public.get_daily_emoji(p_timezone text default 'America/Sao_Paulo')
returns table (day date, emoji text) language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone p_timezone)::date;
  v_pool text[] := array['✌️', '👍', '🤘', '👊', '🤙', '👌', '🖐️', '☝️', '🤞', '💪', '🫶', '🤟'];
begin
  insert into public.daily_codes (day, emoji)
  values (v_day, v_pool[1 + floor(random() * array_length(v_pool, 1))::int])
  on conflict on constraint daily_codes_pkey do nothing;
  return query select d.day, d.emoji from public.daily_codes d where d.day = v_day;
end $$;

-- -----------------------------------------------------------------------------
-- População de comparação (somente servidor): melhor métrica recente de cada outro
-- usuário, para que usuários muito ativos não dominem a distribuição.
-- -----------------------------------------------------------------------------

create or replace function public.scoring_population(
  p_metric_key text, p_sex public.sex, p_exclude_user uuid, p_since timestamptz, p_limit int default 5000)
returns table (metric double precision, height_cm numeric, weight_kg numeric, age_years numeric)
language sql stable security definer set search_path = '' as $$
  select best.metric, best.height_cm, best.weight_kg, best.age_years
  from (
    select distinct on (s.user_id) s.metric, s.height_cm, s.weight_kg, s.age_years
    from public.performance_samples s
    -- "prefiro não informar" compara com todos; feminino/masculino só com o próprio sexo.
    where s.metric_key = p_metric_key and (p_sex = 'unspecified' or s.sex = p_sex) and s.is_valid
      and s.user_id <> p_exclude_user and s.performed_at >= p_since
    order by s.user_id, s.metric desc
  ) best
  limit p_limit
$$;

-- -----------------------------------------------------------------------------
-- Registro atômico de um check-in já pontuado pela Edge Function `submit-checkin`
-- -----------------------------------------------------------------------------

create or replace function public.record_checkin(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (p ->> 'user_id')::uuid;
  v_type public.activity_type := (p ->> 'type')::public.activity_type;
  v_performed timestamptz := coalesce((p ->> 'performed_at')::timestamptz, now());
  v_points int := coalesce((p ->> 'points')::int, 0);
  v_xp int := coalesce((p ->> 'xp')::int, 0);
  v_coins int := coalesce((p ->> 'coins')::int, 0);
  prof public.profiles;
  priv public.profile_private;
  v_day date;
  v_checkin uuid;
  v_gid uuid;
  v_group public.groups;
  v_group_points int;
  v_group_results jsonb := '[]'::jsonb;
  v_streak int;
  v_unlocked jsonb := '[]'::jsonb;
  v_ach record;
  v_progress numeric;
begin
  select * into prof from public.profiles where id = v_user for update;
  if prof.id is null then raise exception 'Perfil inexistente'; end if;
  select * into priv from public.profile_private where id = v_user;

  v_day := (v_performed at time zone prof.timezone)::date;

  insert into public.checkins (
    user_id, type, title, notes, performed_at, day, duration_min, distance_km, variant, elevation_m, photo_path, emoji,
    lat, lng, location_accuracy_m, score, bonus, points, xp, coins, breakdown)
  values (
    v_user, v_type, p ->> 'title', p ->> 'notes', v_performed, v_day,
    (p ->> 'duration_min')::numeric, (p ->> 'distance_km')::numeric, p ->> 'variant', (p ->> 'elevation_m')::numeric,
    p ->> 'photo_path', p ->> 'emoji',
    (p ->> 'lat')::double precision, (p ->> 'lng')::double precision, (p ->> 'location_accuracy_m')::real,
    (p ->> 'score')::numeric, (p ->> 'bonus')::numeric, v_points, v_xp, v_coins,
    coalesce(p -> 'breakdown', '{}'::jsonb))
  returning id into v_checkin;

  insert into public.checkin_sets (checkin_id, exercise_id, position, load_kg, reps)
  select v_checkin, s ->> 'exercise_id', (s ->> 'position')::int, (s ->> 'load_kg')::numeric, (s ->> 'reps')::int
  from jsonb_array_elements(coalesce(p -> 'sets', '[]'::jsonb)) s;

  -- Grupos: pontua apenas o primeiro treino do dia em cada grupo (evita "farm" de check-ins).
  for v_gid in select (jsonb_array_elements_text(coalesce(p -> 'group_ids', '[]'::jsonb)))::uuid loop
    select g.* into v_group from public.groups g
      join public.group_members m on m.group_id = g.id and m.user_id = v_user
      where g.id = v_gid;
    continue when v_group.id is null;
    continue when v_day < v_group.starts_on or (v_group.ends_on is not null and v_day > v_group.ends_on);

    v_group_points := case when exists (
      select 1 from public.checkin_groups cg join public.checkins c on c.id = cg.checkin_id
      where cg.group_id = v_gid and c.user_id = v_user and c.day = v_day
        and cg.status = 'approved' and cg.points > 0
    ) then 0 else v_points end;

    insert into public.checkin_groups (checkin_id, group_id, points) values (v_checkin, v_gid, v_group_points);
    update public.group_members
      set points = points + v_group_points, checkins_count = checkins_count + 1
      where group_id = v_gid and user_id = v_user;
    v_group_results := v_group_results || jsonb_build_object('group_id', v_gid, 'points', v_group_points);
  end loop;

  -- Amostras de desempenho com o "retrato" corporal do momento do treino.
  if priv.sex is not null and priv.height_cm is not null and priv.weight_kg is not null and priv.birth_date is not null then
    insert into public.performance_samples (user_id, checkin_id, metric_key, metric, sex, height_cm, weight_kg, age_years, performed_at)
    select v_user, v_checkin, s ->> 'metric_key', (s ->> 'metric')::double precision,
           priv.sex, priv.height_cm, priv.weight_kg, round(((v_day - priv.birth_date) / 365.25)::numeric, 2), v_performed
    from jsonb_array_elements(coalesce(p -> 'samples', '[]'::jsonb)) s;
  end if;

  -- Streak (dias consecutivos com check-in, inclusive descanso) — mesma regra de rewards.ts.
  v_streak := case
    when prof.last_checkin_day is null then 1
    when prof.last_checkin_day = v_day then greatest(prof.current_streak, 1)
    when prof.last_checkin_day = v_day - 1 then prof.current_streak + 1
    when prof.last_checkin_day > v_day then prof.current_streak
    else 1 end;

  update public.profiles set
    xp = xp + v_xp,
    coins = coins + v_coins,
    current_streak = v_streak,
    best_streak = greatest(best_streak, v_streak),
    last_checkin_day = greatest(coalesce(last_checkin_day, v_day), v_day),
    first_activity_at = case when v_type <> 'rest' then coalesce(first_activity_at, v_performed) else first_activity_at end
  where id = v_user
  returning * into prof;

  -- Conquistas
  for v_ach in select * from public.achievements loop
    v_progress := case v_ach.metric
      when 'checkins' then (select count(*) from public.checkins where user_id = v_user)
      when 'strength_checkins' then (select count(*) from public.checkins where user_id = v_user and type = 'strength')
      when 'run_km' then (select coalesce(sum(distance_km), 0) from public.checkins where user_id = v_user and type = 'run')
      when 'streak' then prof.best_streak
      when 'groups_joined' then (select count(*) from public.group_members where user_id = v_user)
      when 'level' then public.level_from_xp(prof.xp)
    end;

    insert into public.user_achievements (user_id, achievement_id, progress)
    values (v_user, v_ach.id, least(v_progress, v_ach.target))
    on conflict (user_id, achievement_id) do update set progress = excluded.progress
      where public.user_achievements.completed_at is null;

    if v_progress >= v_ach.target then
      update public.user_achievements set completed_at = now()
        where user_id = v_user and achievement_id = v_ach.id and completed_at is null;
      if found then
        update public.profiles set xp = xp + v_ach.xp_reward, coins = coins + v_ach.coin_reward
          where id = v_user returning * into prof;
        v_unlocked := v_unlocked || jsonb_build_object(
          'id', v_ach.id, 'name', v_ach.name, 'icon', v_ach.icon, 'xp', v_ach.xp_reward, 'coins', v_ach.coin_reward);
      end if;
    end if;
  end loop;

  update public.profiles set level = public.level_from_xp(xp) where id = v_user returning * into prof;

  return jsonb_build_object(
    'checkin_id', v_checkin,
    'day', v_day,
    'points', v_points,
    'xp', v_xp,
    'coins', v_coins,
    'groups', v_group_results,
    'unlocked', v_unlocked,
    'profile', jsonb_build_object(
      'xp', prof.xp, 'level', prof.level, 'coins', prof.coins,
      'current_streak', prof.current_streak, 'best_streak', prof.best_streak));
end $$;

-- -----------------------------------------------------------------------------
-- Validação social: membros aprovam/reprovam o check-in (estudo, 2.1.2.3).
-- O check-in vale de imediato e é invalidado quando as reprovações superam as
-- aprovações e atingem o mínimo: metade dos demais membros, limitado a 3 votos.
-- -----------------------------------------------------------------------------

create or replace function public.on_vote_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_checkin uuid := coalesce(new.checkin_id, old.checkin_id);
  v_group uuid := coalesce(new.group_id, old.group_id);
  cg public.checkin_groups;
  v_owner uuid;
  v_approvals int;
  v_rejections int;
  v_needed int;
  v_status public.checkin_status;
begin
  select * into cg from public.checkin_groups where checkin_id = v_checkin and group_id = v_group for update;
  if cg.checkin_id is null then return null; end if;
  select user_id into v_owner from public.checkins where id = v_checkin;

  select count(*) filter (where vote = 'approve'), count(*) filter (where vote = 'reject')
    into v_approvals, v_rejections
    from public.checkin_votes where checkin_id = v_checkin and group_id = v_group;

  select least(3, greatest(1, ceil((count(*) - 1) / 2.0)::int)) into v_needed
    from public.group_members where group_id = v_group;

  v_status := case when v_rejections >= v_needed and v_rejections > v_approvals then 'rejected' else 'approved' end;

  update public.checkin_groups set approvals = v_approvals, rejections = v_rejections, status = v_status
    where checkin_id = v_checkin and group_id = v_group;

  if v_status <> cg.status then
    update public.group_members set
      points = points + case when v_status = 'rejected' then -cg.points else cg.points end,
      checkins_count = checkins_count + case when v_status = 'rejected' then -1 else 1 end
    where group_id = v_group and user_id = v_owner;

    -- Registros contestados não alimentam percentis futuros (estudo, seção 15).
    update public.performance_samples set is_valid = not exists (
      select 1 from public.checkin_groups x where x.checkin_id = v_checkin and x.status = 'rejected')
    where checkin_id = v_checkin;
  end if;
  return null;
end $$;

create trigger checkin_votes_recount after insert or update or delete on public.checkin_votes
  for each row execute function public.on_vote_change();

-- -----------------------------------------------------------------------------
-- Loja
-- -----------------------------------------------------------------------------

create or replace function public.purchase_cosmetic(p_cosmetic_id text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  c public.cosmetics;
  prof public.profiles;
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '42501'; end if;
  select * into c from public.cosmetics where id = p_cosmetic_id and is_active;
  if c.id is null then raise exception 'Item não encontrado' using errcode = 'P0002'; end if;
  select * into prof from public.profiles where id = auth.uid() for update;

  if exists (select 1 from public.user_cosmetics where user_id = prof.id and cosmetic_id = c.id) then
    raise exception 'Você já possui este item' using errcode = 'P0001';
  end if;
  if prof.level < c.min_level then
    raise exception 'Requer nível %', c.min_level using errcode = 'P0001';
  end if;
  if prof.coins < c.price then
    raise exception 'Moedas insuficientes' using errcode = 'P0001';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id) values (prof.id, c.id);
  update public.profiles set coins = coins - c.price where id = prof.id returning * into prof;
  return prof;
end $$;

-- -----------------------------------------------------------------------------
-- LGPD: portabilidade (art. 18, V). A exclusão é feita pela Edge Function `delete-account`.
-- -----------------------------------------------------------------------------

create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'private', (select to_jsonb(x) from public.profile_private x where x.id = auth.uid()),
    'groups', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.group_members m where m.user_id = auth.uid()),
    'checkins', (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'sets', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.checkin_sets s where s.checkin_id = c.id))
        order by c.performed_at), '[]')
      from public.checkins c where c.user_id = auth.uid()),
    'votes', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.checkin_votes v where v.voter_id = auth.uid()),
    'workout_templates', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.workout_templates t where t.user_id = auth.uid()),
    'cosmetics', (select coalesce(jsonb_agg(to_jsonb(u)), '[]') from public.user_cosmetics u where u.user_id = auth.uid()),
    'achievements', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.user_achievements a where a.user_id = auth.uid())
  )
$$;

-- -----------------------------------------------------------------------------
-- Treinos fixos: limite por usuário e updated_at
-- -----------------------------------------------------------------------------

create or replace function public.limit_workout_templates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.workout_templates where user_id = new.user_id) >= 20 then
    raise exception 'Limite de 20 treinos fixos' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger workout_templates_limit before insert on public.workout_templates
  for each row execute function public.limit_workout_templates();
create trigger workout_templates_touch before update on public.workout_templates
  for each row execute function public.touch_updated_at();
