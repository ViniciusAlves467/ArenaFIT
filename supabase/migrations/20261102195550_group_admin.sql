-- =============================================================================
-- ArenaFit — gestão do grupo pelo dono: novo código de convite
-- (editar, remover membro e excluir já são cobertos pelas políticas de RLS)
-- =============================================================================

create or replace function public.regenerate_invite_code(p_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception 'Só o dono pode gerar um novo código' using errcode = '42501';
  end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;
  update public.groups set invite_code = v_code where id = p_group_id;
  return v_code;
end $$;

revoke all on function public.regenerate_invite_code(uuid) from public, anon;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
