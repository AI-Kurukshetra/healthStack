create or replace function public.ensure_default_org_membership_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_org_id uuid;
  target_role text;
begin
  select public.default_organization_id() into target_org_id;

  if target_org_id is null then
    return new;
  end if;

  target_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'patient');

  if target_role not in ('owner', 'admin', 'provider', 'patient', 'staff') then
    target_role := 'patient';
  end if;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (target_org_id, new.id, target_role)
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_auth_users_default_org_membership'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger trg_auth_users_default_org_membership
    after insert on auth.users
    for each row
    execute function public.ensure_default_org_membership_for_new_user();
  end if;
end
$$;

insert into public.organization_memberships (organization_id, user_id, role)
select
  public.default_organization_id(),
  u.id,
  case
    when coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'patient') in ('owner', 'admin', 'provider', 'patient', 'staff')
      then coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'patient')
    else 'patient'
  end
from auth.users u
where public.default_organization_id() is not null
  and not exists (
    select 1
    from public.organization_memberships m
    where m.user_id = u.id
  )
on conflict (organization_id, user_id) do nothing;
