-- =============================================================================
-- ArenaFit — privilégios e Row Level Security
-- Princípio: o cliente lê o que precisa e escreve apenas campos "seguros".
-- Tudo que vale pontos passa pela Edge Function (service_role) ou por RPCs
-- SECURITY DEFINER que validam as regras.
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter table public.exercises enable row level security;
alter table public.cosmetics enable row level security;
alter table public.achievements enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.daily_codes enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_sets enable row level security;
alter table public.checkin_groups enable row level security;
alter table public.checkin_votes enable row level security;
alter table public.performance_samples enable row level security;
alter table public.reference_quantiles enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.user_achievements enable row level security;

-- Catálogos ---------------------------------------------------------------------
grant select on public.exercises, public.cosmetics, public.achievements to authenticated;
create policy "catálogo de exercícios" on public.exercises for select to authenticated using (is_active);
create policy "catálogo de cosméticos" on public.cosmetics for select to authenticated using (is_active);
create policy "catálogo de conquistas" on public.achievements for select to authenticated using (true);

-- Perfis -----------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar, equipped_frame, equipped_title, equipped_emblem, equipped_banner,
              weekly_goal, favorite_group_id, timezone, onboarded_at)
  on public.profiles to authenticated;
create policy "perfis públicos são visíveis" on public.profiles for select to authenticated using (true);
create policy "edita o próprio perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Dados corporais: somente o dono.
grant select, update (full_name, birth_date, sex, height_cm, weight_kg, terms_accepted_at, privacy_version)
  on public.profile_private to authenticated;
create policy "dados privados: leitura do dono" on public.profile_private for select to authenticated
  using (id = (select auth.uid()));
create policy "dados privados: edição do dono" on public.profile_private for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Grupos -------------------------------------------------------------------------
grant select, delete on public.groups to authenticated;
grant insert (name, description, owner_id, visibility, starts_on, ends_on, accent, max_members, require_photo, require_location)
  on public.groups to authenticated;
grant update (name, description, visibility, ends_on, accent, max_members, require_photo, require_location)
  on public.groups to authenticated;
create policy "grupos públicos ou meus" on public.groups for select to authenticated
  using (visibility = 'public' or owner_id = (select auth.uid()) or public.is_group_member(id));
create policy "cria grupo como dono" on public.groups for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "dono edita o grupo" on public.groups for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono exclui o grupo" on public.groups for delete to authenticated
  using (owner_id = (select auth.uid()));

grant select, delete on public.group_members to authenticated;
create policy "membros visíveis no grupo" on public.group_members for select to authenticated
  using (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups g where g.id = group_id and g.visibility = 'public')
  );
create policy "sair do grupo ou remover membro" on public.group_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid()) and user_id <> g.owner_id)
  );

grant select on public.daily_codes to authenticated;
create policy "emoji do dia" on public.daily_codes for select to authenticated using (day <= current_date + 1);

-- Check-ins ----------------------------------------------------------------------
-- Coordenadas GPS não são expostas a ninguém pela API (minimização, LGPD art. 6º, III):
-- o grupo vê apenas `has_location`/precisão. O dono as recebe em export_my_data().
grant select (id, user_id, type, title, notes, performed_at, day, duration_min, distance_km, photo_path, emoji,
              location_accuracy_m, has_location, score, bonus, points, xp, coins, breakdown, created_at)
  on public.checkins to authenticated;
-- Helpers SECURITY DEFINER evitam recursão entre as políticas de checkins ↔ checkin_groups.
create or replace function public.can_view_checkin(p_checkin_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.checkins c where c.id = p_checkin_id and c.user_id = auth.uid())
      or exists (
        select 1 from public.checkin_groups cg
        join public.group_members m on m.group_id = cg.group_id and m.user_id = auth.uid()
        where cg.checkin_id = p_checkin_id)
$$;

create or replace function public.owns_checkin(p_checkin_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.checkins c where c.id = p_checkin_id and c.user_id = auth.uid())
$$;

create policy "check-ins próprios ou dos meus grupos" on public.checkins for select to authenticated
  using (user_id = (select auth.uid()) or public.can_view_checkin(id));

grant select on public.checkin_sets to authenticated;
create policy "séries visíveis com o check-in" on public.checkin_sets for select to authenticated
  using (public.can_view_checkin(checkin_id));

grant select on public.checkin_groups to authenticated;
create policy "feed do grupo" on public.checkin_groups for select to authenticated
  using (public.is_group_member(group_id) or public.owns_checkin(checkin_id));

grant select, insert, update, delete on public.checkin_votes to authenticated;
create policy "votos visíveis no grupo" on public.checkin_votes for select to authenticated
  using (public.is_group_member(group_id));
create policy "votar em check-in de outro membro (48h)" on public.checkin_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and public.is_group_member(group_id)
    and exists (
      select 1 from public.checkins c
      where c.id = checkin_id and c.user_id <> (select auth.uid()) and c.created_at > now() - interval '48 hours')
  );
create policy "alterar o próprio voto (48h)" on public.checkin_votes for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (select 1 from public.checkins c where c.id = checkin_id and c.created_at > now() - interval '48 hours')
  );
create policy "remover o próprio voto" on public.checkin_votes for delete to authenticated
  using (voter_id = (select auth.uid()));

-- performance_samples e reference_quantiles: sem políticas → apenas service_role.

-- Gamificação --------------------------------------------------------------------
grant select on public.user_cosmetics, public.user_achievements to authenticated;
create policy "meus cosméticos" on public.user_cosmetics for select to authenticated
  using (user_id = (select auth.uid()));
create policy "conquistas são públicas" on public.user_achievements for select to authenticated using (true);

-- Funções expostas ao cliente ----------------------------------------------------
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.can_view_checkin(uuid) to authenticated;
grant execute on function public.owns_checkin(uuid) to authenticated;
grant execute on function public.join_group(uuid, text) to authenticated;
grant execute on function public.get_daily_emoji(text) to authenticated;
grant execute on function public.purchase_cosmetic(text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.level_from_xp(bigint) to authenticated;
grant execute on function public.xp_for_level(int) to authenticated;

-- Somente servidor
grant execute on function public.record_checkin(jsonb) to service_role;
grant execute on function public.scoring_population(text, public.sex, uuid, timestamptz, int) to service_role;

-- -----------------------------------------------------------------------------
-- Storage: fotos dos check-ins em bucket privado, pasta = id do usuário
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin-photos', 'checkin-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.can_view_checkin_photo(p_object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checkins c
    join public.checkin_groups cg on cg.checkin_id = c.id
    where c.photo_path = p_object_name and public.is_group_member(cg.group_id)
  )
$$;
grant execute on function public.can_view_checkin_photo(text) to authenticated;

create policy "envia fotos na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vê as próprias fotos e as dos grupos" on storage.objects for select to authenticated
  using (
    bucket_id = 'checkin-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_view_checkin_photo(name))
  );
create policy "apaga as próprias fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
