-- =============================================================================
-- ArenaFit — helpers de RLS fora do schema exposto pela API
-- As políticas referenciam as funções por OID, então continuam funcionando após
-- a troca de schema; só deixam de ser chamáveis via /rest/v1/rpc.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_group_member(uuid) set schema private;
alter function public.can_view_checkin(uuid) set schema private;
alter function public.owns_checkin(uuid) set schema private;
alter function public.can_view_checkin_photo(text) set schema private;

-- Corpos SQL são resolvidos em tempo de execução: atualiza a referência interna.
create or replace function private.can_view_checkin_photo(p_object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checkins c
    join public.checkin_groups cg on cg.checkin_id = c.id
    where c.photo_path = p_object_name and private.is_group_member(cg.group_id)
  )
$$;

-- Índices de FKs usadas em caminhos quentes (trigger de votos, exclusão de conta).
create index if not exists performance_samples_checkin_idx on public.performance_samples (checkin_id);
create index if not exists checkin_votes_voter_idx on public.checkin_votes (voter_id);
create index if not exists groups_owner_idx on public.groups (owner_id);
