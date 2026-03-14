alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated
on public.organizations
for insert
to authenticated
with check (true);

drop policy if exists organization_memberships_insert_self_or_org_admin on public.organization_memberships;
create policy organization_memberships_insert_self_or_org_admin
on public.organization_memberships
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = organization_memberships.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);
